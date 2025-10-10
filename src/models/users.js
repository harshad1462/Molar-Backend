const Sequelize = require('sequelize');
module.exports = function (sequelize, DataTypes) {
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
      allowNull: true
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
      allowNull: true
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
      type: DataTypes.ENUM('ADMIN', 'DOCTOR', 'INTERN'),
      allowNull: true
    },
    specialization: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'INACTIVE'),
      allowNull: true
    },
    username: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: "UKr43af9ap4edm43mmtq01oddj6"
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    has_subscription: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    identity_proof_status: {
      type: DataTypes.ENUM('PENDING', 'VERIFIED', 'REJECTED'),
      allowNull: true,
      defaultValue: 'PENDING'
    },
    degree_certificate_status: {
      type: DataTypes.ENUM('PENDING', 'VERIFIED', 'REJECTED'),
      allowNull: true,
      defaultValue: 'PENDING'
    },
    dci_registration_status: {
      type: DataTypes.ENUM('PENDING', 'VERIFIED', 'REJECTED'),
      allowNull: true,
      defaultValue: 'PENDING'
    },
    experience_letter: {
      type: DataTypes.STRING(500), 
      allowNull: true
    },
     fcm_token: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Firebase Cloud Messaging device token'
    },
    fcm_token_updated_at: {
      type: DataTypes.DATE(6),
      allowNull: true,
      comment: 'Last time FCM token was updated'
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
         {
        name: "idx_fcm_token",
        using: "BTREE",
        fields: [
          { name: "fcm_token" },
        ]
      }
    ]
  });
};
