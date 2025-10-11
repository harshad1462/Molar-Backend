const sequelize = require('../config/database');
const initModels = require('../models/init-models');
const { Op } = require('sequelize');

const models = initModels(sequelize);
const Users = models.users;

module.exports = {
  findAll: async (req, res) => {
    try {
      const { page = 1, limit = 10, search = '' } = req.query;
      const offset = (page - 1) * limit;
      
      let whereConditions = {};
      
      if (search) {
        whereConditions = {
          [Op.or]: [
            { name: { [Op.like]: `%${decodeURIComponent(search)}%` } },
            { email: { [Op.like]: `%${decodeURIComponent(search)}%` } },
            { phone_number: { [Op.like]: `%${decodeURIComponent(search)}%` } }
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
          'specialization',
          'created_date'
        ],
        order: [['created_date', 'DESC']], 
        limit: parseInt(limit),
        offset: offset,
        distinct: true
      });

      const mappedUsers = userData.rows.map(user => ({
        id: `MOLAR#${user.user_id}`,
        userId: user.user_id,
        name: user.name || 'N/A',
        role: user.role?.toLowerCase() || 'N/A',
        specialization: user.specialization || 'N/A',
        registrationDate: user.created_date ? new Date(user.created_date).toISOString().split('T')[0] : 'N/A',
        status: user.status?.toLowerCase() === 'active' ? 'active' : 'inactive',
        userProfilePic: user.profile_pic_url || null,
        email: user.email || 'N/A',
        phoneNumber: user.phone_number || 'N/A'
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
      res.status(500).json({ success: false, error: error.message });
    }
  },

//  findOne: async (req, res) => {
//   try {
//     const { id } = req.params;

//     const user = await Users.findByPk(id, {
//       attributes: [
//         'user_id',
//         'name',
//         'email', 
//         'phone_number',
//         'role',
//         'status',
//         'profile_pic_url',
//         'dci_number',
//         'dci_registration',
//         'degree_certificate',
//         'identity_proof',
//         'identity_proof_number',
//         'qualification',
//         'specialization',
//         'username',
//         'experience',
//         'is_verified',
//         'has_subscription',
//         'identity_proof_status',
//         'degree_certificate_status',
//         'dci_registration_status',
//         'created_date',
//         'updated_date'
//       ]
//     });

//     if (!user) {
//       return res.status(404).json({ success: false, error: 'User not found' });
//     }

//     const mappedUser = {
//       user_id: user.user_id,
//       id: user.user_id,
//       name: user.name,
//       email: user.email,
//       phone_number: user.phone_number,
//       phoneNumber: user.phone_number,
//       role: user.role?.toLowerCase(),
//       status: user.status,
//       profile_pic_url: user.profile_pic_url,
//       profileImage: user.profile_pic_url,
//       username: user.username,
//       qualification: user.qualification,
//       specialization: user.specialization,
//       experience: user.experience,
//       dci_number: user.dci_number,
//       dciNumber: user.dci_number,
//       identity_proof: user.identity_proof,
//       identityProof: user.identity_proof,
//       identity_proof_number: user.identity_proof_number,
//       identityProofNumber: user.identity_proof_number,
//       dci_registration: user.dci_registration,
//       degree_certificate: user.degree_certificate,
//       is_verified: user.is_verified,
//       isVerified: user.is_verified,
//       has_subscription: user.has_subscription,
//       hasSubscription: user.has_subscription,
//       identity_proof_status: user.identity_proof_status,
//       degree_certificate_status: user.degree_certificate_status,
//       dci_registration_status: user.dci_registration_status,
//       created_date: user.created_date,
//       updated_date: user.updated_date
//     };

//     res.json({ success: true, user: mappedUser });

//   } catch (error) {
//     console.error('Error fetching user:', error);
//     res.status(500).json({ success: false, error: error.message });
//   }
// },
findOne: async (req, res) => {
  try {
    const { id } = req.params;
    const Clinics = models.clinics; // Add this

    const user = await Users.findByPk(id, {
      attributes: [
        'user_id', 'name', 'email', 'phone_number', 'role', 'status',
        'profile_pic_url', 'dci_number', 'dci_registration',
        'degree_certificate', 'identity_proof', 'identity_proof_number',
        'qualification', 'specialization', 'username', 'experience',
        'is_verified', 'has_subscription',
        'identity_proof_status', 'degree_certificate_status', 'dci_registration_status',
        'created_date', 'updated_date'
      ]
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Fetch primary clinic if not intern
    let primaryClinic = null;
    if (user.role !== 'INTERN') {
      primaryClinic = await Clinics.findOne({
        where: { 
          user_id: id,
          is_primary: true,
          status: 'ACTIVE'
        },
        attributes: [
          'clinic_id', 'clinic_name', 'address', 'area', 
          'city', 'pin_code', 'clinic_latitude', 'clinic_longitude'
        ]
      });
    }

    const mappedUser = {
      user_id: user.user_id,
      id: `MOLAR#${user.user_id}`,
      name: user.name,
      email: user.email,
      phoneNumber: user.phone_number,
      role: user.role,
      status: user.status?.toLowerCase() === 'active' ? 'Active' : 'Inactive',
      userProfilePic: user.profile_pic_url,
      username: user.username,
      qualification: user.qualification || 'N/A',
      specialization: user.specialization || 'N/A',
      experience: user.experience || 'N/A',
      subscriptionStatus: user.has_subscription ? 'Active' : 'Inactive',
      
      // Documents with status
      documents: {
        identityProof: user.identity_proof,
        identityProofNumber: user.identity_proof_number || 'N/A',
        identityProofStatus: user.identity_proof_status,
        
        degreeCertificate: user.degree_certificate,
        degreeCertificateStatus: user.degree_certificate_status,
        
        dciNumber: user.dci_number || 'N/A',
        dciRegistration: user.dci_registration || 'N/A',
        dciRegistrationStatus: user.dci_registration_status
      },
      
      // Clinic details (only primary)
      clinicDetails: primaryClinic ? {
        clinicName: primaryClinic.clinic_name,
        address: primaryClinic.address,
        area: primaryClinic.area,
        city: primaryClinic.city,
        pinCode: primaryClinic.pin_code,
        latitude: primaryClinic.clinic_latitude || 'N/A',
        longitude: primaryClinic.clinic_longitude || 'N/A'
      } : null,
      
      timestamps: {
        created: user.created_date ? new Date(user.created_date).toLocaleString() : 'N/A',
        updated: user.updated_date ? new Date(user.updated_date).toLocaleString() : 'N/A'
      }
    };

    res.json({ success: true, data: mappedUser });

  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
},

updateProfile: async (req, res) => {
  try {
    const userId = req.params.id;
    
    const allowedFields = [
      'name',
      'email',
      'phone_number',
      'specialization',
      'qualification',
      'experience',
      'dci_number',
      'identity_proof',
      'identity_proof_number'
    ];

    const updateData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    updateData.updated_date = new Date();
    updateData.updated_by = req.body.updated_by || `user_${userId}`;

    console.log('Updating user:', userId, 'with data:', updateData);

    const [updatedRows] = await Users.update(updateData, {
      where: { user_id: userId }
    });

    if (updatedRows === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const updatedUser = await Users.findByPk(userId, {
      attributes: { exclude: ['password'] }
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
},
verifyDocument: async (req, res) => {
  try {
    const { userId, documentType, status } = req.body;
    
    // Validate input
    if (!userId || !documentType || !status) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // ✅ Allow all status transitions
    if (!['PENDING', 'VERIFIED', 'REJECTED'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be PENDING, VERIFIED, or REJECTED'
      });
    }

    // Map document type to status field
    const statusFieldMap = {
      'identity_proof': 'identity_proof_status',
      'degree_certificate': 'degree_certificate_status',
      'dci_registration': 'dci_registration_status'
    };

    const statusField = statusFieldMap[documentType];
    if (!statusField) {
      return res.status(400).json({
        success: false,
        error: 'Invalid document type'
      });
    }

    // Update document status
    const updateData = {
      [statusField]: status,
      updated_date: new Date(),
      updated_by: 'admin'
    };

    await Users.update(updateData, {
      where: { user_id: userId }
    });

    // Check if all documents are verified
    const user = await Users.findByPk(userId, {
      attributes: [
        'identity_proof_status',
        'degree_certificate_status',
        'dci_registration_status',
        'dci_number',
        'role',
        'is_verified'
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // ✅ Auto-verify user if all required documents are verified
    let shouldVerifyUser = false;
    
    if (user.role === 'INTERN') {
      shouldVerifyUser = 
        user.identity_proof_status === 'VERIFIED' &&
        user.degree_certificate_status === 'VERIFIED';
    } else if (user.role === 'DOCTOR') {
      shouldVerifyUser = 
        user.identity_proof_status === 'VERIFIED' &&
        user.degree_certificate_status === 'VERIFIED' &&
        (!user.dci_number || user.dci_registration_status === 'VERIFIED');
    }

    // ✅ Auto-unverify if any document is rejected or pending
    const hasRejectedOrPending = 
      user.identity_proof_status === 'REJECTED' ||
      user.degree_certificate_status === 'REJECTED' ||
      (user.dci_number && user.dci_registration_status === 'REJECTED') ||
      user.identity_proof_status === 'PENDING' ||
      user.degree_certificate_status === 'PENDING' ||
      (user.dci_number && user.dci_registration_status === 'PENDING');

    // Update is_verified status
    await Users.update(
      { 
        is_verified: shouldVerifyUser && !hasRejectedOrPending, 
        updated_date: new Date(),
        updated_by: 'admin'
      },
      { where: { user_id: userId } }
    );

    // Fetch updated user
    const updatedUser = await Users.findByPk(userId, {
      attributes: { exclude: ['password'] }
    });

    res.json({
      success: true,
      message: `Document status updated to ${status}`,
      data: {
        documentType,
        newStatus: status,
        isVerified: updatedUser.is_verified,
        statusChanged: true
      }
    });

  } catch (error) {
    console.error('Verify document error:', error);
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
