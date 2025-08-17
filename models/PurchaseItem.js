const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Purchase = require("./Purchase");
const ProductSize = require("./ProductSize");

class PurchaseItem extends Model {}

PurchaseItem.init(
  {
    purchase_item_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    purchase_id: { type: DataTypes.INTEGER, allowNull: false },
    size_id: { type: DataTypes.INTEGER, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    cost_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    subtotal: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  },
  {
    sequelize,
    modelName: "PurchaseItem",
    tableName: "purchase_items",
    timestamps: false,
  }
);


module.exports = PurchaseItem;
