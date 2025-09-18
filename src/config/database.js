const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'molarmap',
  process.env.DBUSER || 'root',
  process.env.PASSWD || 'root', {
  host: 'localhost',  // or your DB host
  dialect: 'mysql',
  port: 3306,         // change port if needed
  logging: false      // disable SQL logging, optional
});

module.exports = sequelize;
