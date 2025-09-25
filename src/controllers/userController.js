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
  }
};
