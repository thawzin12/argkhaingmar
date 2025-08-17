const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/database");

class Sale extends Model {}

Sale.init(
  {
    sale_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    invoice_number: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    sale_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    discount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
    },
    actual_income: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("unpaid", "partial", "paid"),
      defaultValue: "paid",
    },
    uid: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "Sale",
    tableName: "sales",
    timestamps: false,
  }
);

module.exports = Sale;
