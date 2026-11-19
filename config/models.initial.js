const Basket = require("../modules/basket/basket.model");
const { Discount } = require("../modules/discount/disocunt.model");
const { Order, OrderItems } = require("../modules/order/order.model");
const { Payment } = require("../modules/payment/payment.model");
const {
  Product,
  ProductDetail,
  ProductColor,
  ProductSize,
} = require("../modules/product/product.model");
const {
  Role,
  rolePermission,
  Permission,
} = require("../modules/RBAC/rback.model");
const { RefreshToken } = require("../modules/user/refresh.model");
const { User, Otp } = require("../modules/user/user.model");
const sequelize = require("./sequelize.config");

async function initDatabases() {
  Product.hasMany(ProductDetail, {
    foreignKey: "productId",
    sourceKey: "id",
    as: "details",
  });
  ProductDetail.belongsTo(Product, {
    foreignKey: "productId",
    targetKey: "id",
  });

  Product.hasMany(ProductColor, {
    foreignKey: "productId",
    sourceKey: "id",
    as: "colors",
  });
  ProductColor.belongsTo(Product, { foreignKey: "productId", targetKey: "id" });

  Product.hasMany(ProductSize, {
    foreignKey: "productId",
    sourceKey: "id",
    as: "sizes",
  });
  ProductSize.belongsTo(Product, { foreignKey: "productId", targetKey: "id" });
  User.hasOne(Otp, { foreignKey: "userId", as: "otp", sourceKey: "id" });
  Otp.hasOne(User, { foreignKey: "otpId", as: "otp", sourceKey: "id" });
  Otp.belongsTo(User, { foreignKey: "userId", targetKey: "id" });

  Product.hasMany(Basket, {
    foreignKey: "productId",
    sourceKey: "id",
    as: "basket",
  });
  ProductColor.hasMany(Basket, {
    foreignKey: "colorId",
    sourceKey: "id",
    as: "basket",
  });
  ProductSize.hasMany(Basket, {
    foreignKey: "sizeId",
    sourceKey: "id",
    as: "basket",
  });
  User.hasMany(Basket, { foreignKey: "userId", sourceKey: "id", as: "basket" });
  User.hasMany(Discount, {
    foreignKey: "discountId",
    sourceKey: "id",
    as: "discount",
  });

  Basket.belongsTo(Product, {
    sourceKey: "productId",
    targetKey: "id",
    as: "product",
  });
  Basket.belongsTo(User, { sourceKey: "userId", targetKey: "id", as: "user" });
  Basket.belongsTo(ProductColor, {
    sourceKey: "colorId",
    targetKey: "id",
    as: "color",
  });
  Basket.belongsTo(ProductSize, {
    sourceKey: "sizeId",
    targetKey: "id",
    as: "size",
  });
  Basket.belongsTo(Discount, {
    sourceKey: "discountId",
    targetKey: "id",
    as: "discount",
  });

  Order.hasMany(OrderItems, {
    foreignKey: "orderId",
    sourceKey: "id",
    as: "items",
  });
  User.hasMany(Order, { foreignKey: "userId", sourceKey: "id", as: "orders" });
  OrderItems.belongsTo(Order, { foreignKey: "orderId", sourceKey: "id" });

  OrderItems.belongsTo(Product, {
    sourceKey: "productId",
    targetKey: "id",
    as: "product",
  });
  OrderItems.belongsTo(User, {
    sourceKey: "userId",
    targetKey: "id",
    as: "user",
  });
  OrderItems.belongsTo(ProductColor, {
    sourceKey: "colorId",
    targetKey: "id",
    as: "color",
  });
  OrderItems.belongsTo(ProductSize, {
    sourceKey: "sizeId",
    targetKey: "id",
    as: "size",
  });
  OrderItems.belongsTo(Discount, {
    sourceKey: "discountId",
    targetKey: "id",
    as: "discount",
  });

  User.hasMany(Payment, {
    foreignKey: "userId",
    sourceKey: "id",
    as: "payments",
  });
  Order.hasOne(Payment, {
    foreignKey: "orderId",
    sourceKey: "id",
    as: "payment",
    onDelete: "CASCADE",
  });
  Payment.hasOne(Order, {
    foreignKey: "paymentId",
    sourceKey: "id",
    as: "order",
    onDelete: "CASCADE",
  });

  User.belongsTo(Role, {
    foreignKey: "roleId",
    as: "userRole",
  });

  Role.hasMany(User, {
    foreignKey: "roleId",
    as: "users",
  });

  Role.belongsToMany(Permission, {
    through: {
      model: rolePermission,
      unique: false,
    },
    foreignKey: "roleId",
    otherKey: "permissionId",
    as: "permissions",
  });

  Permission.belongsToMany(Role, {
    through: {
      model: rolePermission,
      unique: false,
    },
    foreignKey: "permissionId",
    otherKey: "roleId",
    as: "roles",
  });

  rolePermission.belongsTo(Role, { foreignKey: "roleId", targetKey: "id" });
  rolePermission.belongsTo(Permission, {
    foreignKey: "permissionId",
    targetKey: "id",
  });
  await sequelize.authenticate();
  console.log("Database connection verified");
  await sequelize.sync({ alter: false });
}

module.exports = initDatabases;
