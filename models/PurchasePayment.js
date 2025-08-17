const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Purchase = require("./Purchase");

class PurchasePayment extends Model {}

PurchasePayment.init(
  {
    payment_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    purchase_id: { type: DataTypes.INTEGER, allowNull: false },
    payment_date: { type: DataTypes.DATEONLY, allowNull: false },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    method: {
      type: DataTypes.ENUM("cash", "bank", "credit"),
      defaultValue: "cash",
    },
  },
  {
    sequelize,
    modelName: "PurchasePayment",
    tableName: "purchase_payments",
    timestamps: false,
  }
);

module.exports = PurchasePayment;
