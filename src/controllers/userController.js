const sequelize = require('../config/database');
const initModels = require('../models/init-models');
const { Op } = require('sequelize');

const models = initModels(sequelize);
const Users = models.users;

module.exports = {
  // Get all users with search and pagination
  findAll: async (req, res) => {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search = ''
      } = req.query;

      const offset = (page - 1) * limit;
      
      // Build search conditions
      let whereConditions = {};
      
      if (search) {
        whereConditions = {
          [Op.or]: [
            { name: { [Op.like]: `%${decodeURIComponent(search)}%` } },
            { email: { [Op.like]: `%${decodeURIComponent(search)}%` } },
            { clinic_name: { [Op.like]: `%${decodeURIComponent(search)}%` } }
          ]
        };
      }

      const userData = await Users.findAndCountAll({
        where: whereConditions,
        attributes: [
          'user_id',
          'name', 
          'role',
          'email',
          'phone_number',
          'status',
          'profile_pic_url',
          'clinic_name',
          'area',
          'city',
          'created_date'
        ],
        order: [['created_date', 'DESC']], 
        limit: parseInt(limit),
        offset: offset,
        distinct: true
      });

      // Map the data to match frontend expectations
      const mappedUsers = userData.rows.map(user => ({
        id: `MOLAR#${user.user_id}`,
        userId: user.user_id,
        name: user.name || 'N/A',
        role: user.role?.toLowerCase() || 'N/A',
        address: `${user.area || ''} ${user.city || ''}`.trim() || 'N/A',
        registrationDate: user.created_date ? new Date(user.created_date).toISOString().split('T')[0] : 'N/A',
        status: user.status?.toLowerCase() === 'active' ? 'active' : 'inactive',
        userProfilePic: user.profile_pic_url || 'https://via.placeholder.com/80',
        email: user.email || 'N/A',
        phoneNumber: user.phone_number || 'N/A',
        clinicName: user.clinic_name || 'N/A'
      }));

      res.json({
        success: true,
        data: mappedUsers,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total: userData.count,
          total_pages: Math.ceil(userData.count / limit),
          from: offset + 1,
          to: Math.min(offset + parseInt(limit), userData.count)
        }
      });

    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  },

  // Get single user by ID
  findOne: async (req, res) => {
    try {
      const { id } = req.params;

      const user = await Users.findByPk(id, {
        attributes: [
          'user_id',
          'name',
          'email', 
          'phone_number',
          'role',
          'status',
          'profile_pic_url',
          'dci_number',
          'dci_registration',
          'degree_certificate',
          'identity_proof',
          'qualification',
          'specialization',
          'username',
          'clinic_name',
          'area',
          'city',
          'pin_code',
          'clinic_latitude',
          'clinic_longitude',
          'created_date',
          'updated_date'
        ]
      });

      if (!user) {
        return res.status(404).json({ 
          success: false, 
          error: 'User not found' 
        });
      }

      // Map the data to match frontend expectations
      const mappedUser = {
        id: `MOLAR#${user.user_id}`,
        userId: user.user_id,
        userProfilePic: user.profile_pic_url || 'https://via.placeholder.com/80',
        name: user.name || 'N/A',
        email: user.email || 'N/A',
        phoneNumber: user.phone_number || 'N/A',
        role: user.role || 'N/A',
        Status: user.status === 'ACTIVE' ? 'Active' : 'Inactive',
        username: user.username || 'N/A',
        qualification: user.qualification || 'N/A',
        specialization: user.specialization || 'N/A',
        documents: {
          dciNumber: user.dci_number || 'N/A',
          dciRegistration: user.dci_registration || 'N/A',
          degreeCertificate: user.degree_certificate || 'https://via.placeholder.com/100',
          identityProof: user.identity_proof || 'https://via.placeholder.com/100'
        },
        clinicDetails: {
          clinicName: user.clinic_name || 'N/A',
          area: user.area || 'N/A',
          city: user.city || 'N/A',
          pinCode: user.pin_code || 'N/A',
          latitude: user.clinic_latitude || 'N/A',
          longitude: user.clinic_longitude || 'N/A',
          address: `${user.area || ''} ${user.city || ''} ${user.pin_code || ''}`.trim() || 'N/A'
        },
        timestamps: {
          created: user.created_date ? new Date(user.created_date).toLocaleString() : 'N/A',
          updated: user.updated_date ? new Date(user.updated_date).toLocaleString() : 'N/A'
        }
      };

      res.json({
        success: true,
        data: mappedUser
      });

    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  },

    // Add this to your userController.js
updateProfile: async (req, res) => {
  try {
    const userId = req.params.id;
    const updateData = {
      ...req.body,
      updated_date: new Date()
    };

    const [updatedRows] = await Users.update(updateData, {
      where: { user_id: userId }
    });

    if (updatedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const updatedUser = await Users.findByPk(userId, {
      attributes: { exclude: ['password'] } // Don't return password
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
},

  updateFCMToken: async (req, res) => {
    try {
      const { fcm_token, token_type, user_id } = req.body;
      const userId = user_id || req.user?.userId || req.params.id;

      console.log(`📱 Updating push token for user ${userId}`);
      console.log(`Token type: ${token_type || 'EXPO'}`);

      // Validate token
      if (!fcm_token) {
        return res.status(400).json({
          success: false,
          error: 'Push token is required'
        });
      }

      // Validate user exists
      const user = await Users.findByPk(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Update token in database
      await Users.update(
        {
          fcm_token: fcm_token,
          fcm_token_updated_at: new Date()
        },
        {
          where: { user_id: userId }
        }
      );

      console.log(`✅ Push token updated for user ${userId}`);
      console.log(`Token preview: ${fcm_token.substring(0, 30)}...`);

      res.json({
        success: true,
        message: 'Push token updated successfully',
        data: {
          user_id: userId,
          token_updated: true,
          updated_at: new Date()
        }
      });

    } catch (error) {
      console.error('❌ Error updating push token:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update push token',
        details: error.message
      });
    }
  },

  /**
   * Delete FCM token (for logout)
   */
  deleteFCMToken: async (req, res) => {
    try {
      const userId = req.body.user_id || req.user?.userId || req.params.id;

      await Users.update(
        {
          fcm_token: null,
          fcm_token_updated_at: new Date()
        },
        {
          where: { user_id: userId }
        }
      );

      console.log(`🗑️ Push token deleted for user ${userId}`);

      res.json({
        success: true,
        message: 'Push token deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting push token:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * Get users with push tokens (for testing)
   */
  getUsersWithTokens: async (req, res) => {
    try {
      const { role } = req.query;

      let whereConditions = {
        fcm_token: { [Op.ne]: null }
      };

      if (role) {
        whereConditions.role = role.toUpperCase();
      }

      const users = await Users.findAll({
        where: whereConditions,
        attributes: [
          'user_id',
          'name',
          'email',
          'role',
          'fcm_token',
          'fcm_token_updated_at'
        ],
        order: [['fcm_token_updated_at', 'DESC']]
      });

      res.json({
        success: true,
        count: users.length,
        data: users.map(user => ({
          user_id: user.user_id,
          name: user.name,
          email: user.email,
          role: user.role,
          has_token: !!user.fcm_token,
          token_preview: user.fcm_token ? user.fcm_token.substring(0, 30) + '...' : null,
          token_updated_at: user.fcm_token_updated_at
        }))
      });

    } catch (error) {
      console.error('Error fetching users with tokens:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

};
