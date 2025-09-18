const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('case_studies', {
    case_study_id: {
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
    tableName: 'case_studies',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "case_study_id" },
        ]
      },
      {
        name: "FKpel1nmltmnnc5ii3f76sty44f",
        using: "BTREE",
        fields: [
          { name: "user_id" },
        ]
      },
    ]
  });
};
