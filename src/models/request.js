const Sequelize = require('sequelize');

module.exports = function(sequelize, DataTypes) {
  const Request = sequelize.define('requests', {
    request_id: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    specialization: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    requirements: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    clinic_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'clinics',
        key: 'clinic_id'
      }
    },
    duration_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Duration in minutes (e.g., 20, 50)'
    },
    request_datetime: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Date and time when doctor is required'
    },
    offering_rupees: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Amount offered in rupees'
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'ACCEPTED', 'CONFIRMED', 'CANCELLED', 'STARTED', 'COMPLETED'),
      allowNull: false,
      defaultValue: 'PENDING'
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      },
      comment: 'User who created the request (clinic owner)'
    },
    sent_to_user_ids: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of user IDs to whom this request was sent'
    },
    accepted_by_user_ids: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of user IDs who accepted this request'
    },
    assigned_doctor_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      },
      comment: 'Doctor assigned to fulfill the request (final selected doctor)'
    },
    created_by: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    created_date: {
      type: DataTypes.DATE(6),
      allowNull: false,
      defaultValue: DataTypes.NOW
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
    tableName: 'requests',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "request_id" }
        ]
      },
      {
        name: "idx_clinic_id",
        using: "BTREE",
        fields: [
          { name: "clinic_id" }
        ]
      },
      {
        name: "idx_user_id",
        using: "BTREE",
        fields: [
          { name: "user_id" }
        ]
      },
      {
        name: "idx_assigned_doctor_id",
        using: "BTREE",
        fields: [
          { name: "assigned_doctor_id" }
        ]
      },
      {
        name: "idx_status",
        using: "BTREE",
        fields: [
          { name: "status" }
        ]
      },
      {
        name: "idx_specialization",
        using: "BTREE",
        fields: [
          { name: "specialization" }
        ]
      },
      {
        name: "idx_request_datetime",
        using: "BTREE",
        fields: [
          { name: "request_datetime" }
        ]
      },
      {
        name: "idx_status_datetime",
        using: "BTREE",
        fields: [
          { name: "status" },
          { name: "request_datetime" }
        ]
      },
      {
        name: "idx_created_date",
        using: "BTREE",
        fields: [
          { name: "created_date" }
        ]
      },
      {
        name: "idx_created_by",
        using: "BTREE",
        fields: [
          { name: "created_by" }
        ]
      }
    ]
  });

  // Define associations
  Request.associate = function(models) {
    // Request belongs to a clinic
    Request.belongsTo(models.Clinic, {
      foreignKey: 'clinic_id',
      as: 'clinic'
    });

    // Request belongs to a user (clinic owner who created it)
    Request.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'creator'
    });

    // Request belongs to assigned doctor
    Request.belongsTo(models.User, {
      foreignKey: 'assigned_doctor_id',
      as: 'assignedDoctor'
    });
  };

  // Instance methods
  Request.prototype.addAcceptedUser = function(userId) {
    const acceptedUsers = this.accepted_by_user_ids || [];
    if (!acceptedUsers.includes(userId)) {
      acceptedUsers.push(userId);
      this.accepted_by_user_ids = acceptedUsers;
    }
    return this;
  };

  Request.prototype.removeAcceptedUser = function(userId) {
    const acceptedUsers = this.accepted_by_user_ids || [];
    this.accepted_by_user_ids = acceptedUsers.filter(id => id !== userId);
    return this;
  };

  Request.prototype.hasUserAccepted = function(userId) {
    const acceptedUsers = this.accepted_by_user_ids || [];
    return acceptedUsers.includes(userId);
  };

  Request.prototype.getAcceptedUsersCount = function() {
    const acceptedUsers = this.accepted_by_user_ids || [];
    return acceptedUsers.length;
  };

  Request.prototype.wasSentToUser = function(userId) {
    const sentToUsers = this.sent_to_user_ids || [];
    return sentToUsers.includes(userId);
  };

  return Request;
};
