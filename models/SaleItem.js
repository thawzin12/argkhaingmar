const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Sale = require("./Sale");
const ProductSize = require("./ProductSize");

class SaleItem extends Model {}

SaleItem.init(
  {
    sale_item_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    sale_id: { type: DataTypes.INTEGER, allowNull: false },
    size_id: { type: DataTypes.INTEGER, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    unit_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    subtotal: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  },
  {
    sequelize,
    modelName: "SaleItem",
    tableName: "sale_items",
    timestamps: false,
  }
);

module.exports = SaleItem;
