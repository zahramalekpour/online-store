const createHttpError = require("http-errors");
const { orderStatus } = require("../../common/constat/oder.const");
const { getUserBasketByIdHandler } = require("../basket/basket.service");
const { OrderItems, Order } = require("../order/order.model");
const zarinalRequest = require("../zarinpal/zarinpla.service");
const { Payment } = require("./payment.model");
const Basket = require("../basket/basket.model");

async function paymentBasketHandler(req, res, next) {
  try {
    const userId = req.user;
    const { totalAmount, finalAmount, discountAmount, basket } =
      await getUserBasketByIdHandler();
    const payment = await Payment.create({
      userId,
      amount: finalAmount,
      status: false,
    });
    const order = await Order.create({
      userId,
      paymentId: payment.id,
      total_amount: totalAmount,
      final_amount: finalAmount,
      discount_amount: discountAmount,
      status: orderStatus.pending,
      address: "tehran",
    });
    payment.orderId = order.id;
    payment.save();

    const orderList = [];
    for (const item of basket) {
      orderList.push({
        orderId: order.id,
        productId: item?.productId,
        colorId: item?.colorId,
        sizeId: item?.sizeId,
        count: item?.count,
      });
      let items = [];
      if (item?.size?.length > 0) {
        items = item?.sizes.map((size) => {
          return {
            orderId: order.id,
            productId: item?.id,
            sizeId: item?.sizeId,
            colorId: item?.colorId,
            count: item?.count,
          };
        });
      } else if (item?.color?.length > 0) {
        items = item?.colors.map((size) => {
          return {
            orderId: order.id,
            productId: item?.id,
            colorId: item?.colorId,
            count: item?.count,
          };
        });
      } else {
        items = [
          {
            orderId: order.id,
            productId: item?.id,
            count: item?.count,
          },
        ];
        orderList.push(...items);
      }
      await OrderItems.bulkCreate(orderList);
      const result = await zarinalRequest(payment?.amount, req?.user);
      payment.authority = result?.authority;
      await payment.save();
      return res.json(result);
    }
  } catch (error) {
    next(error);
  }
}

async function paymentVerifyHandler(req, res, next) {
  try {
    const { authority, status } = req.query;
    if (status == "OK" && authority) {
      const payment = await Payment.findOne({ where: (authority = Authority) });
      if (!payment) throw createHttpError(404, "not found payment");
      const result = zarinalVerify(payment?.amount, payment?.authority);
      if (result) {
        payment.status = true;
        payment.refId = result?.ref_id ?? "23456";
        const order = await Order.findByPk({ userId: payment?.orderId });
        if (!order) {
          throw createHttpError(404, "order not found");
        }
        order.status = orderStatus.inProcess;
        await order.save();
        await payment.save();
        await Basket.destroy({ where: { userId: order?.id } });
        return res.redirect(
          "https://frontenddomain.com/payment?status=success",
        );
      }
    } else {
      await Order.destroy({ where: { id: payment?.orderId } });
      await Payment.destroy({ where: { id: payment?.id } });
    }
    return res.redirect("https://frontenddomain.com/payment?status=failure");
  } catch (error) {
    res.redirect("https://frontenddomain.com/payment?status=failure");
  }
}

module.exports = { paymentBasketHandler, paymentVerifyHandler };
