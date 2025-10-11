const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS, {
  host: 'localhost',  // or your DB host
  dialect: 'mysql',
  port: process.env.DB_PORT || 3306,         // change port if needed
  logging: false      // disable SQL logging, optional
});

module.exports = sequelize;