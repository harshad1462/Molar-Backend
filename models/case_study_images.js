const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('case_study_images', {
    case_study_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'case_studies',
        key: 'case_study_id'
      }
    },
    image_url: {
      type: DataTypes.STRING(512),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'case_study_images',
    timestamps: false,
    indexes: [
      {
        name: "FKimo80fk70jukh91nwxbcjfp6q",
        using: "BTREE",
        fields: [
          { name: "case_study_id" },
        ]
      },
    ]
  });
};
