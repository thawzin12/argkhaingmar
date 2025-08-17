const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/database");

class Supplier extends Model {}

Supplier.init(
  {
    supplier_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: { type: DataTypes.STRING(200), allowNull: false },
    phone: { type: DataTypes.STRING(50) },
    address: { type: DataTypes.TEXT },
  },
  {
    sequelize,
    modelName: "Supplier",
    tableName: "suppliers",
    timestamps: false,
  }
);

module.exports = Supplier;
