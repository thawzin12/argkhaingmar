const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/database");

class InventoryMovement extends Model {}

InventoryMovement.init(
  {
    movement_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    size_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    source_type: {
      type: DataTypes.ENUM("purchase", "sale", "adjustment"),
      allowNull: false,
    },
    source_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false, // +in, -out
    },
    moved_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: "InventoryMovement",
    tableName: "inventory_movements",
    timestamps: false,
  }
);

module.exports = InventoryMovement;
