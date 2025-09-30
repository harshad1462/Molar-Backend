const sequelize = require('../config/database');
// const initModels = require('../src/models/init-models');
const initModels = require('../models/init-models');

const models = initModels(sequelize); // get the models object

const CodeAttributes = models.code_attributes; // Related model for attributes

// 


module.exports = {
  create: async (req, res) => {
    try {
      // Check if code already exists in the same group
      const existingCode = await CodeAttributes.findOne({
        where: { 
          code: req.body.code,
          group_code_id: req.body.group_code_id 
        }
      });

      if (existingCode) {
        return res.status(409).json({ 
          error: 'Code already exists in this group',
          field: 'code',
          type: 'duplicate' 
        });
      }

      const dataToCreate = {
        ...req.body,
        created_by: 'admin',
        updated_date: new Date().toISOString(),
        updated_by: 'admin',
        is_active: req.body.is_active !== undefined ? req.body.is_active : true
      };
      
      const codeAttr = await CodeAttributes.create(dataToCreate);
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
findByGroupCodeId: async (req, res) => {
  try {
    // console.log('findByGroupCodeId called with group_code_id:', req.params.group_code_id);
    const groupCodeId = req.params.group_code_id;
    const codeAttrs = await CodeAttributes.findAll({
      where: { group_code_id: groupCodeId },
    });
    // console.log('Found attributes:', codeAttrs.length);
    res.json(codeAttrs);
  } catch (error) {
    console.error('Error in findByGroupCodeId:', error);
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
      
      // Check if code already exists in the same group (excluding current record)
      const existingCode = await CodeAttributes.findOne({
        where: { 
          code: req.body.code,
          group_code_id: req.body.group_code_id,
          serial_no: { [sequelize.Op.ne]: id } // Exclude current record
        }
      });

      if (existingCode) {
        return res.status(409).json({ 
          error: 'Code already exists in this group',
          field: 'code',
          type: 'duplicate' 
        });
      }

      const dataToUpdate = {
        ...req.body,
        updated_date: new Date().toISOString(),
        updated_by: 'admin'
      };
      
      const updated = await CodeAttributes.update(dataToUpdate, { where: { serial_no: id } });
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
  toggleStatus: async (req, res) => {
    try {
      const id = req.params.id;
      
      // First get current record
      const currentRecord = await CodeAttributes.findByPk(id);
      if (!currentRecord) {
        return res.status(404).json({ error: 'Code Attribute not found' });
      }

      // Toggle the status
      const newStatus = currentRecord.is_active ? false : true;
      const newStatusText = newStatus ? 'active' : 'inactive';

      const dataToUpdate = {
        is_active: newStatus,
        status: newStatusText,
        updated_date: new Date().toISOString(),
        updated_by: 'admin'
      };
      
      const updated = await CodeAttributes.update(dataToUpdate, { where: { serial_no: id } });
      if (updated[0] === 0) {
        return res.status(404).json({ error: 'Code Attribute not found' });
      }
      
      const updatedCodeAttr = await CodeAttributes.findByPk(id);
      res.json({
        success: true,
        message: 'Status updated successfully',
        data: updatedCodeAttr
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: 'Failed to toggle status',
        details: error.message 
      });
    }
  },

};
