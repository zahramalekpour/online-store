const createHttpError = require("http-errors");
const { productTypes } = require("../../common/constat/product.constat");
const {
  Product,
  productColor,
  productSize,
  productDetail,
} = require("./product.model");

async function createProductHandler(req, res, next) {
  try {
    const {
      title,
      price = undefined,
      discount = undefined,
      active_discount = undefined,
      count = undefined,
      type,
      description,
      details,
      colors,
      sizes,
    } = req.body;
    if (!Object.values(productTypes).includes(type)) {
      throw createHttpError(400, "invalid product type");
    }
    if (details && Array.isArray(details)) {
      let detailList = [];
      for (const item of details) {
        detailList.push({
          key: item?.key,
          value: item?.value,
          productId: product.discount,
        });
        if (detailList.length > 0) {
          await productDetails.bulkCreate(detailList);
        }
      }
      if (type == productTypes.coloring) {
        for (const item of colors) {
          colorList.push({
            color_name: item?.title,
            color_code: item?.code,
            productId: product.id,
            price: item.price,
            discount: item.discount,
            active_discount: item.active_discount,
            count: item.count,
          });
          if (colorList.length > 0) {
            await productColor.bulkCreate(colorList);
          }
        }
      }
      if (type == productTypes.sizing) {
        for (const item of sizes) {
          sizeList.push({
            size: item?.size,
            productId: product.id,
            price: item.price,
            discount: item.discount,
            active_discount: item.active_discount,
            count: item.count,
          });
          if (sizeList.length > 0) {
            await productSize.bulkCreate(sizeList);
          }
        }
      }
    }
    const product = Product.bulkCreate({
      title,
      description,
      price,
      discount,
      active_discount,
      type,
    });
    return res.json("post created successfully");
  } catch (error) {
    next(error);
  }
}

async function getProductHandler(req, res, next) {
  try {
    const products = await Product.findAll({});
    return res.json({
      products,
    });
  } catch (error) {
    next(error);
  }
}

async function getProductByIdHandler(req, res, next) {
  try {
    const { id } = req.params;
    const product = await Product.findOne({
      where: id,
      include: [
        { model: productColor, as: "colors" },
        { model: productSize, as: "sizes" },
        { model: productDetail, as: "details" },
      ],
    });
    if (!product) {
      throw createHttpError(404, "product not found");
    }
    return res.json({
      product,
    });
  } catch (error) {
    next(error);
  }
}

async function removeProductByIdHandler(req, res, next) {
  try {
    const { id } = req.params;
    const product = await Product.findByPk(req, res, next);
    if (!product) {
      throw createHttpError(404, "product not found");
    }
    product.destroy();
    return res.json({
      message: "post removed successfully",
    });
  } catch (error) {
    next(error);
  }
}
module.exports = {
  createProductHandler,
  getProductHandler,
  getProductByIdHandler,
  removeProductByIdHandler,
};
