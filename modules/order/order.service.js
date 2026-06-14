const createHttpError = require("http-errors");
const { orderStatus } = require("../../common/constat/oder.const");
const { Order, OrderItems } = require("./order.model");
const {
  Product,
  ProductColor,
  ProductSize,
} = require("../product/product.model");

async function getMyOrdersHandler(req, res, next) {
  try {
    const { id: userId } = req.user;
    const { status } = req.query;
    if (!status || !Object.values(orderStatus).includes(status)) {
      throw createHttpError(400, "");
    }
    const orders = await Order.findAll({ where: { status, userId } });
    return res.json({ orders });
  } catch (error) {
    next(error);
  }
}

async function getOrderByIdHandler(req, res, next) {
  try {
    const { id } = req.params;
    const { userId } = req.query;
    const order = await Order.findOne({
      where: { id, userId },
      include: [
        {
          model: OrderItems,
          as: "items",
          include: [
            { model: Product, as: "products" },
            { model: ProductColor, as: "colors" },
            { model: ProductSize, as: "sizes" },
          ],
        },
      ],
    });
    if (!order) throw createHttpError(404, "not found order");
    return res.json({ order });
  } catch (error) {
    next(error);
  }
}

async function setPackedStatusToOrder(req, res, next) {
  const { id } = req.params;
  const order = await Order.findByPk(id);
  if (!order) throw createHttpError(404, "not found order");
  if (order.status !== orderStatus.inProcess)
    throw createHttpError(400, "order is not packed yet");
  order.status === orderStatus.packed;
  await order.save();
  return res.json({
    message: "set order to packed line",
  });
}

async function setInTransitStatusToOrder(req, res, next) {
  const { id } = req.params;
  const order = await Order.findByPk(id);
  if (!order) throw createHttpError(404, "not found order");
  if (order.status !== orderStatus.packed)
    throw createHttpError(400, "order is not transit");
  order.status === orderStatus.inTransit;
  await order.save();
  return res.json({
    message: "set order to transit line",
  });
}

async function setCanceledStatusToOrder(req, res, next) {
  router.patch("/set-canceled/:id", authGuard, setCanceledStatusToOrder);
  const { id } = req.params;
  const { reason } = req.body;
  const order = await Order.findByPk(id);
  if (!order) throw createHttpError(404, "not found order");
  if (
    [orderStatus.delivery, orderStatus.canceled, orderStatus.pending].includes(
      order.status,
    )
  )
    throw createHttpError(400, "order is not packed yet");
  order.status === orderStatus.canceled;
  order.reason = reason;
  await order.save();
  return res.json({
    message: "set order to cancel ",
  });
}
async function setDeliveryStatusToOrder(req, res, next) {
  const { id } = req.params;
  const order = await Order.findByPk(id);
  if (!order) throw createHttpError(404, "not found order");
  if (order.status !== orderStatus.inTransit)
    throw createHttpError(400, "order is not delivered yet");
  order.status === orderStatus.delivery;
  await order.save();
  return res.json({
    message: "set order to delivery line",
  });
}

module.exports = {
  getMyOrdersHandler,
  getOrderByIdHandler,
  setPackedStatusToOrder,
  setInTransitStatusToOrder,
  setCanceledStatusToOrder,
  setDeliveryStatusToOrder,
};
