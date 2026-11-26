jest.mock("../../config/sequelize.config", () => ({
  transaction: jest.fn(),
}));

jest.mock("../../common/constat/product.constat", () => ({
  productTypes: {
    single: "single",
    coloring: "coloring",
    sizing: "sizing",
  },
}));

jest.mock("../../modules/product/product.model", () => ({
  Product: {
    create: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
  },
  ProductColor: {
    bulkCreate: jest.fn(),
  },
  ProductSize: {
    bulkCreate: jest.fn(),
  },
  ProductDetail: {
    bulkCreate: jest.fn(),
  },
}));

const sequelize = require("../../config/sequelize.config");

const {
  Product,
  ProductColor,
  ProductSize,
  ProductDetail,
} = require("../../modules/product/product.model");

const {
  createProductHandler,
  getProductHandler,
  getProductByIdHandler,
  removeProductByIdHandler,
} = require("../../modules/product/product.service");

describe("Product Service Tests", () => {
  let req;
  let res;
  let next;
  let transaction;

  beforeEach(() => {
    jest.resetAllMocks();

    transaction = { id: "test-transaction" };

    sequelize.transaction.mockImplementation(async (callback) => {
      return callback(transaction);
    });

    Product.create.mockResolvedValue({ id: 10 });
    ProductColor.bulkCreate.mockResolvedValue([]);
    ProductSize.bulkCreate.mockResolvedValue([]);
    ProductDetail.bulkCreate.mockResolvedValue([]);

    req = {
      body: {},
      params: {},
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

  test("creates a single product successfully", async () => {
    req.body = {
      title: "Test Product",
      description: "Product description",
      type: "single",
      price: 100000,
      discount: 0,
      active_discount: false,
      count: 5,
    };

    await createProductHandler(req, res, next);

    expect(sequelize.transaction).toHaveBeenCalledTimes(1);

    expect(Product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Test Product",
        type: "single",
        price: 100000,
        count: 5,
      }),
      { transaction },
    );

    expect(res.status).toHaveBeenCalledWith(201);

    expect(res.json).toHaveBeenCalledWith({
      message: "Product created successfully",
      productId: 10,
    });

    expect(ProductColor.bulkCreate).not.toHaveBeenCalled();
    expect(ProductSize.bulkCreate).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  test("rejects invalid product type", async () => {
    req.body = {
      title: "Invalid Product",
      type: "invalid-type",
    };

    await createProductHandler(req, res, next);

    expectError(400);
    expect(Product.create).not.toHaveBeenCalled();
    expect(sequelize.transaction).not.toHaveBeenCalled();
  });

  test("creates product details with correct productId", async () => {
    req.body = {
      title: "Test Product",
      type: "single",
      details: [
        { key: "brand", value: "Test Brand" },
        { key: "material", value: "Cotton" },
      ],
    };

    await createProductHandler(req, res, next);

    expect(ProductDetail.bulkCreate).toHaveBeenCalledWith(
      [
        {
          key: "brand",
          value: "Test Brand",
          productId: 10,
        },
        {
          key: "material",
          value: "Cotton",
          productId: 10,
        },
      ],
      { transaction },
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(next).not.toHaveBeenCalled();
  });

  test("creates a coloring product with variants", async () => {
    req.body = {
      title: "Color Product",
      type: "coloring",
      colors: [
        {
          name: "Red",
          code: "#FF0000",
          price: 150000,
          discount: 10,
          active_discount: true,
          count: 3,
        },
      ],
    };

    await createProductHandler(req, res, next);

    expect(ProductColor.bulkCreate).toHaveBeenCalledWith(
      [
        {
          color_name: "Red",
          color_code: "#FF0000",
          productId: 10,
          price: 150000,
          discount: 10,
          active_discount: true,
          count: 3,
        },
      ],
      { transaction },
    );

    expect(ProductSize.bulkCreate).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(next).not.toHaveBeenCalled();
  });

  test("creates a sizing product with variants", async () => {
    req.body = {
      title: "Size Product",
      type: "sizing",
      sizes: [
        {
          size: "L",
          price: 200000,
          discount: 5,
          active_discount: true,
          count: 7,
        },
      ],
    };

    await createProductHandler(req, res, next);

    expect(ProductSize.bulkCreate).toHaveBeenCalledWith(
      [
        {
          size: "L",
          productId: 10,
          price: 200000,
          discount: 5,
          active_discount: true,
          count: 7,
        },
      ],
      { transaction },
    );

    expect(ProductColor.bulkCreate).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(next).not.toHaveBeenCalled();
  });

  test("does not create unrelated variants", async () => {
    req.body = {
      title: "Simple Product",
      type: "single",
      colors: [{ name: "Red", code: "#FF0000" }],
      sizes: [{ size: "L" }],
    };

    await createProductHandler(req, res, next);

    expect(Product.create).toHaveBeenCalledTimes(1);
    expect(ProductColor.bulkCreate).not.toHaveBeenCalled();
    expect(ProductSize.bulkCreate).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test("passes product creation errors to next", async () => {
    const error = new Error("Database unavailable");

    Product.create.mockRejectedValue(error);

    req.body = {
      title: "Test",
      type: "single",
    };

    await createProductHandler(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });

  test("passes variant creation errors to next", async () => {
    const error = new Error("Variant insert failed");

    ProductColor.bulkCreate.mockRejectedValue(error);

    req.body = {
      title: "Color Product",
      type: "coloring",
      colors: [{ name: "Blue", code: "#0000FF" }],
    };

    await createProductHandler(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });

  test("returns all products", async () => {
    const products = [
      { id: 1, title: "Product A" },
      { id: 2, title: "Product B" },
    ];

    Product.findAll.mockResolvedValue(products);

    await getProductHandler(req, res, next);

    expect(Product.findAll).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ products });
    expect(next).not.toHaveBeenCalled();
  });

  test("returns product details by ID", async () => {
    req.params.id = "10";

    const product = {
      id: 10,
      title: "Test Product",
    };

    Product.findByPk.mockResolvedValue(product);

    await getProductByIdHandler(req, res, next);

    expect(Product.findByPk).toHaveBeenCalledWith("10", {
      include: [
        { model: ProductColor, as: "colors" },
        { model: ProductSize, as: "sizes" },
        { model: ProductDetail, as: "details" },
      ],
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ product });
    expect(next).not.toHaveBeenCalled();
  });

  test("returns 404 when product does not exist", async () => {
    req.params.id = "999";

    Product.findByPk.mockResolvedValue(null);

    await getProductByIdHandler(req, res, next);

    expectError(404);
    expect(res.json).not.toHaveBeenCalled();
  });

  test("removes existing product successfully", async () => {
    req.params.id = "10";

    const destroy = jest.fn().mockResolvedValue(undefined);

    Product.findByPk.mockResolvedValue({
      id: 10,
      destroy,
    });

    await removeProductByIdHandler(req, res, next);

    expect(Product.findByPk).toHaveBeenCalledWith("10");
    expect(destroy).toHaveBeenCalledTimes(1);

    expect(res.status).toHaveBeenCalledWith(200);

    expect(res.json).toHaveBeenCalledWith({
      message: "Product removed successfully",
    });

    expect(next).not.toHaveBeenCalled();
  });

  test("returns 404 when deleting nonexistent product", async () => {
    req.params.id = "999";

    Product.findByPk.mockResolvedValue(null);

    await removeProductByIdHandler(req, res, next);

    expectError(404);
    expect(res.status).not.toHaveBeenCalled();
  });

  test("passes product deletion errors to next", async () => {
    req.params.id = "10";

    const error = new Error("Delete failed");

    const destroy = jest.fn().mockRejectedValue(error);

    Product.findByPk.mockResolvedValue({
      id: 10,
      destroy,
    });

    await removeProductByIdHandler(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.json).not.toHaveBeenCalled();
  });
});
