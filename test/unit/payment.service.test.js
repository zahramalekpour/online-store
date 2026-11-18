jest.mock("../../config/sequelize.config", () => ({
  transaction: jest.fn(),
}));

jest.mock("../../modules/user/user.model", () => ({
  User: {
    findByPk: jest.fn(),
  },
}));

jest.mock("../../modules/basket/basket.model", () => ({
  destroy: jest.fn(),
}));

jest.mock("../../modules/basket/basket.service", () => ({
  getUserBasketByIdHandler: jest.fn(),
}));

jest.mock("../../modules/order/order.model", () => ({
  Order: {
    create: jest.fn(),
    findByPk: jest.fn(),
  },
  OrderItems: {
    bulkCreate: jest.fn(),
    findAll: jest.fn(),
  },
}));

jest.mock("../../modules/payment/payment.model", () => ({
  Payment: {
    create: jest.fn(),
    findOne: jest.fn(),
    findByPk: jest.fn(),
  },
}));

jest.mock("../../modules/payment/stock-reservation", () => ({
  reserve: jest.fn(),
  release: jest.fn(),
}));

jest.mock("../../modules/zarinpal/zarinpla.service", () => ({
  config: jest.fn(),
  zarinalRequest: jest.fn(),
  zarinalVerify: jest.fn(),
}));

const sequelize = require("../../config/sequelize.config");
const { User } = require("../../modules/user/user.model");
const Basket = require("../../modules/basket/basket.model");
const {
  getUserBasketByIdHandler,
} = require("../../modules/basket/basket.service");
const { Order, OrderItems } = require("../../modules/order/order.model");
const { Payment } = require("../../modules/payment/payment.model");
const { reserve, release } = require("../../modules/payment/stock-reservation");

const {
  config: validateZarinpalConfig,
  zarinalRequest,
  zarinalVerify,
} = require("../../modules/zarinpal/zarinpla.service");

const {
  paymentBasketHandler,
  paymentVerifyHandler,
} = require("../../modules/payment/payment.service");

const { orderStatus } = require("../../common/constat/oder.const");

describe("Payment Service Tests", () => {
  let req;
  let res;
  let next;
  let transaction;
  let payment;
  let order;

  const basketQuote = {
    items: [
      {
        id: 1,
        productId: 10,
        colorId: null,
        sizeId: null,
        count: 2,
      },
    ],
    totalAmount: 2000,
    totalDiscount: 500,
    finalAmount: 1500,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    transaction = {
      LOCK: {
        UPDATE: "UPDATE",
      },
    };

    sequelize.transaction.mockImplementation(async (callback) =>
      callback(transaction),
    );

    req = {
      user: { id: 1 },
      body: { address: "Tehran, Iran" },
      query: {},
      get: jest.fn().mockReturnValue("checkout_key_123456"),
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    next = jest.fn();

    payment = {
      id: 3,
      userId: 1,
      orderId: 5,
      amount: 1500,
      authority: "TEST_AUTHORITY",
      refId: null,
      status: 0,
      update: jest.fn().mockResolvedValue(true),
    };

    order = {
      id: 5,
      userId: 1,
      address: "Tehran, Iran",
      status: orderStatus.pending,
      update: jest.fn().mockResolvedValue(true),
    };

    validateZarinpalConfig.mockReturnValue(true);
    User.findByPk.mockResolvedValue({ id: 1 });

    getUserBasketByIdHandler.mockResolvedValue(basketQuote);

    Payment.findOne.mockResolvedValue(null);
    Payment.create.mockResolvedValue(payment);
    Payment.findByPk.mockResolvedValue(payment);

    Order.create.mockResolvedValue(order);
    Order.findByPk.mockResolvedValue(order);

    OrderItems.bulkCreate.mockResolvedValue([]);
    OrderItems.findAll.mockResolvedValue([
      {
        productId: 10,
        colorId: null,
        sizeId: null,
        count: 2,
      },
    ]);

    reserve.mockResolvedValue(true);
    release.mockResolvedValue(true);

    Basket.destroy.mockResolvedValue(1);

    zarinalRequest.mockResolvedValue({
      authority: "TEST_AUTHORITY",
      paymentUrl: "https://sandbox.zarinpal.com/pg/StartPay/TEST_AUTHORITY",
    });

    zarinalVerify.mockResolvedValue({
      refId: "42184001",
      alreadyVerified: false,
    });

    process.env.ZARINPAL_GATEWAY_URL =
      "https://sandbox.zarinpal.com/pg/StartPay";
  });

  // =====================================
  // CHECKOUT VALIDATION
  // =====================================

  describe("Checkout Validation", () => {
    test("should reject missing Idempotency-Key", async () => {
      req.get.mockReturnValue(undefined);

      await paymentBasketHandler(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0].status).toBe(400);
      expect(Payment.create).not.toHaveBeenCalled();
    });

    test("should reject invalid Idempotency-Key", async () => {
      req.get.mockReturnValue("short");

      await paymentBasketHandler(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0].status).toBe(400);
    });

    test("should reject missing address", async () => {
      req.body.address = "";

      await paymentBasketHandler(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0].status).toBe(400);
    });

    test("should reject invalid address", async () => {
      req.body.address = 12345;

      await paymentBasketHandler(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0].status).toBe(400);
    });

    test("should reject address longer than 2000 characters", async () => {
      req.body.address = "A".repeat(2001);

      await paymentBasketHandler(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0].status).toBe(400);
    });

    test("should reject missing user", async () => {
      User.findByPk.mockResolvedValue(null);

      await paymentBasketHandler(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0].status).toBe(401);
    });

    test("should reject empty basket", async () => {
      getUserBasketByIdHandler.mockResolvedValue({
        items: [],
        totalAmount: 0,
        totalDiscount: 0,
        finalAmount: 0,
      });

      await paymentBasketHandler(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0].status).toBe(400);
      expect(res.status).not.toHaveBeenCalled();
    });

    test("should reject invalid payment amount", async () => {
      getUserBasketByIdHandler.mockResolvedValue({
        ...basketQuote,
        finalAmount: 1500.5,
      });

      await paymentBasketHandler(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0].status).toBe(409);
      expect(reserve).not.toHaveBeenCalled();
    });
  });

  // =====================================
  // CHECKOUT CREATION
  // =====================================

  describe("Checkout Creation", () => {
    test("should create order and payment successfully", async () => {
      await paymentBasketHandler(req, res, next);

      expect(reserve).toHaveBeenCalledWith(basketQuote.items, transaction);

      expect(Payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          amount: 1500,
          status: 0,
          checkoutKey: "checkout_key_123456",
        }),
        { transaction },
      );

      expect(Order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          paymentId: 3,
          status: orderStatus.pending,
          address: "Tehran, Iran",
          final_amount: 1500,
          total_amount: 2000,
          discount_amount: 500,
        }),
        { transaction },
      );

      expect(OrderItems.bulkCreate).toHaveBeenCalled();
      expect(zarinalRequest).toHaveBeenCalledWith(1500, req.user);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 5,
          paymentId: 3,
          authority: "TEST_AUTHORITY",
        }),
      );

      expect(next).not.toHaveBeenCalled();
    });

    test("should trim customer address", async () => {
      req.body.address = "  Tehran, Iran  ";

      await paymentBasketHandler(req, res, next);

      expect(Order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          address: "Tehran, Iran",
        }),
        { transaction },
      );
    });

    test("should prevent duplicate checkout", async () => {
      Payment.findOne.mockResolvedValue(payment);

      await paymentBasketHandler(req, res, next);

      expect(Payment.create).not.toHaveBeenCalled();
      expect(Order.create).not.toHaveBeenCalled();
      expect(reserve).not.toHaveBeenCalled();
      expect(zarinalRequest).not.toHaveBeenCalled();

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 5,
          paymentId: 3,
          authority: "TEST_AUTHORITY",
          paymentUrl: expect.any(String),
        }),
      );
    });

    test("should reject reused key with different address", async () => {
      Payment.findOne.mockResolvedValue(payment);
      order.address = "Another address";

      await paymentBasketHandler(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0].status).toBe(409);
      expect(Payment.create).not.toHaveBeenCalled();
    });

    test("should return already paid for existing paid checkout", async () => {
      payment.status = 1;
      Payment.findOne.mockResolvedValue(payment);

      await paymentBasketHandler(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        message: "Already paid",
        orderId: 5,
        paymentId: 3,
      });

      expect(zarinalRequest).not.toHaveBeenCalled();
    });

    test("should reject closed existing checkout", async () => {
      payment.status = 2;
      Payment.findOne.mockResolvedValue(payment);

      await paymentBasketHandler(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0].status).toBe(409);
    });

    test("should reject existing checkout without authority", async () => {
      payment.authority = null;
      Payment.findOne.mockResolvedValue(payment);

      await paymentBasketHandler(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0].status).toBe(409);
    });

    test("should save gateway authority", async () => {
      await paymentBasketHandler(req, res, next);

      expect(payment.update).toHaveBeenCalledWith(
        { authority: "TEST_AUTHORITY" },
        { transaction },
      );
    });

    test("should retain reservation when gateway request fails", async () => {
      zarinalRequest.mockRejectedValue(new Error("Gateway connection failed"));

      await paymentBasketHandler(req, res, next);

      expect(reserve).toHaveBeenCalled();
      expect(release).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0].message).toBe("Gateway connection failed");
    });
  });

  // =====================================
  // PAYMENT VERIFICATION
  // =====================================

  describe("Payment Verification", () => {
    beforeEach(() => {
      req.query = {
        Authority: "TEST_AUTHORITY",
        Status: "OK",
      };

      Payment.findOne.mockResolvedValue(payment);
      Payment.findByPk.mockResolvedValue(payment);
      Order.findByPk.mockResolvedValue(order);
    });

    test("should verify payment successfully", async () => {
      await paymentVerifyHandler(req, res, next);

      expect(zarinalVerify).toHaveBeenCalledWith(1500, "TEST_AUTHORITY");

      expect(payment.update).toHaveBeenCalledWith(
        {
          status: 1,
          refId: "42184001",
        },
        { transaction },
      );

      expect(order.update).toHaveBeenCalledWith(
        {
          status: orderStatus.inProcess,
        },
        { transaction },
      );

      expect(res.json).toHaveBeenCalledWith({
        message: "Payment verified",
        paymentId: 3,
        refId: "42184001",
      });

      expect(next).not.toHaveBeenCalled();
    });

    test("should reject missing authority", async () => {
      req.query = { Status: "OK" };

      await paymentVerifyHandler(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0].status).toBe(400);
    });

    test("should reject nonexistent payment", async () => {
      Payment.findOne.mockResolvedValue(null);

      await paymentVerifyHandler(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0].status).toBe(404);
    });

    test("should return already paid without verifying again", async () => {
      payment.status = 1;
      payment.refId = "42184001";

      await paymentVerifyHandler(req, res, next);

      expect(zarinalVerify).not.toHaveBeenCalled();

      expect(res.json).toHaveBeenCalledWith({
        message: "Already paid",
        paymentId: 3,
        refId: "42184001",
      });
    });

    test("should reject closed payment", async () => {
      payment.status = 2;

      await paymentVerifyHandler(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0].status).toBe(409);
      expect(zarinalVerify).not.toHaveBeenCalled();
    });

    test("should not accept NOK payment", async () => {
      req.query.Status = "NOK";

      await paymentVerifyHandler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(zarinalVerify).not.toHaveBeenCalled();
      expect(payment.update).not.toHaveBeenCalled();
    });

    test("should not mark payment paid if gateway verification fails", async () => {
      zarinalVerify.mockRejectedValue(new Error("Gateway verification failed"));

      await paymentVerifyHandler(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(payment.update).not.toHaveBeenCalled();
      expect(order.update).not.toHaveBeenCalled();
    });

    test("should reject already verified gateway transaction without refId", async () => {
      zarinalVerify.mockResolvedValue({
        alreadyVerified: true,
        refId: null,
      });

      await paymentVerifyHandler(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0].status).toBe(409);
      expect(payment.update).not.toHaveBeenCalled();
    });

    test("should reject payment if reservation was released", async () => {
      const releasedPayment = {
        ...payment,
        status: 2,
        update: jest.fn(),
      };

      Payment.findByPk.mockResolvedValue(releasedPayment);

      await paymentVerifyHandler(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0].status).toBe(409);
      expect(order.update).not.toHaveBeenCalled();
    });

    test("should reject missing order", async () => {
      Order.findByPk.mockResolvedValue(null);

      await paymentVerifyHandler(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0].status).toBe(409);
    });

    test("should remove only purchased basket items", async () => {
      await paymentVerifyHandler(req, res, next);

      expect(Basket.destroy).toHaveBeenCalledWith({
        where: {
          userId: 1,
          productId: 10,
          colorId: null,
          sizeId: null,
          count: 2,
        },
        transaction,
      });
    });

    test("should not delete basket items if transaction fails", async () => {
      sequelize.transaction.mockRejectedValue(
        new Error("Database transaction failed"),
      );

      await paymentVerifyHandler(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(Basket.destroy).not.toHaveBeenCalled();
    });
  });
});
