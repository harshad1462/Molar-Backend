const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('subscribers', {
    subscriber_id: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    end_date: {
      type: DataTypes.DATE(6),
      allowNull: false
    },
    start_date: {
      type: DataTypes.DATE(6),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('ACTIVE','INACTIVE'),
      allowNull: false
    },
    package_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'packages',
        key: 'package_id'
      }
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    created_by: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    created_date: {
      type: DataTypes.DATE(6),
      allowNull: true
    },
    updated_by: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    updated_date: {
      type: DataTypes.DATE(6),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'subscribers',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "subscriber_id" },
        ]
      },
      {
        name: "FKcr3lpdf5yv5abt4d1w6tqru9g",
        using: "BTREE",
        fields: [
          { name: "package_id" },
        ]
      },
      {
        name: "FKll9lhik8xj3ep6ahtdt7me7pu",
        using: "BTREE",
        fields: [
          { name: "user_id" },
        ]
      },
    ]
  });
};
