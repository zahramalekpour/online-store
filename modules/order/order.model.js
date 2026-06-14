const { DataTypes } = require("sequelize");
const sequelize = require("../../config/sequelize.config");
const { orderStatus } = require("../../common/constat/oder.const");

const Order = sequelize.define(
  "order",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    paymentId: { type: DataTypes.INTEGER, allowNull: true },
    status: {
      type: DataTypes.ENUM(...Object.values(orderStatus)),
      defaultValue: orderStatus.pending,
    },
    address: { type: DataTypes.TEXT },
    userId: { type: DataTypes.INTEGER },
    final_amount: { type: DataTypes.DECIMAL },
    total_amount: { type: DataTypes.DECIMAL },
    discount_amount: { type: DataTypes.DECIMAL },
    reason: { type: DataTypes.STRING, allowNull: false },
  },
  {
    modelName: "order",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  },
);

const OrderItems = sequelize.define(
  "orderItems",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    orderId: { type: DataTypes.INTEGER },
    productId: { type: DataTypes.INTEGER },
    sizeId: { type: DataTypes.INTEGER, allowNull: true },
    colorId: { type: DataTypes.INTEGER, allowNull: true },
    count: { type: DataTypes.INTEGER },
  },
  {
    modelName: "order-items",
    timestamps: false,
  },
);

module.exports = { Order, OrderItems };
