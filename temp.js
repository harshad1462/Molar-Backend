// controllers/clinicController.js
const sequelize = require('../config/database');
const initModels = require('../models/init-models');
const models = initModels(sequelize);

const clinic = models.clinics;
const user = models.users;

module.exports = {
  // ... YOUR EXISTING findByUserId METHOD STAYS HERE ...
  findByUserId: async (req, res) => {
    // YOUR EXISTING CODE - DON'T CHANGE
  },

  // ... YOUR EXISTING getUserClinicSummary METHOD STAYS HERE ...
  getUserClinicSummary: async (req, res) => {
    // YOUR EXISTING CODE - DON'T CHANGE
  },

  // ✅ ADD THIS - Add new clinic
  addClinic: async (req, res) => {
    try {
      const { userId } = req.params;
      const { clinic_name, address, area, city, pin_code, clinic_latitude, clinic_longitude, is_primary } = req.body;

      if (!clinic_name || !city) {
        return res.status(400).json({
          success: false,
          error: 'Clinic name and city are required'
        });
      }

      // If setting as primary, unset other primary clinics
      if (is_primary) {
        await clinic.update(
          { is_primary: false },
          { where: { user_id: userId, is_primary: true } }
        );
      }

      const newClinic = await clinic.create({
        user_id: userId,
        clinic_name,
        address,
        area,
        city,
        pin_code,
        clinic_latitude,
        clinic_longitude,
        is_primary: is_primary || false,
        status: 'ACTIVE',
        created_by: `user_${userId}`,
        created_date: new Date(),
        updated_by: `user_${userId}`,
        updated_date: new Date()
      });

      console.log(`✅ Clinic added: ${newClinic.clinic_name} for user ${userId}`);

      res.json({
        success: true,
        message: 'Clinic added successfully',
        data: {
          clinic_id: newClinic.clinic_id,
          clinic_name: newClinic.clinic_name,
          city: newClinic.city,
          is_primary: newClinic.is_primary
        }
      });
    } catch (error) {
      console.error('❌ Add clinic error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // ✅ ADD THIS - Update clinic
  updateClinic: async (req, res) => {
    try {
      const { clinicId } = req.params;
      const { clinic_name, address, area, city, pin_code, clinic_latitude, clinic_longitude, is_primary } = req.body;

      const existingClinic = await clinic.findByPk(clinicId);
      if (!existingClinic) {
        return res.status(404).json({
          success: false,
          error: 'Clinic not found'
        });
      }

      // If setting as primary, unset other primary clinics
      if (is_primary) {
        await clinic.update(
          { is_primary: false },
          { where: { user_id: existingClinic.user_id, is_primary: true } }
        );
      }

      await clinic.update({
        clinic_name: clinic_name || existingClinic.clinic_name,
        address: address || existingClinic.address,
        area: area || existingClinic.area,
        city: city || existingClinic.city,
        pin_code: pin_code || existingClinic.pin_code,
        clinic_latitude: clinic_latitude !== undefined ? clinic_latitude : existingClinic.clinic_latitude,
        clinic_longitude: clinic_longitude !== undefined ? clinic_longitude : existingClinic.clinic_longitude,
        is_primary: is_primary !== undefined ? is_primary : existingClinic.is_primary,
        updated_by: `user_${existingClinic.user_id}`,
        updated_date: new Date()
      }, {
        where: { clinic_id: clinicId }
      });

      const updatedClinic = await clinic.findByPk(clinicId);

      console.log(`✅ Clinic updated: ${updatedClinic.clinic_name}`);

      res.json({
        success: true,
        message: 'Clinic updated successfully',
        data: {
          clinic_id: updatedClinic.clinic_id,
          clinic_name: updatedClinic.clinic_name,
          city: updatedClinic.city,
          is_primary: updatedClinic.is_primary
        }
      });
    } catch (error) {
      console.error('❌ Update clinic error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // ✅ ADD THIS - Delete clinic
  deleteClinic: async (req, res) => {
    try {
      const { clinicId } = req.params;

      const existingClinic = await clinic.findByPk(clinicId);
      if (!existingClinic) {
        return res.status(404).json({
          success: false,
          error: 'Clinic not found'
        });
      }

      // Check if it's the only clinic
      const userClinics = await clinic.findAll({
        where: { user_id: existingClinic.user_id, status: 'ACTIVE' }
      });

      if (userClinics.length <= 1) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete the only clinic. Add another clinic first.'
        });
      }

      await clinic.update({
        status: 'INACTIVE',
        updated_by: `user_${existingClinic.user_id}`,
        updated_date: new Date()
      }, {
        where: { clinic_id: clinicId }
      });

      console.log(`✅ Clinic deleted: ${existingClinic.clinic_name}`);

      res.json({
        success: true,
        message: 'Clinic deleted successfully'
      });
    } catch (error) {
      console.error('❌ Delete clinic error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // ✅ ADD THIS - Set primary clinic
  setPrimaryClinic: async (req, res) => {
    try {
      const { clinicId } = req.params;

      const existingClinic = await clinic.findByPk(clinicId);
      if (!existingClinic) {
        return res.status(404).json({
          success: false,
          error: 'Clinic not found'
        });
      }

      // Unset all primary clinics for this user
      await clinic.update(
        { is_primary: false },
        { where: { user_id: existingClinic.user_id, is_primary: true } }
      );

      // Set this clinic as primary
      await clinic.update({
        is_primary: true,
        updated_by: `user_${existingClinic.user_id}`,
        updated_date: new Date()
      }, {
        where: { clinic_id: clinicId }
      });

      console.log(`✅ Primary clinic set: ${existingClinic.clinic_name}`);

      res.json({
        success: true,
        message: 'Primary clinic updated successfully'
      });
    } catch (error) {
      console.error('❌ Set primary clinic error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};

// Helper function stays the same
function buildFullAddress(clinic) {
  const addressParts = [
    clinic.address,
    clinic.area,
    clinic.city,
    clinic.pin_code
  ].filter(Boolean);
  
  return addressParts.join(', ');
}
