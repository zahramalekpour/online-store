const { DataTypes } = require("sequelize");
const sequelize = require("../../config/sequelize.config");

const User = sequelize.define(
  "user",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    fullname: { type: DataTypes.STRING, allowNull: true },
    mobile: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    otpId: { type: DataTypes.INTEGER, allowNull: true },
    lastOtpSentAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    modelName: "user",
    updatedAt: "updated_at",
    createdAt: "created_at",
  },
);
const Otp = sequelize.define(
  "user_otp",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: true },
    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    fullname: { type: DataTypes.STRING, allowNull: true },
    otpId: { type: DataTypes.INTEGER, allowNull: true },
    code: { type: DataTypes.INTEGER, allowNull: false },
    expires_in: { type: DataTypes.DATE, allowNull: false },
  },
  {
    modelName: "user_otp",
    timestamps: false,
  },
);

module.exports = { User, Otp };
