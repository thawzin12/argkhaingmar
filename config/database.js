const { Sequelize } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST || "localhost",
    dialect: "mysql",
    logging: false,
    pool: {
      max: 10, // max connections
      min: 0, // minimum connections
      acquire: 60000, // wait max 30s before throwing error
      idle: 20000, // release idle connections after 10s
    },
  }
);

module.exports = sequelize;
