const createHttpError = require("http-errors");
const sequelize = require("../../config/sequelize.config");
const { Product, ProductColor, ProductSize } = require("../product/product.model");
const { productTypes } = require("../../common/constat/product.constat");
const Basket = require("./basket.model");

function positiveInt(value, label) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1) throw createHttpError(400, `Invalid ${label}`);
  return n;
}

async function resolveVariant(productId, colorId, sizeId, transaction) {
  const product = await Product.findByPk(productId, { transaction });
  if (!product) throw createHttpError(404, "Product not found");
  const variant = { productId, colorId: null, sizeId: null };
  let stockModel = Product;
  let stockId = productId;
  if (product.type === productTypes.coloring) {
    variant.colorId = positiveInt(colorId, "colorId");
    if (sizeId != null) throw createHttpError(400, "sizeId is not allowed for this product");
    stockModel = ProductColor;
    stockId = variant.colorId;
  } else if (product.type === productTypes.sizing) {
    variant.sizeId = positiveInt(sizeId, "sizeId");
    if (colorId != null) throw createHttpError(400, "colorId is not allowed for this product");
    stockModel = ProductSize;
    stockId = variant.sizeId;
  } else if (colorId != null || sizeId != null) {
    throw createHttpError(400, "This product does not have variants");
  }
  // Lock the stock row so concurrent cart updates for this variant are serialized.
  const stock = await stockModel.findByPk(stockId, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!stock || (stockModel !== Product && stock.productId !== productId)) {
    throw createHttpError(404, "Product variant not found");
  }
  return { variant, stock };
}

async function addToBasketHandler(req, res, next) {
  try {
    const userId = req.user.id;
    const productId = positiveInt(req.body?.productId, "productId");
    const quantity = req.body?.count === undefined ? 1 : positiveInt(req.body.count, "count");
    const result = await sequelize.transaction(async (transaction) => {
      const { variant, stock } = await resolveVariant(productId, req.body?.colorId, req.body?.sizeId, transaction);
      const where = { userId, ...variant };
      const existing = await Basket.findOne({ where, transaction, lock: transaction.LOCK.UPDATE });
      const newCount = (existing?.count ?? 0) + quantity;
      if (newCount > Number(stock.count)) throw createHttpError(409, "Insufficient stock");
      if (existing) {
        await existing.update({ count: newCount }, { transaction });
        return existing;
      }
      return Basket.create({ ...where, count: newCount }, { transaction });
    });
    res.status(200).json({ message: "Added to basket", basketItem: result });
  } catch (error) { next(error); }
}

async function updateBasketHandler(req, res, next) {
  try {
    const id = positiveInt(req.params.id, "basket item id");
    const count = positiveInt(req.body?.count, "count");
    const item = await sequelize.transaction(async (transaction) => {
      const basket = await Basket.findOne({ where: { id, userId: req.user.id }, transaction });
      if (!basket) throw createHttpError(404, "Basket item not found");
      const { stock } = await resolveVariant(basket.productId, basket.colorId, basket.sizeId, transaction);
      await basket.reload({ transaction, lock: transaction.LOCK.UPDATE });
      if (count > Number(stock.count)) throw createHttpError(409, "Insufficient stock");
      await basket.update({ count }, { transaction });
      return basket;
    });
    res.json({ message: "Basket item updated", basketItem: item });
  } catch (error) { next(error); }
}

async function removeFromBasketHandler(req, res, next) {
  try {
    const id = positiveInt(req.params.id, "basket item id");
    const deleted = await Basket.destroy({ where: { id, userId: req.user.id } });
    if (!deleted) throw createHttpError(404, "Basket item not found");
    res.json({ message: "Basket item removed" });
  } catch (error) { next(error); }
}

function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw createHttpError(500, "Invalid product price");
  return Math.round(n * 100) / 100;
}

async function getUserBasketByIdHandler(userId, options = {}) {
  const basket = await Basket.findAll({
    where: { userId },
    include: [
      { model: Product, as: "product" },
      { model: ProductColor, as: "color" },
      { model: ProductSize, as: "size" },
    ],
    transaction: options.transaction,
    order: [["id", "ASC"]],
  });
  let totalAmount = 0;
  let totalDiscount = 0;
  const items = basket.map((item) => {
    const { product, color, size } = item;
    if (!product) throw createHttpError(409, "Basket contains a missing product");
    const variant = product.type === productTypes.coloring ? color : product.type === productTypes.sizing ? size : product;
    if (!variant) throw createHttpError(409, "Basket contains a missing variant");
    const count = Number(item.count);
    if (!Number.isSafeInteger(count) || count < 1) throw createHttpError(409, "Invalid basket quantity");
    const unitPrice = money(variant.price);
    const discountPercent = variant.active_discount ? Number(variant.discount || 0) : 0;
    if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
      throw createHttpError(409, "Invalid discount percentage");
    }
    const subtotal = money(unitPrice * count);
    const discountAmount = money(subtotal * discountPercent / 100);
    const finalAmount = money(subtotal - discountAmount);
    totalAmount = money(totalAmount + subtotal);
    totalDiscount = money(totalDiscount + discountAmount);
    return {
      id: item.id, productId: item.productId, title: product.title,
      colorId: item.colorId, sizeId: item.sizeId, count,
      availableStock: Number(variant.count), unitPrice, discountPercent,
      subtotal, discountAmount, finalAmount,
    };
  });
  return { items, totalAmount, totalDiscount, finalAmount: money(totalAmount - totalDiscount) };
}

async function getBasketHandler(req, res, next) {
  try { res.json(await getUserBasketByIdHandler(req.user.id)); }
  catch (error) { next(error); }
}

module.exports = {
  addToBasketHandler, updateBasketHandler, removeFromBasketHandler,
  getBasketHandler, getUserBasketByIdHandler,
};
