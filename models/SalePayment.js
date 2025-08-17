const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Sale = require("./Sale");

class SalePayment extends Model {}

SalePayment.init(
  {
    payment_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    sale_id: { type: DataTypes.INTEGER, allowNull: false },
    payment_date: { type: DataTypes.DATEONLY, allowNull: false },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    method: {
      type: DataTypes.ENUM("cash", "bank", "credit"),
      defaultValue: "cash",
    },
  },
  {
    sequelize,
    modelName: "SalePayment",
    tableName: "sale_payments",
    timestamps: false,
  }
);

module.exports = SalePayment;
