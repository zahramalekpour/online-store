const createHttpError = require('http-errors');
const { Product, ProductColor, ProductSize } = require('../product/product.model');
const { productTypes } = require('../../common/constat/product.constat');
const { OrderItems } = require('../order/order.model');
const { Payment } = require('./payment.model');
const { Order } = require('../order/order.model');
const { orderStatus } = require('../../common/constat/oder.const');

async function stockFor(item, transaction) {
  const product = await Product.findByPk(item.productId, { transaction });
  if (!product) throw createHttpError(409, 'Product missing');
  const isColor = product.type === productTypes.coloring;
  const isSize = product.type === productTypes.sizing;
  const Model = isColor ? ProductColor : isSize ? ProductSize : Product;
  const id = isColor ? item.colorId : isSize ? item.sizeId : item.productId;
  if (!id) throw createHttpError(409, 'Variant missing');
  const stock = await Model.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
  if (!stock || (Model !== Product && Number(stock.productId) !== Number(item.productId))) {
    throw createHttpError(409, 'Product variant missing');
  }
  return stock;
}

async function reserve(items, transaction) {
  // Caller must lock the owning user row, preventing two checkouts for one user.
  // Deterministic order reduces deadlocks between users buying overlapping products.
  const sorted = [...items].sort((a,b) => a.productId-b.productId || (a.colorId||0)-(b.colorId||0) || (a.sizeId||0)-(b.sizeId||0));
  for (const item of sorted) {
    const stock = await stockFor(item, transaction);
    const count = Number(item.count);
    if (!Number.isSafeInteger(count) || count < 1 || Number(stock.count) < count) {
      throw createHttpError(409, 'Insufficient stock');
    }
    await stock.decrement('count', { by: count, transaction });
  }
}

async function release(payment, transaction, nextStatus, reason) {
  // Payment row MUST already be locked by caller.
  if (Number(payment.status) !== 0) return false;
  const order = await Order.findByPk(payment.orderId, { transaction, lock: transaction.LOCK.UPDATE });
  if (!order) throw createHttpError(409, 'Missing reserved order');
  const items = await OrderItems.findAll({ where: { orderId: order.id }, transaction });
  const sorted = items.sort((a,b) => a.productId-b.productId || (a.colorId||0)-(b.colorId||0) || (a.sizeId||0)-(b.sizeId||0));
  for (const item of sorted) {
    const stock = await stockFor(item, transaction);
    await stock.increment('count', { by: Number(item.count), transaction });
  }
  await payment.update({ status: nextStatus }, { transaction });
  await order.update({ status: orderStatus.canceled, reason: reason.slice(0,255) }, { transaction });
  return true;
}
module.exports = { reserve, release };
