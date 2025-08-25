const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/database");

class Size extends Model {}

Size.init(
  {
    size_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    size_label: {
      type: DataTypes.STRING(60),
      allowNull: false,
      unique: true,
    },
  },
  {
    sequelize,
    modelName: "Size",
    tableName: "sizes",
    timestamps: false,
  }
);

module.exports = Size;
