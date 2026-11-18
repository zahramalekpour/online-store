const { DataTypes } = require("sequelize");
const sequelize = require("../../config/sequelize.config");
const { productTypes } = require("../../common/constat/product.constat");

const Product = sequelize.define(
  "product",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    title: { type: DataTypes.STRING },
    price: { type: DataTypes.DECIMAL },
    discount: { type: DataTypes.INTEGER, allowNull: true },
    active_discount: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: true,
    },
    type: { type: DataTypes.ENUM(...Object.values(productTypes)) },
    count: { type: DataTypes.INTEGER, defaultValue: 0 },
    description: { type: DataTypes.TEXT },
  },
  {
    modelName: "product",
    timestamps: false,
  },
);

const ProductDetail = sequelize.define(
  "product_detail",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    key: { type: DataTypes.STRING },
    value: { type: DataTypes.STRING },
    productId: { type: DataTypes.INTEGER },
  },
  {
    modelName: "product_detail",
    timestamps: false,
  },
);

const ProductColor = sequelize.define(
  "product_color",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    color_code: { type: DataTypes.STRING },
    color_name: { type: DataTypes.STRING },
    productId: { type: DataTypes.INTEGER },
    count: { type: DataTypes.INTEGER, defaultValue: 0 },
    price: { type: DataTypes.DECIMAL, defaultValue: 0 },
    discount: { type: DataTypes.DECIMAL, defaultValue: 0 },
    active_discount: { type: DataTypes.INTEGER, allowNull: true },
  },
  {
    modelName: "product_color",
    timestamps: false,
  },
);

const ProductSize = sequelize.define(
  "product_size",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    size: { type: DataTypes.STRING },
    productId: { type: DataTypes.INTEGER },
    count: { type: DataTypes.INTEGER, defaultValue: 0 },
    price: { type: DataTypes.DECIMAL, defaultValue: 0 },
    discount: { type: DataTypes.DECIMAL, defaultValue: 0 },
    active_discount: { type: DataTypes.INTEGER, allowNull: true },
  },
  {
    modelName: "product",
    timestamps: false,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
module.exports = {
  Product,
  ProductColor,
  ProductDetail,
  ProductSize,
};
