const createHttpError = require('http-errors');
const sequelize = require('../../config/sequelize.config');
const { User } = require('../user/user.model');
const Basket = require('../basket/basket.model');
const { getUserBasketByIdHandler } = require('../basket/basket.service');
const { Order, OrderItems } = require('../order/order.model');
const { orderStatus } = require('../../common/constat/oder.const');
const { Payment } = require('./payment.model');
const { reserve, release } = require('./stock-reservation');
const { config: validateZarinpalConfig, zarinalRequest, zarinalVerify } = require('../zarinpal/zarinpla.service');
const RESERVATION_MINUTES = 20;

async function paymentBasketHandler(req, res, next) {
  try {
    validateZarinpalConfig();
    const userId = req.user.id;
    const key = req.get('Idempotency-Key');
    if (typeof key !== 'string' || !/^[a-zA-Z0-9_-]{16,80}$/.test(key)) throw createHttpError(400, 'Idempotency-Key header (16-80 chars) required');
    const address = req.body?.address;
    if (typeof address !== 'string' || !address.trim() || address.length > 2000) throw createHttpError(400, 'Valid address required');

    const checkout = await sequelize.transaction(async transaction => {
      // Serialize checkouts per user; DB unique index is the second line of defense.
      const user = await User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!user) throw createHttpError(401, 'User missing');
      const existing = await Payment.findOne({ where: { userId, checkoutKey: key }, transaction, lock: transaction.LOCK.UPDATE });
      if (existing) {
        const order = await Order.findByPk(existing.orderId, { transaction });
        if (order?.address !== address.trim()) throw createHttpError(409, 'Key reused with different address');
        return { paymentId: existing.id, orderId: existing.orderId, authority: existing.authority, status: Number(existing.status), existing: true };
      }
      const quote = await getUserBasketByIdHandler(userId, { transaction });
      if (!quote.items.length) throw createHttpError(400, 'Basket empty');
      if (!Number.isSafeInteger(quote.finalAmount) || quote.finalAmount < 1) throw createHttpError(409, 'Amount must be integer gateway units');
      await reserve(quote.items, transaction);
      const payment = await Payment.create({ userId, checkoutKey: key, amount: quote.finalAmount, status: 0,
        reservationExpiresAt: new Date(Date.now() + RESERVATION_MINUTES * 60000) }, { transaction });
      const order = await Order.create({ userId, paymentId: payment.id, status: orderStatus.pending,
        address: address.trim(), total_amount: quote.totalAmount, discount_amount: quote.totalDiscount,
        final_amount: quote.finalAmount, reason: '' }, { transaction });
      await payment.update({ orderId: order.id }, { transaction });
      await OrderItems.bulkCreate(quote.items.map(i => ({ orderId: order.id, productId: i.productId,
        colorId: i.colorId, sizeId: i.sizeId, count: i.count })), { transaction });
      return { paymentId: payment.id, orderId: order.id, amount: quote.finalAmount, existing: false };
    });
    if (checkout.existing) {
      if (checkout.status === 1) return res.json({ message: 'Already paid', orderId: checkout.orderId, paymentId: checkout.paymentId });
      if (checkout.status !== 0) throw createHttpError(409, 'Checkout is closed; use a new key');
      if (checkout.authority) return res.json({ orderId: checkout.orderId, paymentId: checkout.paymentId,
        authority: checkout.authority, paymentUrl: `${process.env.ZARINPAL_GATEWAY_URL.replace(/\/$/,'')}/${checkout.authority}` });
      throw createHttpError(409, 'Checkout request is being initialized; retry shortly');
    }
    // Never hold a DB transaction open while calling a network service.
    let gateway;
    try { gateway = await zarinalRequest(checkout.amount, req.user); }
    catch (err) {
      // A timeout may mean gateway created an authority: do not release automatically.
      // Keep reservation pending for reconciliation; see README.
      throw err;
    }
    await sequelize.transaction(async transaction => {
      const payment = await Payment.findByPk(checkout.paymentId, { transaction, lock: transaction.LOCK.UPDATE });
      if (Number(payment.status) !== 0) throw createHttpError(409, 'Checkout closed before gateway response; reconcile authority');
      await payment.update({ authority: gateway.authority }, { transaction });
    });
    return res.status(201).json({ orderId: checkout.orderId, paymentId: checkout.paymentId, ...gateway });
  } catch (err) { next(err); }
}

async function paymentVerifyHandler(req, res, next) {
  try {
    const authority = req.query.Authority || req.query.authority;
    const status = req.query.Status || req.query.status;
    if (typeof authority !== 'string' || !authority) throw createHttpError(400, 'Authority required');
    const payment = await Payment.findOne({ where: { authority } });
    if (!payment) throw createHttpError(404, 'Payment not found');
    if (Number(payment.status) === 1) return res.json({ message: 'Already paid', paymentId: payment.id, refId: payment.refId });
    if (Number(payment.status) !== 0) throw createHttpError(409, 'Closed payment; reconciliation required');
    // Sandbox sometimes returns NOK despite a paid test transaction. Never trust NOK
    // as success: verify with the gateway only when explicitly enabled in development.
    const allowSandboxNok = process.env.NODE_ENV === 'development' &&
      process.env.ZARINPAL_VERIFY_NOK_SANDBOX === 'true' &&
      new URL(process.env.ZARINPAL_VERIFY_URL).hostname === 'sandbox.zarinpal.com';
    if (status !== 'OK' && !(status === 'NOK' && allowSandboxNok)) {
      return res.status(409).json({ message: 'Not confirmed by gateway; reservation retained for reconciliation' });
    }
    let verified;
    try {
      verified = await zarinalVerify(payment.amount, authority);
    } catch (err) {
      // An unsuccessful or ambiguous verification must never mark the order paid.
      // Retain reservation for controlled reconciliation/expiry processing.
      throw err;
    }
    if (verified.alreadyVerified && !verified.refId) throw createHttpError(409, 'Already verified at gateway; manual reconciliation needed');
    const result = await sequelize.transaction(async transaction => {
      const locked = await Payment.findByPk(payment.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (Number(locked.status) === 1) return { already: true, refId: locked.refId };
      if (Number(locked.status) !== 0) throw createHttpError(409, 'Payment reservation was released; refund/reconcile');
      const order = await Order.findByPk(locked.orderId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!order) throw createHttpError(409, 'Order missing');
      await locked.update({ status: 1, refId: verified.refId || locked.refId }, { transaction });
      await order.update({ status: orderStatus.inProcess }, { transaction });
      const items = await OrderItems.findAll({ where: { orderId: order.id }, transaction });
      for (const item of items) {
        // Delete only matching cart rows, not items added later or changed quantities.
        await Basket.destroy({ where: { userId: order.userId, productId: item.productId,
          colorId: item.colorId, sizeId: item.sizeId, count: item.count }, transaction });
      }
      return { already: false, refId: verified.refId };
    });
    return res.json({ message: result.already ? 'Already paid' : 'Payment verified', paymentId: payment.id, refId: result.refId });
  } catch (err) { next(err); }
}
module.exports = { paymentBasketHandler, paymentVerifyHandler };
