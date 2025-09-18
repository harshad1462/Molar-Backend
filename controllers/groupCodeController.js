const sequelize = require('../config/database');
const initModels = require('../models/init-models');
const models = initModels(sequelize); // get the models object

const group_code = models.group_code;         // Main model for group codes
const code_attributes = models.code_attributes; // Related model for attributes

module.exports = {
  // Create a new group code
  create: async (req, res) => {
    try {
      const newGroupCode = await group_code.create(req.body);
      res.status(201).json(newGroupCode);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Get all group codes
  findAll: async (req, res) => {
    try {
      const groupCodes = await group_code.findAll();
      res.json(groupCodes);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Get single group code by ID including related code attributes 
  findOneWithAttributes: async (req, res) => {
    try {
      const id = req.params.id;
      const groupCode = await group_code.findByPk(id, {
        include: [{
          model: code_attributes,
          as: 'code_attributes', // this must match association alias in initModels.js
        }],
      });
      if (!groupCode) return res.status(404).json({ error: 'Group Code not found' });
      res.json(groupCode);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Update a group code by ID
  update: async (req, res) => {
    try {
      const id = req.params.id;
      const updated = await group_code.update(req.body, { where: { group_code_id: id } });
      if (updated[0] === 0) return res.status(404).json({ error: 'Group Code not found' });
      const updatedGroupCode = await group_code.findByPk(id);
      res.json(updatedGroupCode);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Delete a group code by ID
  delete: async (req, res) => {
    try {
      const id = req.params.id;
      const deleted = await group_code.destroy({ where: { group_code_id: id } });
      if (deleted === 0) return res.status(404).json({ error: 'Group Code not found' });
      res.json({ message: 'Deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};
