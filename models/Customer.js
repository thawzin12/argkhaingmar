const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/database");

class Customer extends Model {}

Customer.init(
  {
    customer_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "Customer",
    tableName: "customers",
    timestamps: false,
  }
);

module.exports = Customer;
