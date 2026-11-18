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

jest.mock("../../modules/order/order.model", () => ({
  Order: {
    findByPk: jest.fn(),
  },
  OrderItems: {
    findAll: jest.fn(),
  },
}));

jest.mock("../../modules/payment/payment.model", () => ({
  Payment: {
    findByPk: jest.fn(),
  },
}));

const {
  Product,
  ProductColor,
  ProductSize,
} = require("../../modules/product/product.model");

const { Order, OrderItems } = require("../../modules/order/order.model");

const { reserve, release } = require("../../modules/payment/stock-reservation");

const { productTypes } = require("../../common/constat/product.constat");
const { orderStatus } = require("../../common/constat/oder.const");

describe("Stock Reservation Tests", () => {
  let transaction;
  let stock;

  beforeEach(() => {
    // resetAllMocks: مقدارهای mockResolvedValue تست‌های قبلی نشت نکنند
    jest.resetAllMocks();

    transaction = {
      LOCK: {
        UPDATE: "UPDATE",
      },
    };

    stock = {
      count: 10,
      decrement: jest.fn().mockResolvedValue(true),
      increment: jest.fn().mockResolvedValue(true),
    };
  });

  describe("Reserve Stock", () => {
    test("should reserve stock for a simple product", async () => {
      Product.findByPk
        .mockResolvedValueOnce({
          id: 1,
          type: productTypes.single,
        })
        .mockResolvedValueOnce(stock);

      await reserve([{ productId: 1, count: 3 }], transaction);

      expect(stock.decrement).toHaveBeenCalledWith("count", {
        by: 3,
        transaction,
      });
    });

    test("should reserve stock for coloring product", async () => {
      Product.findByPk.mockResolvedValue({
        id: 1,
        type: productTypes.coloring,
      });

      ProductColor.findByPk.mockResolvedValue({ ...stock, productId: 1 });

      await reserve([{ productId: 1, colorId: 5, count: 2 }], transaction);

      expect(ProductColor.findByPk).toHaveBeenCalledWith(
        5,
        expect.objectContaining({
          transaction,
          lock: transaction.LOCK.UPDATE,
        }),
      );

      expect(stock.decrement).toHaveBeenCalledWith("count", {
        by: 2,
        transaction,
      });
    });

    test("should reserve stock for sizing product", async () => {
      Product.findByPk.mockResolvedValue({
        id: 1,
        type: productTypes.sizing,
      });

      ProductSize.findByPk.mockResolvedValue({ ...stock, productId: 1 });

      await reserve([{ productId: 1, sizeId: 7, count: 4 }], transaction);

      expect(ProductSize.findByPk).toHaveBeenCalledWith(
        7,
        expect.objectContaining({
          transaction,
          lock: transaction.LOCK.UPDATE,
        }),
      );

      expect(stock.decrement).toHaveBeenCalledWith("count", {
        by: 4,
        transaction,
      });
    });

    test("should reject missing product", async () => {
      Product.findByPk.mockResolvedValue(null);

      await expect(
        reserve([{ productId: 999, count: 1 }], transaction),
      ).rejects.toThrow("Product missing");
    });

    test("should reject missing color variant", async () => {
      Product.findByPk.mockResolvedValue({
        id: 1,
        type: productTypes.coloring,
      });

      await expect(
        reserve([{ productId: 1, count: 1 }], transaction),
      ).rejects.toThrow("Variant missing");
    });

    test("should reject missing size variant", async () => {
      Product.findByPk.mockResolvedValue({
        id: 1,
        type: productTypes.sizing,
      });

      await expect(
        reserve([{ productId: 1, count: 1 }], transaction),
      ).rejects.toThrow("Variant missing");
    });

    test("should reject variant belonging to another product", async () => {
      Product.findByPk.mockResolvedValue({
        id: 1,
        type: productTypes.coloring,
      });

      ProductColor.findByPk.mockResolvedValue({
        id: 5,
        productId: 99,
        count: 10,
      });

      await expect(
        reserve([{ productId: 1, colorId: 5, count: 1 }], transaction),
      ).rejects.toThrow("Product variant missing");
    });

    test("should reject insufficient stock", async () => {
      stock.count = 2;

      Product.findByPk
        .mockResolvedValueOnce({
          id: 1,
          type: productTypes.single,
        })
        .mockResolvedValueOnce(stock);

      await expect(
        reserve([{ productId: 1, count: 5 }], transaction),
      ).rejects.toThrow("Insufficient stock");

      expect(stock.decrement).not.toHaveBeenCalled();
    });

    test("should reject zero quantity", async () => {
      Product.findByPk
        .mockResolvedValueOnce({
          id: 1,
          type: productTypes.single,
        })
        .mockResolvedValueOnce(stock);

      await expect(
        reserve([{ productId: 1, count: 0 }], transaction),
      ).rejects.toThrow("Insufficient stock");

      expect(stock.decrement).not.toHaveBeenCalled();
    });

    test("should reject non-numeric quantity", async () => {
      Product.findByPk
        .mockResolvedValueOnce({
          id: 1,
          type: productTypes.single,
        })
        .mockResolvedValueOnce(stock);

      await expect(
        reserve([{ productId: 1, count: "abc" }], transaction),
      ).rejects.toThrow("Insufficient stock");

      expect(stock.decrement).not.toHaveBeenCalled();
    });

    test("should reserve multiple products", async () => {
      const stock1 = {
        count: 10,
        decrement: jest.fn().mockResolvedValue(true),
      };

      const stock2 = {
        count: 10,
        decrement: jest.fn().mockResolvedValue(true),
      };

      // فراخوانی با lock همان stock است، فراخوانی بدون lock خود محصول
      Product.findByPk.mockImplementation(async (id, options) => {
        if (options && options.lock) {
          return id === 1 ? stock1 : stock2;
        }
        return { id, type: productTypes.single };
      });

      await reserve(
        [
          { productId: 2, count: 3 },
          { productId: 1, count: 2 },
        ],
        transaction,
      );

      expect(stock1.decrement).toHaveBeenCalledWith("count", {
        by: 2,
        transaction,
      });

      expect(stock2.decrement).toHaveBeenCalledWith("count", {
        by: 3,
        transaction,
      });
    });
  });

  describe("Release Stock", () => {
    let payment;
    let order;
    let item;
    let productStock;

    beforeEach(() => {
      payment = {
        id: 1,
        orderId: 10,
        status: 0,
        update: jest.fn().mockResolvedValue(true),
      };

      order = {
        id: 10,
        update: jest.fn().mockResolvedValue(true),
      };

      item = {
        productId: 1,
        colorId: null,
        sizeId: null,
        count: 3,
      };

      productStock = {
        count: 7,
        increment: jest.fn().mockResolvedValue(true),
      };
    });

    test("should release reserved stock", async () => {
      Order.findByPk.mockResolvedValue(order);
      OrderItems.findAll.mockResolvedValue([item]);

      Product.findByPk
        .mockResolvedValueOnce({
          id: 1,
          type: productTypes.single,
        })
        .mockResolvedValueOnce(productStock);

      const result = await release(payment, transaction, 2, "Payment expired");

      expect(result).toBe(true);

      expect(productStock.increment).toHaveBeenCalledWith("count", {
        by: 3,
        transaction,
      });

      expect(payment.update).toHaveBeenCalledWith(
        { status: 2 },
        { transaction },
      );

      expect(order.update).toHaveBeenCalledWith(
        {
          status: orderStatus.canceled,
          reason: "Payment expired",
        },
        { transaction },
      );
    });

    test("should release stock for a coloring item", async () => {
      item.colorId = 5;

      Order.findByPk.mockResolvedValue(order);
      OrderItems.findAll.mockResolvedValue([item]);

      Product.findByPk.mockResolvedValue({
        id: 1,
        type: productTypes.coloring,
      });

      ProductColor.findByPk.mockResolvedValue({
        ...productStock,
        productId: 1,
      });

      const result = await release(payment, transaction, 2, "Expired");

      expect(result).toBe(true);
      expect(ProductColor.findByPk).toHaveBeenCalledWith(
        5,
        expect.objectContaining({ transaction }),
      );
      expect(productStock.increment).toHaveBeenCalledWith("count", {
        by: 3,
        transaction,
      });
    });

    test("should release stock for a sizing item", async () => {
      item.sizeId = 7;

      Order.findByPk.mockResolvedValue(order);
      OrderItems.findAll.mockResolvedValue([item]);

      Product.findByPk.mockResolvedValue({
        id: 1,
        type: productTypes.sizing,
      });

      ProductSize.findByPk.mockResolvedValue({
        ...productStock,
        productId: 1,
      });

      const result = await release(payment, transaction, 2, "Expired");

      expect(result).toBe(true);
      expect(ProductSize.findByPk).toHaveBeenCalledWith(
        7,
        expect.objectContaining({ transaction }),
      );
      expect(productStock.increment).toHaveBeenCalledWith("count", {
        by: 3,
        transaction,
      });
    });

    test("should truncate reason to 255 characters", async () => {
      Order.findByPk.mockResolvedValue(order);
      OrderItems.findAll.mockResolvedValue([item]);

      Product.findByPk
        .mockResolvedValueOnce({
          id: 1,
          type: productTypes.single,
        })
        .mockResolvedValueOnce(productStock);

      await release(payment, transaction, 2, "x".repeat(300));

      expect(order.update).toHaveBeenCalledWith(
        {
          status: orderStatus.canceled,
          reason: "x".repeat(255),
        },
        { transaction },
      );
    });

    test("should not release stock for already paid payment", async () => {
      payment.status = 1;

      const result = await release(payment, transaction, 2, "Expired");

      expect(result).toBe(false);
      expect(Order.findByPk).not.toHaveBeenCalled();
      expect(payment.update).not.toHaveBeenCalled();
    });

    test("should not release stock twice", async () => {
      payment.status = 2;

      const result = await release(payment, transaction, 2, "Expired");

      expect(result).toBe(false);
      expect(Order.findByPk).not.toHaveBeenCalled();
      expect(payment.update).not.toHaveBeenCalled();
    });

    test("should reject missing order", async () => {
      Order.findByPk.mockResolvedValue(null);

      await expect(release(payment, transaction, 2, "Expired")).rejects.toThrow(
        "Missing reserved order",
      );
    });

    test("should reject missing product during release", async () => {
      Order.findByPk.mockResolvedValue(order);
      OrderItems.findAll.mockResolvedValue([item]);
      Product.findByPk.mockResolvedValue(null);

      await expect(release(payment, transaction, 2, "Expired")).rejects.toThrow(
        "Product missing",
      );

      expect(payment.update).not.toHaveBeenCalled();
    });
  });
});