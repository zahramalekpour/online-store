const { DataTypes } = require("sequelize");
const sequelize = require("../../config/sequelize.config");

const RefreshToken = sequelize.define(
  "refresh_token",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    fullname: { type: DataTypes.STRING, allowNull: true },
    token: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    userId: { type: DataTypes.INTEGER, allowNull: true },
  },
  {
    modelName: "refresh_token",
    updatedAt: "updated_at",
    createdAt: "created_at",
  },
);

module.exports = { RefreshToken };
