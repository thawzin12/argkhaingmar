const { Sequelize } = require("sequelize");
const dotenvFlow = require("dotenv-flow");

// Load correct .env based on NODE_ENV
dotenvFlow.config();

const isProduction = process.env.NODE_ENV === "production";

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306, // <- specify port here
    dialect: "mysql",
    logging: false,
    dialectOptions: isProduction
      ? {} // adjust SSL options if needed
      : {},
    pool: {
      max: 4,
      min: 0,
      acquire: 60000,
      idle: 20000,
    },
  }
);

module.exports = sequelize;
