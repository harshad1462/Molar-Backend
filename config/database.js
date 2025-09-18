const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('molarmap', 'root', 'root', {
  host: 'localhost',  // or your DB host
  dialect: 'mysql',
  port: 3306,         // change port if needed
  logging: false      // disable SQL logging, optional
});

module.exports = sequelize;
