const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('coupon_usage', {
    id: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    coupon_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'coupons',
        key: 'coupon_id'
      }
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      }
    }
  }, {
    sequelize,
    tableName: 'coupon_usage',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "FKof9h3rw1vu403j5dbehr45ts2",
        using: "BTREE",
        fields: [
          { name: "coupon_id" },
        ]
      },
      {
        name: "FKcsx5pbxjnp6jvuveb3lxyklhe",
        using: "BTREE",
        fields: [
          { name: "user_id" },
        ]
      },
    ]
  });
};
