const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/database");

class Unit extends Model {}

Unit.init(
  {
    unit_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    unit_label: {
      type: DataTypes.STRING(40),
      allowNull: false,
      unique: true,
    },
  },
  {
    sequelize,
    modelName: "Unit",
    tableName: "units",
    timestamps: false,
  }
);

module.exports = Unit;
