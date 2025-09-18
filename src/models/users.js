const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('users', {
    user_id: {
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
    dci_number: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: "UKla47ryhipctywq6l2a2404sr0"
    },
    dci_registration: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    degree_certificate: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: "UK6dotkott2kjsp8vw4d0m25fb7"
    },
    identity_proof: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    phone_number: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: "UKkwds03ohobcd8p6eowkw0f5bm"
    },
    profile_pic_url: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    qualification: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    role: {
      type: DataTypes.ENUM('ADMIN','DOCTOR','INTERN'),
      allowNull: true
    },
    specialization: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('ACTIVE','INACTIVE'),
      allowNull: true
    },
    username: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: "UKr43af9ap4edm43mmtq01oddj6"
    },
    area: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    city: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    pin_code: {
      type: DataTypes.STRING(7),
      allowNull: true
    },
    clinic_latitude: {
      type: DataTypes.DOUBLE,
      allowNull: true
    },
    clinic_longitude: {
      type: DataTypes.DOUBLE,
      allowNull: true
    },
    clinic_name: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'users',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "user_id" },
        ]
      },
      {
        name: "UKkwds03ohobcd8p6eowkw0f5bm",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "phone_number" },
        ]
      },
      {
        name: "UK6dotkott2kjsp8vw4d0m25fb7",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "UKla47ryhipctywq6l2a2404sr0",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "dci_number" },
        ]
      },
      {
        name: "UKr43af9ap4edm43mmtq01oddj6",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "username" },
        ]
      },
    ]
  });
};
