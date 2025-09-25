const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'molarmap',
  process.env.DB_USER || 'root',
  process.env.DB_PASS || 'root', {
  host: 'localhost',  // or your DB host
  dialect: 'mysql',
  port: process.env.DB_PORT || 3306,         // change port if needed
  logging: false      // disable SQL logging, optional
});

module.exports = sequelize;