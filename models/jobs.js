const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('jobs', {
    job_id: {
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
    updated_by: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    updated_date: {
      type: DataTypes.DATE(6),
      allowNull: true
    },
    description: {
      type: DataTypes.STRING(1000),
      allowNull: true
    },
    experience: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    qualification: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    specification: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    doctor_user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      }
    }
  }, {
    sequelize,
    tableName: 'jobs',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "job_id" },
        ]
      },
      {
        name: "FK5n5upn226n01vgcglemiujrct",
        using: "BTREE",
        fields: [
          { name: "doctor_user_id" },
        ]
      },
    ]
  });
};
