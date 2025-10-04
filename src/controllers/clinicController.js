// controllers/clinicController.js - Only these two methods
const sequelize = require('../config/database');
const initModels = require('../models/init-models');
const models = initModels(sequelize);

const clinic = models.clinics;     // Main clinic model
const user = models.users;        // User model (if needed for validation)

module.exports = {
  // Get clinics by user ID - Main endpoint for React Native
  findByUserId: async (req, res) => {
    try {
      const { userId } = req.params;
      
      console.log(`🔍 Getting clinics for user ID: ${userId}`);
      
      // Validate userId parameter
      if (!userId || isNaN(parseInt(userId))) {
        return res.status(400).json({
          success: false,
          error: 'Valid user ID is required'
        });
      }

      const userIdInt = parseInt(userId);

      // Query clinics with specific conditions matching your Sequelize model
      const userClinics = await clinic.findAll({
        where: {
          user_id: userIdInt,
          status: 'ACTIVE' // Only active clinics
        },
        attributes: [
          'clinic_id',
          'clinic_name',
          'area',
          'city',
          'pin_code',
          'clinic_latitude',
          'clinic_longitude',
          'address',
          'is_primary',
          'status',
          'created_date',
          'updated_date'
        ],
        order: [
          ['is_primary', 'DESC'], // Primary clinic first
          ['created_date', 'ASC']  // Then by creation date
        ]
      });

      console.log(`✅ Found ${userClinics.length} clinics for user ${userId}`);

      // Format the response data for React Native
      const formattedClinics = userClinics.map(clinic => {
        const clinicData = clinic.toJSON(); // Convert Sequelize instance to plain object
        
        return {
          clinic_id: clinicData.clinic_id,
          clinic_name: clinicData.clinic_name,
          area: clinicData.area,
          city: clinicData.city,
          pin_code: clinicData.pin_code,
          clinic_latitude: clinicData.clinic_latitude,
          clinic_longitude: clinicData.clinic_longitude,
          address: clinicData.address,
          is_primary: clinicData.is_primary,
          status: clinicData.status,
          created_date: clinicData.created_date,
          updated_date: clinicData.updated_date,
          // Additional computed fields for React Native
          fullAddress: buildFullAddress(clinicData),
          displayName: clinicData.is_primary ? 
            `${clinicData.clinic_name} (Primary)` : 
            clinicData.clinic_name,
          location: {
            latitude: clinicData.clinic_latitude,
            longitude: clinicData.clinic_longitude
          },
          hasLocation: !!(clinicData.clinic_latitude && clinicData.clinic_longitude)
        };
      });

      // Find primary clinic
      const primaryClinic = formattedClinics.find(clinic => clinic.is_primary);

      // Success response
      res.json({
        success: true,
        data: formattedClinics,
        message: `Found ${formattedClinics.length} active clinic${formattedClinics.length !== 1 ? 's' : ''}`,
        meta: {
          total: formattedClinics.length,
          primaryClinic: primaryClinic ? {
            id: primaryClinic.clinic_id,
            name: primaryClinic.clinic_name,
            city: primaryClinic.city
          } : null,
          hasMultipleClinics: formattedClinics.length > 1,
          cities: [...new Set(formattedClinics.map(clinic => clinic.city).filter(Boolean))],
          userId: userIdInt
        }
      });

    } catch (error) {
      console.error('❌ Error fetching user clinics:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to fetch clinics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

getUserClinicSummary: async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`🔍 Getting clinic summary for user ID: ${userId}`);
    
    // Validate userId parameter
    if (!userId || isNaN(parseInt(userId))) {
      return res.status(400).json({
        success: false,
        error: 'Valid user ID is required'
      });
    }

    const userIdInt = parseInt(userId);

    // Get count and basic clinic info - only clinic_id and clinic_name
    const summary = await clinic.findAndCountAll({
      where: {
        user_id: userIdInt,
        status: 'ACTIVE'
      },
      attributes: [
        'clinic_id',
        'clinic_name',
        'is_primary'  // Keep this for identifying primary clinic
      ],
      order: [
        ['is_primary', 'DESC'],
        ['clinic_name', 'ASC']
      ]
    });

    // Extract primary clinic
    const primaryClinic = summary.rows.find(clinic => clinic.is_primary);
    
    console.log(`✅ Clinic summary: ${summary.count} clinics, Primary: ${primaryClinic?.clinic_name || 'None'}`);

    // Return simplified summary data with only id and name
    res.json({
      success: true,
      data: {
        totalClinics: summary.count,
        primaryClinic: primaryClinic ? {
          id: primaryClinic.clinic_id,
          name: primaryClinic.clinic_name
        } : null,
        clinics: summary.rows.map(clinic => ({
          id: clinic.clinic_id,
          name: clinic.clinic_name
        }))
      },
      message: `Summary for ${summary.count} clinic${summary.count !== 1 ? 's' : ''}`
    });

  } catch (error) {
    console.error('❌ Error fetching clinic summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch clinic summary',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}
};

// Helper function to build full address
function buildFullAddress(clinic) {
  const addressParts = [
    clinic.address,
    clinic.area,
    clinic.city,
    clinic.pin_code
  ].filter(Boolean);
  
  return addressParts.join(', ');
}
