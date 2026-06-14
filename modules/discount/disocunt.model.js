const { DataTypes } = require("sequelize");
const sequelize = require("../../config/sequelize.config");

const Discount = sequelize.define("discount", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    productId: { type: DataTypes.INTEGER, allowNull: true },
    code: { type: DataTypes.INTEGER },
    type: {type : DataTypes.ENUM("basket", "product")},
    amount:{type: DataTypes.INTEGER},
    percent:{type: DataTypes.INTEGER},
    usage:{type: DataTypes.INTEGER, allowNull:true},
    limit:{type: DataTypes.INTEGER, allowNull:true},
    expires_in:{type: DataTypes.INTEGER, allowNull:true},
},{
    modelName : "discount",
    timestamps : true,
    createdAt : "created_at",
    updatedAt:false
})

module.exports = {Discount}