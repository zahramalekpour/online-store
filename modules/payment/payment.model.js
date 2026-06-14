const { DataTypes } = require("sequelize");
const sequelize = require("../../config/sequelize.config");

const Payment = sequelize.define(
  "payment",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    status: { type: DataTypes.INTEGER, defaultValue: false },
    amount: { type: DataTypes.INTEGER },
    refId: { type: DataTypes.STRING, allowNull: true },
    authority: { type: DataTypes.STRING, allowNull: true },
    orderId: { type: DataTypes.INTEGER, allowNull: true },
    userId: { type: DataTypes.INTEGER, allowNull: true },
  },
  {
    modelName: "payment",
    createdAt: "created_at",
    updatedAt: false,
  },
);

module.exports = { Payment };
