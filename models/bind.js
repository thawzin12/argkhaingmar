const sequelize = require("../config/database");
const User = require("./User");
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
const Size = require("./Size");
const Unit = require("./Unit");

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
  Size,
  Unit,
};

//

// Purchase belongsTo Supplier
Purchase.belongsTo(Supplier, { foreignKey: "supplier_id" });

// PurchaseItem belongsTo ProductSize
PurchaseItem.belongsTo(ProductSize, { foreignKey: "size_id" });

// ProductSize ↔ Product / Size / Unit
ProductSize.belongsTo(Product, { foreignKey: "product_id" });
Product.hasMany(ProductSize, { foreignKey: "product_id" });

ProductSize.belongsTo(Size, { foreignKey: "size_id_ref" });
Size.hasMany(ProductSize, { foreignKey: "size_id_ref" });

ProductSize.belongsTo(Unit, { foreignKey: "unit_id_ref" });
Unit.hasMany(ProductSize, { foreignKey: "unit_id_ref" });
/////
// Associations

// Purchase ↔ PurchaseItem ↔ ProductSize
Purchase.hasMany(PurchaseItem, { foreignKey: "purchase_id" });
PurchaseItem.belongsTo(Purchase, { foreignKey: "purchase_id" });

ProductSize.hasMany(PurchaseItem, { foreignKey: "size_id" });
PurchaseItem.belongsTo(ProductSize, { foreignKey: "size_id" });

///
// Sale ↔ SaleItem ↔ ProductSize
Sale.hasMany(SaleItem, { foreignKey: "sale_id" });
SaleItem.belongsTo(Sale, { foreignKey: "sale_id" });

ProductSize.hasMany(SaleItem, { foreignKey: "size_id" });
SaleItem.belongsTo(ProductSize, { foreignKey: "size_id" });

// PurchasePayment ↔ Purchase
Purchase.hasMany(PurchasePayment, { foreignKey: "purchase_id" });
PurchasePayment.belongsTo(Purchase, { foreignKey: "purchase_id" });

// SalePayment ↔ Sale
Sale.hasMany(SalePayment, { foreignKey: "sale_id" });
SalePayment.belongsTo(Sale, { foreignKey: "sale_id" });

// Supplier ↔ Purchase
Supplier.hasMany(Purchase, { foreignKey: "supplier_id" });
Purchase.belongsTo(Supplier, { foreignKey: "supplier_id" });

// Product ↔ Category
Category.hasMany(Product, { foreignKey: "category_id" });
Product.belongsTo(Category, { foreignKey: "category_id" });

// InventoryMovement ↔ ProductSize
ProductSize.hasMany(InventoryMovement, { foreignKey: "size_id" });
InventoryMovement.belongsTo(ProductSize, { foreignKey: "size_id" });

// User ↔ Sale
User.hasMany(Sale, { foreignKey: "uid" });
Sale.belongsTo(User, { foreignKey: "uid" });

// Customer ↔ Sale
Customer.hasMany(Sale, { foreignKey: "customer_id" });
Sale.belongsTo(Customer, { foreignKey: "customer_id" });

module.exports = db;
