// const createHttpError = require("http-errors");
// const { productTypes } = require("../../common/constat/product.constat");
// const {
//   Product,
//   productColor,
//   productSize,
//   productDetail,
// } = require("./product.model");

// async function createProductHandler(req, res, next) {
//   try {
//     const {
//       title,
//       price = undefined,
//       discount = undefined,
//       active_discount = undefined,
//       count = undefined,
//       type,
//       description,
//       details,
//       colors,
//       sizes,
//     } = req.body;
//     if (!Object.values(productTypes).includes(type)) {
//       throw createHttpError(400, "invalid product type");
//     }
//     if (details && Array.isArray(details)) {
//       let detailList = [];
//       for (const item of details) {
//         detailList.push({
//           key: item?.key,
//           value: item?.value,
//           productId: product.discount,
//         });
//         if (detailList.length > 0) {
//           await productDetails.bulkCreate(detailList);
//         }
//       }
//       if (type == productTypes.coloring) {
//         for (const item of colors) {
//           colorList.push({
//             color_name: item?.title,
//             color_code: item?.code,
//             productId: product.id,
//             price: item.price,
//             discount: item.discount,
//             active_discount: item.active_discount,
//             count: item.count,
//           });
//           if (colorList.length > 0) {
//             await productColor.bulkCreate(colorList);
//           }
//         }
//       }
//       if (type == productTypes.sizing) {
//         for (const item of sizes) {
//           sizeList.push({
//             size: item?.size,
//             productId: product.id,
//             price: item.price,
//             discount: item.discount,
//             active_discount: item.active_discount,
//             count: item.count,
//           });
//           if (sizeList.length > 0) {
//             await productSize.bulkCreate(sizeList);
//           }
//         }
//       }
//     }
//     const product = Product.bulkCreate({
//       title,
//       description,
//       price,
//       discount,
//       active_discount,
//       type,
//     });
//     return res.json("post created successfully");
//   } catch (error) {
//     next(error);
//   }
// }

// async function getProductHandler(req, res, next) {
//   try {
//     const products = await Product.findAll({});
//     return res.json({
//       products,
//     });
//   } catch (error) {
//     next(error);
//   }
// }

// async function getProductByIdHandler(req, res, next) {
//   try {
//     const { id } = req.params;
//     const product = await Product.findOne({
//       where: id,
//       include: [
//         { model: productColor, as: "colors" },
//         { model: productSize, as: "sizes" },
//         { model: productDetail, as: "details" },
//       ],
//     });
//     if (!product) {
//       throw createHttpError(404, "product not found");
//     }
//     return res.json({
//       product,
//     });
//   } catch (error) {
//     next(error);
//   }
// }

// async function removeProductByIdHandler(req, res, next) {
//   try {
//     const { id } = req.params;
//     const product = await Product.findByPk(req, res, next);
//     if (!product) {
//       throw createHttpError(404, "product not found");
//     }
//     product.destroy();
//     return res.json({
//       message: "post removed successfully",
//     });
//   } catch (error) {
//     next(error);
//   }
// }
// module.exports = {
//   createProductHandler,
//   getProductHandler,
//   getProductByIdHandler,
//   removeProductByIdHandler,
// };

const createHttpError = require("http-errors");
const sequelize = require("../../config/sequelize.config");
const { productTypes } = require("../../common/constat/product.constat");

const {
  Product,
  ProductColor,
  ProductSize,
  ProductDetail,
} = require("./product.model");

async function createProductHandler(req, res, next) {
  try {
    const {
      title,
      description,
      type,
      price,
      discount,
      active_discount,
      count,
      details = [],
      colors = [],
      sizes = [],
    } = req.body;

    if (!Object.values(productTypes).includes(type)) {
      throw createHttpError(400, "Invalid product type");
    }

    const product = await sequelize.transaction(async (transaction) => {
      const createdProduct = await Product.create(
        {
          title,
          description,
          type,
          price,
          discount,
          active_discount,
          count,
        },
        { transaction },
      );

      if (details.length > 0) {
        await ProductDetail.bulkCreate(
          details.map((item) => ({
            key: item.key,
            value: item.value,
            productId: createdProduct.id,
          })),
          { transaction },
        );
      }

      if (type === productTypes.coloring && colors.length > 0) {
        await ProductColor.bulkCreate(
          colors.map((item) => ({
            color_name: item.name,
            color_code: item.code,
            productId: createdProduct.id,
            price: item.price,
            discount: item.discount,
            active_discount: item.active_discount,
            count: item.count,
          })),
          { transaction },
        );
      }

      if (type === productTypes.sizing && sizes.length > 0) {
        await ProductSize.bulkCreate(
          sizes.map((item) => ({
            size: item.size,
            productId: createdProduct.id,
            price: item.price,
            discount: item.discount,
            active_discount: item.active_discount,
            count: item.count,
          })),
          { transaction },
        );
      }

      return createdProduct;
    });

    return res.status(201).json({
      message: "Product created successfully",
      productId: product.id,
    });
  } catch (error) {
    next(error);
  }
}

async function getProductHandler(req, res, next) {
  try {
    const products = await Product.findAll();

    return res.status(200).json({
      products,
    });
  } catch (error) {
    next(error);
  }
}

async function getProductByIdHandler(req, res, next) {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id, {
      include: [
        { model: ProductColor, as: "colors" },
        { model: ProductSize, as: "sizes" },
        { model: ProductDetail, as: "details" },
      ],
    });

    if (!product) {
      throw createHttpError(404, "Product not found");
    }

    return res.status(200).json({
      product,
    });
  } catch (error) {
    next(error);
  }
}

async function removeProductByIdHandler(req, res, next) {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id);

    if (!product) {
      throw createHttpError(404, "Product not found");
    }

    await product.destroy();

    return res.status(200).json({
      message: "Product removed successfully",
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
