const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Product = require('./Product');

class ProductSize extends Model {}

ProductSize.init({
  size_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  package_size: { type: DataTypes.STRING(60), allowNull: false },
  unit_label: { type: DataTypes.STRING(40), allowNull: false },
  barcode: { type: DataTypes.STRING(100) },
  cost_price: { type: DataTypes.DECIMAL(10,2) },
  sale_price: { type: DataTypes.DECIMAL(10,2) }
}, {
  sequelize,
  modelName: 'ProductSize',
  tableName: 'product_sizes',
  timestamps: false
});

module.exports = ProductSize;
