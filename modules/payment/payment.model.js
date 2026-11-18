const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize.config');
const Payment = sequelize.define('payment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  status: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }, // 0 pending, 1 paid, 2 failed, 3 expired
  amount: { type: DataTypes.INTEGER, allowNull: false },
  refId: { type: DataTypes.STRING, allowNull: true },
  authority: { type: DataTypes.STRING, allowNull: true },
  orderId: { type: DataTypes.INTEGER, allowNull: true },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  checkoutKey: { type: DataTypes.STRING(80), allowNull: true },
  reservationExpiresAt: { type: DataTypes.DATE, allowNull: true },
}, { modelName: 'payment', createdAt: 'created_at', updatedAt: false });
module.exports = { Payment };
