const { DataTypes } = require("sequelize");
const sequelize = require("../../config/sequelize.config");

const Role = sequelize.define(
  "role",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    title: { type: DataTypes.TEXT, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    timestamps: false,
    modelName: "role",
  },
);

const Permission = sequelize.define(
  "permission",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    title: { type: DataTypes.TEXT, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    timestamps: false,
    modelName: "permission",
  },
);

const rolePermission = sequelize.define(
  "role_permission",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    roleId: { type: DataTypes.INTEGER },
    permissionId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
  },
  {
    timestamps: false,
    modelName: "role_permission",
  },
);

module.exports = { Role, Permission, rolePermission };
