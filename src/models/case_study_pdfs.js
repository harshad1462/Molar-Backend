const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('case_study_pdfs', {
    case_study_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'case_studies',
        key: 'case_study_id'
      }
    },
    pdf_url: {
      type: DataTypes.STRING(512),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'case_study_pdfs',
    timestamps: false,
    id: false,
    indexes: [
      {
        name: "FKal1soneqgmrbahacg7y4pxjk9",
        using: "BTREE",
        fields: [
          { name: "case_study_id" },
        ]
      },
    ]
  });
};
