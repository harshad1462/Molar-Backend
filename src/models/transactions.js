const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('transactions', {
    tran_id: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    amount: {
      type: DataTypes.DOUBLE,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    tran_date: {
      type: DataTypes.DATE(6),
      allowNull: false
    },
    razorpay_payment_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: "UKd3puj6rxq7a5y4l1a6aqhn460"
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
    tableName: 'transactions',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "tran_id" },
        ]
      },
      {
        name: "UKd3puj6rxq7a5y4l1a6aqhn460",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "razorpay_payment_id" },
        ]
      },
      {
        name: "FKqwv7rmvc8va8rep7piikrojds",
        using: "BTREE",
        fields: [
          { name: "user_id" },
        ]
      },
    ]
  });
};
