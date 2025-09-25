const sequelize = require('../config/database');
const initModels = require('../models/init-models');
const { Op } = require('sequelize');

const models = initModels(sequelize);
const Coupons = models.coupons;
const Users = models.users;

module.exports = {
  // Get all coupons with search and pagination
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
        const searchTerm = decodeURIComponent(search);
        whereConditions = {
          [Op.or]: [
            { coupon_name: { [Op.like]: `%${searchTerm}%` } },
            { coupon_code: { [Op.like]: `%${searchTerm}%` } }
          ]
        };
      }

      const couponData = await Coupons.findAndCountAll({
        where: whereConditions,
        order: [['created_date', 'DESC']], 
        limit: parseInt(limit),
        offset: offset,
        distinct: true
      });

      // Map the data to match frontend expectations
      const mappedCoupons = couponData.rows.map(coupon => ({
        id: `MOLAR#${coupon.coupon_id}`,
        couponId: coupon.coupon_id,
        couponName: coupon.coupon_name || 'N/A',
        couponCode: coupon.coupon_code || 'N/A',
        startDate: coupon.start_date ? coupon.start_date : 'N/A',
        endDate: coupon.end_date ? coupon.end_date : 'N/A',
        discountType: coupon.coupon_type || 'N/A',
        discountValue: coupon.discount_value || 0,
        remaining: coupon.remaining_coupon || 0,
        total: coupon.total_coupon || 0,
        status: coupon.is_active ? 'active' : 'inactive',
        specificUsers: coupon.specific_users || null,
        userCount: coupon.specific_users ? (Array.isArray(coupon.specific_users) ? coupon.specific_users.length : 0) : 0,
        minimumAmount: coupon.minimum_subscription_amt || 0,
        created_date: coupon.created_date,
        updated_date: coupon.updated_date
      }));

      res.json({
        success: true,
        data: mappedCoupons,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total: couponData.count,
          total_pages: Math.ceil(couponData.count / limit),
          from: offset + 1,
          to: Math.min(offset + parseInt(limit), couponData.count)
        }
      });

    } catch (error) {
      console.error('Error fetching coupons:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  },

  // Get single coupon by ID for editing
  findOne: async (req, res) => {
    try {
      const { id } = req.params;

      const coupon = await Coupons.findByPk(id);

      if (!coupon) {
        return res.status(404).json({ 
          success: false, 
          error: 'Coupon not found' 
        });
      }

      // Get user details if specific users are assigned
      let assignedUsers = [];
      if (coupon.specific_users && Array.isArray(coupon.specific_users) && coupon.specific_users.length > 0) {
        const users = await Users.findAll({
          where: {
            user_id: { [Op.in]: coupon.specific_users }
          },
          attributes: ['user_id', 'name', 'email']
        });
        
        assignedUsers = users.map(user => ({
          id: user.user_id,
          name: user.name,
          email: user.email,
          display: `${user.name} (${user.email})`
        }));
      }

      // Map the data to match frontend expectations
      const mappedCoupon = {
        id: `MOLAR#${coupon.coupon_id}`,
        couponId: coupon.coupon_id,
        couponName: coupon.coupon_name || '',
        couponCode: coupon.coupon_code || '',
        discountType: coupon.coupon_type === 'PERCENTAGE' ? 'Percentage' : 'Flat',
        discountValue: coupon.discount_value || 0,
        startDate: coupon.start_date || '',
        endDate: coupon.end_date || '',
        remaining: coupon.remaining_coupon || 0,
        total: coupon.total_coupon || 0,
        isActive: coupon.is_active || false,
        specificUsers: coupon.specific_users || null,
        assignedUsers: assignedUsers,
        customerEligibility: (coupon.specific_users && coupon.specific_users.length > 0) ? 'specific' : 'everyone',
        minimumAmount: coupon.minimum_subscription_amt || 0,
        created_date: coupon.created_date,
        updated_date: coupon.updated_date
      };

      res.json({
        success: true,
        data: mappedCoupon
      });

    } catch (error) {
      console.error('Error fetching coupon:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  },

  // Create new coupon
  create: async (req, res) => {
    try {
      const {
        couponName,
        couponCode,
        discountType,
        discountValue,
        offerStartDate,
        offerEndDate,
        usageLimit,
        customerEligibility,
        specificUsers,
        minimumAmount
      } = req.body;

      // Validate required fields
      if (!couponName || !couponCode || !discountType || !discountValue || !offerStartDate || !offerEndDate) {
        return res.status(400).json({
          success: false,
          error: 'All required fields must be provided'
        });
      }

      // Validate minimum amount
      const minAmount = minimumAmount ? parseFloat(minimumAmount) : 0;
      if (minAmount < 0) {
        return res.status(400).json({
          success: false,
          error: 'Minimum subscription amount cannot be negative'
        });
      }

      // Check if coupon code already exists
      const existingCoupon = await Coupons.findOne({
        where: { coupon_code: couponCode }
      });

      if (existingCoupon) {
        return res.status(400).json({
          success: false,
          error: 'Coupon code already exists'
        });
      }

      // Process specific users
      let specificUsersArray = null;
      if (customerEligibility === 'specific' && specificUsers && Array.isArray(specificUsers) && specificUsers.length > 0) {
        // Validate that all user IDs exist
        const userIds = specificUsers.filter(id => id && !isNaN(id)).map(id => parseInt(id));
        if (userIds.length > 0) {
          const existingUsers = await Users.findAll({
            where: { user_id: { [Op.in]: userIds } },
            attributes: ['user_id']
          });
          
          if (existingUsers.length !== userIds.length) {
            return res.status(400).json({
              success: false,
              error: 'Some selected users do not exist'
            });
          }
          
          specificUsersArray = userIds;
        }
      }

      // Map frontend values to database values
      const couponType = discountType === 'Percentage' ? 'PERCENTAGE' : 'FIXED_VALUE';
      const totalCoupons = usageLimit ? parseInt(usageLimit) : 1000;

      const newCoupon = await Coupons.create({
        coupon_name: couponName,
        coupon_code: couponCode,
        coupon_type: couponType,
        discount_value: parseFloat(discountValue),
        start_date: offerStartDate,
        end_date: offerEndDate,
        is_active: true,
        minimum_subscription_amt: minAmount,
        remaining_coupon: totalCoupons,
        total_coupon: totalCoupons,
        specific_users: specificUsersArray,
        created_by: 'admin',
        created_date: new Date(),
        updated_by: 'admin',
        updated_date: new Date()
      });

      res.json({
        success: true,
        message: 'Coupon created successfully',
        data: {
          id: `MOLAR#${newCoupon.coupon_id}`,
          couponId: newCoupon.coupon_id,
          couponName: newCoupon.coupon_name,
          couponCode: newCoupon.coupon_code
        }
      });

    } catch (error) {
      console.error('Error creating coupon:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  },

  // Update coupon
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        couponName,
        couponCode,
        discountType,
        discountValue,
        offerStartDate,
        offerEndDate,
        usageLimit,
        isActive,
        customerEligibility,
        specificUsers,
        minimumAmount
      } = req.body;

      // Validate required fields
      if (!couponName || !couponCode || !discountType || !discountValue || !offerStartDate || !offerEndDate) {
        return res.status(400).json({
          success: false,
          error: 'All required fields must be provided'
        });
      }

      // Validate minimum amount
      const minAmount = minimumAmount ? parseFloat(minimumAmount) : 0;
      if (minAmount < 0) {
        return res.status(400).json({
          success: false,
          error: 'Minimum subscription amount cannot be negative'
        });
      }

      // Check if coupon exists
      const existingCoupon = await Coupons.findByPk(id);
      if (!existingCoupon) {
        return res.status(404).json({
          success: false,
          error: 'Coupon not found'
        });
      }

      // Check if coupon code already exists for other coupons
      const duplicateCoupon = await Coupons.findOne({
        where: { 
          coupon_code: couponCode,
          coupon_id: { [Op.ne]: id }
        }
      });

      if (duplicateCoupon) {
        return res.status(400).json({
          success: false,
          error: 'Coupon code already exists'
        });
      }

      // Process specific users
      let specificUsersArray = null;
      if (customerEligibility === 'specific' && specificUsers && Array.isArray(specificUsers) && specificUsers.length > 0) {
        const userIds = specificUsers.filter(id => id && !isNaN(id)).map(id => parseInt(id));
        if (userIds.length > 0) {
          const existingUsers = await Users.findAll({
            where: { user_id: { [Op.in]: userIds } },
            attributes: ['user_id']
          });
          
          if (existingUsers.length !== userIds.length) {
            return res.status(400).json({
              success: false,
              error: 'Some selected users do not exist'
            });
          }
          
          specificUsersArray = userIds;
        }
      }

      // Map frontend values to database values
      const couponType = discountType === 'Percentage' ? 'PERCENTAGE' : 'FIXED_VALUE';
      const totalCoupons = usageLimit ? parseInt(usageLimit) : existingCoupon.total_coupon;

      const updateData = {
        coupon_name: couponName,
        coupon_code: couponCode,
        coupon_type: couponType,
        discount_value: parseFloat(discountValue),
        start_date: offerStartDate,
        end_date: offerEndDate,
        is_active: isActive !== undefined ? isActive : existingCoupon.is_active,
        minimum_subscription_amt: minAmount,
        total_coupon: totalCoupons,
        remaining_coupon: usageLimit ? Math.max(0, parseInt(usageLimit) - (existingCoupon.total_coupon - existingCoupon.remaining_coupon)) : existingCoupon.remaining_coupon,
        specific_users: specificUsersArray,
        updated_by: 'admin',
        updated_date: new Date()
      };

      await Coupons.update(updateData, {
        where: { coupon_id: id }
      });

      res.json({
        success: true,
        message: 'Coupon updated successfully',
        data: {
          id: `MOLAR#${id}`,
          couponId: id,
          couponName: updateData.coupon_name,
          couponCode: updateData.coupon_code
        }
      });

    } catch (error) {
      console.error('Error updating coupon:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  },

  // Rest of the methods remain the same...
  searchUsers: async (req, res) => {
    try {
      const { search = '' } = req.query;

      if (!search || search.length < 2) {
        return res.json({
          success: true,
          data: []
        });
      }

      const searchTerm = decodeURIComponent(search);
      
      const users = await Users.findAll({
        where: {
          name: { [Op.like]: `%${searchTerm}%` }
        },
        attributes: ['user_id', 'name', 'email'],
        limit: 20,
        order: [['name', 'ASC']]
      });

      const mappedUsers = users.map(user => ({
        id: user.user_id,
        name: user.name,
        email: user.email,
        display: `${user.name} (${user.email})`
      }));

      res.json({
        success: true,
        data: mappedUsers
      });

    } catch (error) {
      console.error('Error searching users:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  },

  updateStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      const [updatedRows] = await Coupons.update(
        {
          is_active: isActive,
          updated_by: 'admin',
          updated_date: new Date()
        },
        {
          where: { coupon_id: id }
        }
      );

      if (updatedRows === 0) {
        return res.status(404).json({
          success: false,
          error: 'Coupon not found'
        });
      }

      res.json({
        success: true,
        message: 'Coupon status updated successfully'
      });

    } catch (error) {
      console.error('Error updating coupon status:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  },

  delete: async (req, res) => {
    try {
      const { id } = req.params;
      const { confirmationName } = req.body;

      // Find the coupon first
      const coupon = await Coupons.findByPk(id);
      
      if (!coupon) {
        return res.status(404).json({
          success: false,
          error: 'Coupon not found'
        });
      }

      // Verify confirmation name matches
      if (confirmationName !== coupon.coupon_name) {
        return res.status(400).json({
          success: false,
          error: 'Confirmation name does not match coupon name'
        });
      }

      // Delete the coupon
      await Coupons.destroy({
        where: { coupon_id: id }
      });

      res.json({
        success: true,
        message: 'Coupon deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting coupon:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  },

  getAvailableForUser: async (req, res) => {
    try {
      const { userId } = req.params;

      const coupons = await Coupons.findAll({
        where: {
          is_active: true,
          start_date: { [Op.lte]: new Date() },
          end_date: { [Op.gte]: new Date() },
          remaining_coupon: { [Op.gt]: 0 },
          [Op.or]: [
            { specific_users: null },
            sequelize.literal(`JSON_CONTAINS(specific_users, '${userId}')`)
          ]
        },
        order: [['created_date', 'DESC']]
      });

      const mappedCoupons = coupons.map(coupon => ({
        id: `MOLAR#${coupon.coupon_id}`,
        couponId: coupon.coupon_id,
        couponName: coupon.coupon_name,
        couponCode: coupon.coupon_code,
        discountType: coupon.coupon_type,
        discountValue: coupon.discount_value,
        endDate: coupon.end_date,
        minimumAmount: coupon.minimum_subscription_amt
      }));

      res.json({
        success: true,
        data: mappedCoupons
      });

    } catch (error) {
      console.error('Error fetching user-available coupons:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
};
