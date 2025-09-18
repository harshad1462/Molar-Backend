const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('appointments', {
    appointment_id: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    amount: {
      type: DataTypes.DOUBLE,
      allowNull: false
    },
    city: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    description: {
      type: DataTypes.STRING(1000),
      allowNull: true
    },
    hospital_address: {
      type: DataTypes.STRING(512),
      allowNull: true
    },
    hospital_latitude: {
      type: DataTypes.DOUBLE,
      allowNull: false
    },
    hospital_longitude: {
      type: DataTypes.DOUBLE,
      allowNull: false
    },
    specialization: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('ACCEPT','CANCELLED','CANCLE','COMPLETED','REJECT','REQUESTED'),
      allowNull: true
    },
    time: {
      type: DataTypes.TIME,
      allowNull: false
    },
    treatment_type: {
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
    },
    host_user_id: {
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
    tableName: 'appointments',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "appointment_id" },
        ]
      },
      {
        name: "FKpp58gq2mq4ecsbwcbxvy49ank",
        using: "BTREE",
        fields: [
          { name: "doctor_user_id" },
        ]
      },
      {
        name: "FK6ilsv7ic9uhi8ur1kr3niye09",
        using: "BTREE",
        fields: [
          { name: "host_user_id" },
        ]
      },
    ]
  });
};
