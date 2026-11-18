/* ================================
   MOCKS
================================ */

jest.mock("../../config/sequelize.config", () => ({
  transaction: jest.fn(),
}));

jest.mock("../../modules/product/product.model", () => ({
  Product: {
    findByPk: jest.fn(),
  },
  ProductColor: {
    findByPk: jest.fn(),
  },
  ProductSize: {
    findByPk: jest.fn(),
  },
}));

jest.mock("../../modules/basket/basket.model", () => ({
  findOne: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  destroy: jest.fn(),
}));

/* ================================
   IMPORTS
================================ */

const sequelize = require("../../config/sequelize.config");

const {
  Product,
  ProductColor,
  ProductSize,
} = require("../../modules/product/product.model");

const Basket = require("../../modules/basket/basket.model");

const {
  getUserBasketByIdHandler,
  addToBasketHandler,
  updateBasketHandler,
  removeFromBasketHandler,
} = require("../../modules/basket/basket.service");

/* ================================
   TEST SETUP
================================ */

describe("Basket Service Tests", () => {
  let req;
  let res;
  let next;
  let transaction;

  beforeEach(() => {
    // resetAllMocks: implementation ها و مقدارهای Once باقی‌مانده هم پاک می‌شوند
    jest.resetAllMocks();

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
      body: {},
      params: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    next = jest.fn();
  });

  function createBasketItem({
    count = 2,
    price = 500000,
    active_discount = false,
    discount = 0,
  } = {}) {
    return {
      id: 1,
      productId: 1,
      colorId: null,
      sizeId: null,
      count,
      product: {
        id: 1,
        title: "Test Product",
        type: "single",
        price,
        count: 10,
        active_discount,
        discount,
      },
      color: null,
      size: null,
    };
  }

  function mockSimpleProduct(stock = 10) {
    Product.findByPk
      .mockResolvedValueOnce({
        id: 1,
        type: "single",
      })
      .mockResolvedValueOnce({
        id: 1,
        count: stock,
      });
  }

  /* ================================
     BASKET CALCULATION TESTS
  ================================ */

  describe("Basket Calculation", () => {
    test("should calculate basket total correctly", async () => {
      Basket.findAll.mockResolvedValue([createBasketItem()]);

      const result = await getUserBasketByIdHandler(1);

      expect(result.totalAmount).toBe(1000000);
      expect(result.totalDiscount).toBe(0);
      expect(result.finalAmount).toBe(1000000);
    });

    test("should calculate discount correctly", async () => {
      Basket.findAll.mockResolvedValue([
        createBasketItem({
          count: 2,
          price: 500000,
          active_discount: true,
          discount: 20,
        }),
      ]);

      const result = await getUserBasketByIdHandler(1);

      expect(result.totalAmount).toBe(1000000);
      expect(result.totalDiscount).toBe(200000);
      expect(result.finalAmount).toBe(800000);
    });

    test("should reject invalid discount percentage", async () => {
      Basket.findAll.mockResolvedValue([
        createBasketItem({
          count: 1,
          active_discount: true,
          discount: 150,
        }),
      ]);

      await expect(getUserBasketByIdHandler(1)).rejects.toThrow(
        "Invalid discount percentage",
      );
    });

    test("should reject invalid basket quantity", async () => {
      Basket.findAll.mockResolvedValue([
        createBasketItem({
          count: 0,
        }),
      ]);

      await expect(getUserBasketByIdHandler(1)).rejects.toThrow(
        "Invalid basket quantity",
      );
    });

    test("should return empty basket correctly", async () => {
      Basket.findAll.mockResolvedValue([]);

      const result = await getUserBasketByIdHandler(1);

      expect(result).toEqual({
        items: [],
        totalAmount: 0,
        totalDiscount: 0,
        finalAmount: 0,
      });
    });

    test("should reject missing product", async () => {
      Basket.findAll.mockResolvedValue([
        {
          id: 1,
          count: 1,
          product: null,
          color: null,
          size: null,
        },
      ]);

      await expect(getUserBasketByIdHandler(1)).rejects.toThrow(
        "Basket contains a missing product",
      );
    });
  });

  /* ================================
     ADD TO BASKET TESTS
  ================================ */

  describe("Add To Basket", () => {
    test("should add a simple product", async () => {
      mockSimpleProduct(10);

      Basket.findOne.mockResolvedValue(null);

      Basket.create.mockResolvedValue({
        id: 1,
        userId: 1,
        productId: 1,
        count: 2,
      });

      req.body = {
        productId: 1,
        count: 2,
      };

      await addToBasketHandler(req, res, next);

      expect(Basket.create).toHaveBeenCalledWith(
        {
          userId: 1,
          productId: 1,
          colorId: null,
          sizeId: null,
          count: 2,
        },
        { transaction },
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(next).not.toHaveBeenCalled();
    });

    test("should increase existing product quantity", async () => {
      mockSimpleProduct(10);

      const existing = {
        count: 2,
        update: jest.fn().mockResolvedValue(true),
      };

      Basket.findOne.mockResolvedValue(existing);

      req.body = {
        productId: 1,
        count: 3,
      };

      await addToBasketHandler(req, res, next);

      expect(existing.update).toHaveBeenCalledWith(
        { count: 5 },
        { transaction },
      );

      expect(Basket.create).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    test("should reject quantity exceeding stock", async () => {
      mockSimpleProduct(3);

      Basket.findOne.mockResolvedValue(null);

      req.body = {
        productId: 1,
        count: 5,
      };

      await addToBasketHandler(req, res, next);

      expect(next).toHaveBeenCalled();

      expect(next.mock.calls[0][0].status).toBe(409);

      expect(Basket.create).not.toHaveBeenCalled();
    });

    test("should reject nonexistent product", async () => {
      Product.findByPk.mockResolvedValue(null);

      req.body = {
        productId: 999,
        count: 1,
      };

      await addToBasketHandler(req, res, next);

      expect(next.mock.calls[0][0].status).toBe(404);
    });

    test("should add coloring product with valid color", async () => {
      Product.findByPk.mockResolvedValueOnce({
        id: 1,
        type: "coloring",
      });

      ProductColor.findByPk.mockResolvedValue({
        id: 5,
        productId: 1,
        count: 8,
      });

      Basket.findOne.mockResolvedValue(null);

      Basket.create.mockResolvedValue({
        id: 1,
      });

      req.body = {
        productId: 1,
        colorId: 5,
        count: 2,
      };

      await addToBasketHandler(req, res, next);

      expect(Basket.create).toHaveBeenCalledWith(
        {
          userId: 1,
          productId: 1,
          colorId: 5,
          sizeId: null,
          count: 2,
        },
        { transaction },
      );

      expect(next).not.toHaveBeenCalled();
    });

    test("should add sizing product with valid size", async () => {
      Product.findByPk.mockResolvedValueOnce({
        id: 1,
        type: "sizing",
      });

      ProductSize.findByPk.mockResolvedValue({
        id: 7,
        productId: 1,
        count: 6,
      });

      Basket.findOne.mockResolvedValue(null);

      Basket.create.mockResolvedValue({
        id: 1,
      });

      req.body = {
        productId: 1,
        sizeId: 7,
        count: 2,
      };

      await addToBasketHandler(req, res, next);

      expect(Basket.create).toHaveBeenCalledWith(
        {
          userId: 1,
          productId: 1,
          colorId: null,
          sizeId: 7,
          count: 2,
        },
        { transaction },
      );

      expect(next).not.toHaveBeenCalled();
    });

    test("should reject coloring product without colorId", async () => {
      Product.findByPk.mockResolvedValue({
        id: 1,
        type: "coloring",
      });

      req.body = {
        productId: 1,
        count: 1,
      };

      await addToBasketHandler(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0].status).toBe(400);
      expect(Basket.create).not.toHaveBeenCalled();
    });

    test("should reject invalid product quantity", async () => {
      req.body = {
        productId: 1,
        count: -2,
      };

      await addToBasketHandler(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0].status).toBe(400);
    });
  });

  /* ================================
     UPDATE BASKET TESTS
  ================================ */

  describe("Update Basket", () => {
    test("should update basket quantity", async () => {
      const basket = {
        id: 1,
        userId: 1,
        productId: 1,
        colorId: null,
        sizeId: null,
        reload: jest.fn().mockResolvedValue(true),
        update: jest.fn().mockResolvedValue(true),
      };

      Basket.findOne.mockResolvedValue(basket);

      Product.findByPk
        .mockResolvedValueOnce({
          id: 1,
          type: "single",
        })
        .mockResolvedValueOnce({
          id: 1,
          count: 10,
        });

      req.params.id = "1";
      req.body.count = 5;

      await updateBasketHandler(req, res, next);

      expect(basket.update).toHaveBeenCalledWith({ count: 5 }, { transaction });

      expect(next).not.toHaveBeenCalled();
    });

    test("should reject update exceeding stock", async () => {
      const basket = {
        id: 1,
        userId: 1,
        productId: 1,
        colorId: null,
        sizeId: null,
        reload: jest.fn().mockResolvedValue(true),
        update: jest.fn(),
      };

      Basket.findOne.mockResolvedValue(basket);

      Product.findByPk
        .mockResolvedValueOnce({
          id: 1,
          type: "single",
        })
        .mockResolvedValueOnce({
          id: 1,
          count: 3,
        });

      req.params.id = "1";
      req.body.count = 5;

      await updateBasketHandler(req, res, next);

      expect(next.mock.calls[0][0].status).toBe(409);
      expect(basket.update).not.toHaveBeenCalled();
    });

    test("should reject updating nonexistent basket item", async () => {
      Basket.findOne.mockResolvedValue(null);

      req.params.id = "999";
      req.body.count = 2;

      await updateBasketHandler(req, res, next);

      expect(next.mock.calls[0][0].status).toBe(404);
    });
  });

  /* ================================
     REMOVE BASKET TESTS
  ================================ */

  describe("Remove Basket", () => {
    test("should remove basket item", async () => {
      Basket.destroy.mockResolvedValue(1);

      req.params.id = "1";

      await removeFromBasketHandler(req, res, next);

      expect(Basket.destroy).toHaveBeenCalledWith({
        where: {
          id: 1,
          userId: 1,
        },
      });

      expect(res.json).toHaveBeenCalledWith({
        message: "Basket item removed",
      });

      expect(next).not.toHaveBeenCalled();
    });

    test("should reject removing nonexistent basket item", async () => {
      Basket.destroy.mockResolvedValue(0);

      req.params.id = "999";

      await removeFromBasketHandler(req, res, next);

      expect(next.mock.calls[0][0].status).toBe(404);
    });
  });
});