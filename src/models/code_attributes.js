const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('code_attributes', {
    serial_no: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    created_by: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    created_date: {
      type: DataTypes.DATE(6),
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false
    },
    updated_by: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    updated_date: {
      type: DataTypes.DATE(6),
      allowNull: true
    },
    code: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    status: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    group_code_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: 'group_code',
        key: 'group_code_id'
      }
    }
  }, {
    sequelize,
    tableName: 'code_attributes',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "serial_no" },
        ]
      },
      {
        name: "FK16r1yo1dxubruq85o3i6y7quu",
        using: "BTREE",
        fields: [
          { name: "group_code_id" },
        ]
      },
    ]
  });
};
