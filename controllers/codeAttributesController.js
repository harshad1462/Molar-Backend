const sequelize = require('../config/database');
const initModels = require('../models/init-models');
const models = initModels(sequelize); // get the models object

const CodeAttributes = models.code_attributes; // Related model for attributes

// 


module.exports = {
  create: async (req, res) => {
    try {
      const codeAttr = await CodeAttributes.create(req.body);
      res.status(201).json(codeAttr);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  findAll: async (req, res) => {
    try {
      const codeAttrs = await CodeAttributes.findAll();
      res.json(codeAttrs);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  findOne: async (req, res) => {
    try {
      const id = req.params.id;
      const codeAttr = await CodeAttributes.findByPk(id);
      if (!codeAttr) return res.status(404).json({ error: 'Code Attribute not found' });
      res.json(codeAttr);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  update: async (req, res) => {
    try {
      const id = req.params.id;
      const updated = await CodeAttributes.update(req.body, { where: { serial_no: id } });
      if (updated[0] === 0) return res.status(404).json({ error: 'Code Attribute not found' });
      const updatedCodeAttr = await CodeAttributes.findByPk(id);
      res.json(updatedCodeAttr);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  delete: async (req, res) => {
    try {
      const id = req.params.id;
      const deleted = await CodeAttributes.destroy({ where: { serial_no: id } });
      if (deleted === 0) return res.status(404).json({ error: 'Code Attribute not found' });
      res.json({ message: 'Deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};
