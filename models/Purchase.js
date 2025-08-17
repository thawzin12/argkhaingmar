const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Supplier = require("./Supplier");

class Purchase extends Model {}

Purchase.init(
  {
    purchase_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    supplier_id: { type: DataTypes.INTEGER, allowNull: false },
    invoice_number: { type: DataTypes.STRING(100), allowNull: false },
    purchase_date: { type: DataTypes.DATEONLY, allowNull: false },
    total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    status: {
      type: DataTypes.ENUM("unpaid", "partial", "paid"),
      defaultValue: "unpaid",
    },
  },
  {
    sequelize,
    modelName: "Purchase",
    tableName: "purchases",
    timestamps: false,
  }
);

module.exports = Purchase;
