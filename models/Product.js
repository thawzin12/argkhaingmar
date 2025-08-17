const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Category = require("./Category");

class Product extends Model {}

Product.init(
  {
    product_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: { type: DataTypes.STRING(200), allowNull: false },
    category_id: { type: DataTypes.INTEGER },
  },
  {
    sequelize,
    modelName: "Product",
    tableName: "products",
    timestamps: false,
  }
);

module.exports = Product;
