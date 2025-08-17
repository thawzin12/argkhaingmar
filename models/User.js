const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class User extends Model {}

User.init({
  uid: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  email: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  password: { type: DataTypes.STRING(255), allowNull: false },
  role: { type: DataTypes.STRING(50), allowNull: false },
  otp: { type: DataTypes.STRING(10) },
  otpExpiry: { type: DataTypes.DATE }
}, {
  sequelize,
  modelName: 'User',
  tableName: 'user',
  timestamps: false
});

module.exports = User;
