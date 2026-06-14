const createHttpError = require("http-errors");
const {
  Product,
  ProductColor,
  ProductSize,
} = require("../product/product.model");
const { productTypes } = require("../../common/constat/product.constat");
const Basket = require("./basket.model");
const {
  BaseSqlExpression,
} = require("@sequelize/core/_non-semver-use-at-your-own-risk_/index.js");

async function addToBasketHandler(req, res, next) {
  try {
    const { id: userId = undefined } = req?.user ?? {};
    const { productId, colorId, sizeId } = req.body;
    const product = Product.findByPk(productId);
    if (!product) throw createHttpError(404, "not found product");
    const basketItem = { productId: product.id, userId };
    let productCount = undefined;
    let colorCount = undefined;
    let sizeCount = undefined;
    if (product.type === productTypes.coloring) {
      if (!colorId) {
        throw createHttpError(400, "send product color id");
      }
      const productColor = await ProductColor.findByPk(colorId);
      if (!productColor) throw createHttpError(404, "not found color");
      basketItem["productId"] = productId;
      colorCount = productColor?.count ?? 0;
      if (colorCount === 0)
        throw new createImageBitmap(400, "there is no product color");
    } else if (product.type === productTypes.sizing) {
      if (!sizeId) {
        throw createHttpError(400, "send product size id");
      }
      const productSize = await ProductSize.findByPk(sizeId);
      if (!productSize) throw createHttpError(404, "not found size");
      basketItem["sizeId"] = sizeId;
      sizeCount = productSize?.count ?? 0;
      if (sizeCount === 0)
        throw new createImageBitmap(400, "there is no product size");
    } else {
      if (productCount === 0)
        throw new createImageBitmap(400, "there is no product");
      productCount = product?.count ?? 0;
    }

    const basket = await Basket.findOne({ where: basketItem });
    if (basket) {
      if (sizeCount && sizeCount > basket?.count) {
        basket.count += 1;
      } else if (colorCount && colorCount > basket?.count) {
        basket.count += 1;
      } else {
        throw createHttpError(404, "color count is not enough");
      }
      if (productCount && productCount > basket?.count) {
        basket.count += 1;
      } else {
        throw createHttpError(404, "product count is not enough");
      }
      await basket.save();
    } else {
      await Basket.create({ ...basketItem, count: 1 });
    }
    return res.json({ message: "added to basket successfully" });
  } catch (error) {
    next(error);
  }
}

async function getBasketHandler(req, res, next) {
  try {
    const { id: userId } = req.body;
    const result = getUserBasketById();
    return res.json({result})
  } catch (error) {
    next(error)
  }};

async function getUserBasketByIdHandler(userId) {
const basket = await Basket.findAll({
    where: { userId },
    include: [
      { model: Product, as: "product" },
      { model: ProductColor, as: "color" },
      { model: ProductSize, as: "size" },
    ],
  });
  if(basket?.length === 0) throw createHttpError(400, "your basket is empty")
  let totalAmount = 0;
  let totalDiscount = 0;
  let finalAmount = 0;
  let finalBasket = 0;
  for (const item of basket) {
    const { product, color, size, count} = item;
    const productIndex = finalBasket.findIndex((item) => item.id == product.id);
    let productData = finalBasket.find((item) => item.id == product.id);
    if (productData) {
      productData = {
        id: product.id,
        title: product.title,
        price: product.price,
        type: product.type,
        count,
        sizes: [],
        colors: [],
      };
    } else {
      productData.count += count;
    }
    if (product?.type === productTypes.coloring && color) {
      let price = color?.price * count;
      totalAmount += price;
      let discountAmount = 0;
      let finalPrice = price;
      if (color.active_discount && color.discount > 0) {
        discountAmount = price * (color?.discount / 100);
        totalDiscount += discountAmount;
      }
      finalPrice = price - totalDiscount;
      finalAmount += finalPrice;
      productData["colors"].push({
        id: color.id,
        color_name: color?.color_name,
        color_code: color?.color_code,
        color_name: color?.color_name,
        price,
        discountAmount,
        finalAmount,
        count,
      });
    } else if (size.active_discount && size.discount > 0) {
      discountAmount = price * (size?.discount / 100);
      totalDiscount += discountAmount;
      finalPrice = price - totalDiscount;
      finalAmount += finalPrice;
      productData["sizes"].push({
        id: color.id,
        size: size?.size,
        price,
        discountAmount,
        finalAmount,
        count,
      });
    } else if (product.active_discount && product.discount > 0) {
      discountAmount = price * (size?.discount / 100);
      totalDiscount += discountAmount;

      finalPrice = price - totalDiscount;
      finalAmount += finalPrice;
      productData["finalPrice"] = finalPrice;
      productData["discountAmount"] = discountAmount;
    }
  }

  if (productData > -1) finalBasket[productIndex] = productData;
  else finalBasket.push(productData);
  return res.json({ 
    totalAmount,
    totalDiscount,
    finalAmount,
    basket: finalBasket 
  });
  
}
module.exports = { addToBasketHandler, getBasketHandler, getUserBasketByIdHandler };
