const createHttpError = require("http-errors");
const { orderStatus } = require("../../common/constat/oder.const");
const { Order, OrderItems } = require("./order.model");
const { Product, ProductColor, ProductSize } = require("../product/product.model");

function validId(raw) {
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id < 1) throw createHttpError(400, "Invalid order id");
  return id;
}

async function getMyOrdersHandler(req, res, next) {
  try {
    const { status } = req.query;
    if (status && !Object.values(orderStatus).includes(status)) throw createHttpError(400, "Invalid order status");
    const where = { userId: req.user.id };
    if (status) where.status = status;
    const orders = await Order.findAll({ where, order: [["id", "DESC"]] });
    res.json({ orders });
  } catch (error) { next(error); }
}

async function getOrderByIdHandler(req, res, next) {
  try {
    const order = await Order.findOne({
      where: { id: validId(req.params.id), userId: req.user.id },
      include: [{
        model: OrderItems, as: "items",
        include: [
          { model: Product, as: "product" },
          { model: ProductColor, as: "color" },
          { model: ProductSize, as: "size" },
        ],
      }],
    });
    if (!order) throw createHttpError(404, "Order not found");
    res.json({ order });
  } catch (error) { next(error); }
}

function changeStatus(from, to, requireReason = false) {
  return async (req, res, next) => {
    try {
      const id = validId(req.params.id);
      const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
      if (requireReason && !reason) throw createHttpError(400, "Cancellation reason is required");
      const values = { status: to };
      if (requireReason) values.reason = reason;
      // Conditional UPDATE prevents competing requests from applying stale transitions.
      const [changed] = await Order.update(values, { where: { id, status: from } });
      if (!changed) {
        const existing = await Order.findByPk(id);
        if (!existing) throw createHttpError(404, "Order not found");
        throw createHttpError(409, `Cannot transition order from ${existing.status} to ${to}`);
      }
      res.json({ message: "Order status updated", orderId: id, status: to });
    } catch (error) { next(error); }
  };
}

const setPackedStatusToOrder = changeStatus(orderStatus.inProcess, orderStatus.packed);
const setInTransitStatusToOrder = changeStatus(orderStatus.packed, orderStatus.inTransit);
const setCanceledStatusToOrder = async (req, res, next) => {
  try {
    const id = validId(req.params.id);
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
    if (!reason) throw createHttpError(400, "Cancellation reason is required");
    const { Op } = require("sequelize");
    const [changed] = await Order.update({ status: orderStatus.canceled, reason }, {
      where: { id, status: { [Op.in]: [orderStatus.inProcess, orderStatus.packed, orderStatus.inTransit] } },
    });
    if (!changed) {
      const existing = await Order.findByPk(id);
      if (!existing) throw createHttpError(404, "Order not found");
      throw createHttpError(409, "Order cannot be canceled in its current state");
    }
    res.json({ message: "Order canceled", orderId: id });
  } catch (error) { next(error); }
};
const setDeliveryStatusToOrder = changeStatus(orderStatus.inTransit, orderStatus.delivery);

module.exports = {
  getMyOrdersHandler, getOrderByIdHandler, setPackedStatusToOrder,
  setInTransitStatusToOrder, setCanceledStatusToOrder, setDeliveryStatusToOrder,
};
