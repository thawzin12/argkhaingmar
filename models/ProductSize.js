const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Product = require("./Product");
const Size = require("./Size");
const Unit = require("./Unit");

class ProductSize extends Model {}

ProductSize.init(
  {
    size_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    size_id_ref: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    unit_id_ref: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    barcode: { type: DataTypes.STRING(100), allowNull: true },
    cost_price: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    sale_price: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    stock_qty: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    stock_updated: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    modelName: "ProductSize",
    tableName: "product_sizes",
    timestamps: false,
  }
);

// Associations
ProductSize.belongsTo(Product, { foreignKey: "product_id" });
Product.hasMany(ProductSize, { foreignKey: "product_id" });

ProductSize.belongsTo(Size, { foreignKey: "size_id_ref" });
Size.hasMany(ProductSize, { foreignKey: "size_id_ref" });

ProductSize.belongsTo(Unit, { foreignKey: "unit_id_ref" });
Unit.hasMany(ProductSize, { foreignKey: "unit_id_ref" });

module.exports = ProductSize;
