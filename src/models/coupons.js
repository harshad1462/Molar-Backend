const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('coupons', {
    coupon_id: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    coupon_code: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    coupon_name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    coupon_type: {
      type: DataTypes.ENUM('FIXED_VALUE','PERCENTAGE'),
      allowNull: true
    },
    discount_value: {
      type: DataTypes.DOUBLE,
      allowNull: true
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    minimum_subscription_amt: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    remaining_coupon: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    total_coupon: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    specific_users: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of user IDs when coupon is for specific users only. NULL = everyone can use'
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
    tableName: 'coupons',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "coupon_id" },
        ]
      },
    ]
  });
};
