jest.mock("../../common/constat/oder.const", () => ({
  orderStatus: {
    pending: "pending",
    inProcess: "inProcess",
    packed: "packed",
    inTransit: "inTransit",
    canceled: "canceled",
    delivery: "delivery",
  },
}));

jest.mock("../../modules/order/order.model", () => ({
  Order: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByPk: jest.fn(),
    update: jest.fn(),
  },
  OrderItems: {},
}));

jest.mock("../../modules/product/product.model", () => ({
  Product: {},
  ProductColor: {},
  ProductSize: {},
}));

const { Op } = require("sequelize");
const { Order, OrderItems } = require("../../modules/order/order.model");

const {
  Product,
  ProductColor,
  ProductSize,
} = require("../../modules/product/product.model");

const {
  getMyOrdersHandler,
  getOrderByIdHandler,
  setPackedStatusToOrder,
  setInTransitStatusToOrder,
  setCanceledStatusToOrder,
  setDeliveryStatusToOrder,
} = require("../../modules/order/order.service");

describe("Order Service Tests", () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.resetAllMocks();

    req = {
      user: { id: 10, role: "user" },
      params: {},
      query: {},
      body: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    next = jest.fn();
  });

  function expectError(status) {
    expect(next).toHaveBeenCalledTimes(1);

    const error = next.mock.calls[0][0];

    expect(error).toBeInstanceOf(Error);
    expect(error.status || error.statusCode).toBe(status);
  }

  test("returns only current user's orders", async () => {
    const orders = [
      { id: 3, userId: 10 },
      { id: 2, userId: 10 },
    ];

    Order.findAll.mockResolvedValue(orders);

    await getMyOrdersHandler(req, res, next);

    expect(Order.findAll).toHaveBeenCalledWith({
      where: { userId: 10 },
      order: [["id", "DESC"]],
    });

    expect(res.json).toHaveBeenCalledWith({ orders });
    expect(next).not.toHaveBeenCalled();
  });

  test("filters orders by valid status", async () => {
    req.query.status = "packed";

    Order.findAll.mockResolvedValue([]);

    await getMyOrdersHandler(req, res, next);

    expect(Order.findAll).toHaveBeenCalledWith({
      where: {
        userId: 10,
        status: "packed",
      },
      order: [["id", "DESC"]],
    });
  });

  test("rejects invalid order status", async () => {
    req.query.status = "invalid";

    await getMyOrdersHandler(req, res, next);

    expectError(400);
    expect(Order.findAll).not.toHaveBeenCalled();
  });

  test("returns order details for its owner", async () => {
    req.params.id = "5";

    const order = {
      id: 5,
      userId: 10,
      items: [],
    };

    Order.findOne.mockResolvedValue(order);

    await getOrderByIdHandler(req, res, next);

    expect(Order.findOne).toHaveBeenCalledWith({
      where: { id: 5, userId: 10 },
      include: [
        {
          model: OrderItems,
          as: "items",
          include: [
            { model: Product, as: "product" },
            { model: ProductColor, as: "color" },
            { model: ProductSize, as: "size" },
          ],
        },
      ],
    });

    expect(res.json).toHaveBeenCalledWith({ order });
    expect(next).not.toHaveBeenCalled();
  });

  test("rejects orders not owned by current user", async () => {
    req.params.id = "99";

    Order.findOne.mockResolvedValue(null);

    await getOrderByIdHandler(req, res, next);

    expectError(404);

    expect(Order.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 99,
          userId: 10,
        },
      }),
    );
  });

  test("rejects invalid order ID", async () => {
    req.params.id = "invalid";

    await getOrderByIdHandler(req, res, next);

    expectError(400);
    expect(Order.findOne).not.toHaveBeenCalled();
  });

  test("changes inProcess order to packed", async () => {
    req.params.id = "5";

    Order.update.mockResolvedValue([1]);

    await setPackedStatusToOrder(req, res, next);

    expect(Order.update).toHaveBeenCalledWith(
      { status: "packed" },
      {
        where: {
          id: 5,
          status: "inProcess",
        },
      },
    );

    expect(res.json).toHaveBeenCalledWith({
      message: "Order status updated",
      orderId: 5,
      status: "packed",
    });

    expect(next).not.toHaveBeenCalled();
  });

  test("rejects invalid transition to packed", async () => {
    req.params.id = "5";

    Order.update.mockResolvedValue([0]);

    Order.findByPk.mockResolvedValue({
      id: 5,
      status: "pending",
    });

    await setPackedStatusToOrder(req, res, next);

    expectError(409);
  });

  test("returns 404 when status target is missing", async () => {
    req.params.id = "999";

    Order.update.mockResolvedValue([0]);
    Order.findByPk.mockResolvedValue(null);

    await setPackedStatusToOrder(req, res, next);

    expectError(404);
  });

  test("changes packed order to inTransit", async () => {
    req.params.id = "5";

    Order.update.mockResolvedValue([1]);

    await setInTransitStatusToOrder(req, res, next);

    expect(Order.update).toHaveBeenCalledWith(
      { status: "inTransit" },
      {
        where: {
          id: 5,
          status: "packed",
        },
      },
    );

    expect(res.json).toHaveBeenCalledWith({
      message: "Order status updated",
      orderId: 5,
      status: "inTransit",
    });
  });

  test("changes inTransit order to delivery", async () => {
    req.params.id = "5";

    Order.update.mockResolvedValue([1]);

    await setDeliveryStatusToOrder(req, res, next);

    expect(Order.update).toHaveBeenCalledWith(
      { status: "delivery" },
      {
        where: {
          id: 5,
          status: "inTransit",
        },
      },
    );

    expect(res.json).toHaveBeenCalledWith({
      message: "Order status updated",
      orderId: 5,
      status: "delivery",
    });
  });

  test("requires a reason for cancellation", async () => {
    req.params.id = "5";
    req.body.reason = "   ";

    await setCanceledStatusToOrder(req, res, next);

    expectError(400);
    expect(Order.update).not.toHaveBeenCalled();
  });

  test("cancels eligible orders with a reason", async () => {
    req.params.id = "5";
    req.body.reason = "  Customer request  ";

    Order.update.mockResolvedValue([1]);

    await setCanceledStatusToOrder(req, res, next);

    expect(Order.update).toHaveBeenCalledWith(
      {
        status: "canceled",
        reason: "Customer request",
      },
      {
        where: {
          id: 5,
          status: {
            [Op.in]: ["inProcess", "packed", "inTransit"],
          },
        },
      },
    );

    expect(res.json).toHaveBeenCalledWith({
      message: "Order canceled",
      orderId: 5,
    });

    expect(next).not.toHaveBeenCalled();
  });

  test("rejects cancellation in invalid state", async () => {
    req.params.id = "5";
    req.body.reason = "Customer request";

    Order.update.mockResolvedValue([0]);

    Order.findByPk.mockResolvedValue({
      id: 5,
      status: "delivery",
    });

    await setCanceledStatusToOrder(req, res, next);

    expectError(409);
    expect(res.json).not.toHaveBeenCalled();
  });
});
