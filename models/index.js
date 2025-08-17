const sequelize = require("../config/database");

const User = require("./user");
const Category = require("./Category");
const Product = require("./Product");
const ProductSize = require("./ProductSize");
const Supplier = require("./Supplier");
const Purchase = require("./Purchase");
const PurchaseItem = require("./PurchaseItem");
const PurchasePayment = require("./PurchasePayment");
const Customer = require("./Customer");
const Sale = require("./Sale");
const SaleItem = require("./SaleItem");
const SalePayment = require("./SalePayment");
const InventoryMovement = require("./InventoryMovement");

const db = {
  sequelize,
  User,
  Category,
  Product,
  ProductSize,
  Supplier,
  Purchase,
  PurchaseItem,
  PurchasePayment,
  Customer,
  Sale,
  SaleItem,
  SalePayment,
  InventoryMovement,
};

// Associations
SalePayment.belongsTo(Sale, { foreignKey: "sale_id" });
Sale.hasMany(SalePayment, { foreignKey: "sale_id" });

// Associations
SaleItem.belongsTo(Sale, { foreignKey: "sale_id" });
Sale.hasMany(SaleItem, { foreignKey: "sale_id" });

SaleItem.belongsTo(ProductSize, { foreignKey: "size_id" });
ProductSize.hasMany(SaleItem, { foreignKey: "size_id" });

// Associations
PurchasePayment.belongsTo(Purchase, { foreignKey: "purchase_id" });
Purchase.hasMany(PurchasePayment, { foreignKey: "purchase_id" });

// Associations
PurchaseItem.belongsTo(Purchase, { foreignKey: "purchase_id" });
Purchase.hasMany(PurchaseItem, { foreignKey: "purchase_id" });

PurchaseItem.belongsTo(ProductSize, { foreignKey: "size_id" });
ProductSize.hasMany(PurchaseItem, { foreignKey: "size_id" });
// Associations
Purchase.belongsTo(Supplier, { foreignKey: "supplier_id" });
Supplier.hasMany(Purchase, { foreignKey: "supplier_id" });

// Associations
Product.belongsTo(Category, { foreignKey: "category_id" });
Category.hasMany(Product, { foreignKey: "category_id" });

// Associations
ProductSize.belongsTo(Product, { foreignKey: "product_id" });
Product.hasMany(ProductSize, { foreignKey: "product_id" });

// Inventory Movements
ProductSize.hasMany(InventoryMovement, { foreignKey: "size_id" });
InventoryMovement.belongsTo(ProductSize, { foreignKey: "size_id" });
// User ↔ Sale
User.hasMany(Sale, { foreignKey: "uid" });
Sale.belongsTo(User, { foreignKey: "uid" });

// Customer ↔ Sale
Customer.hasMany(Sale, { foreignKey: "customer_id" });
Sale.belongsTo(Customer, { foreignKey: "customer_id" });
module.exports = db;
