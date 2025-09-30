const sequelize = require('../config/database');
const initModels = require('../models/init-models');
const { Op } = require('sequelize');

const models = initModels(sequelize);
const Subscribers = models.subscribers;
const Users = models.users;
const Packages = models.packages;

module.exports = {
  // Get all subscribers with user and package details
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
      let userWhereConditions = {};
      
      if (search) {
        userWhereConditions = {
          name: { [Op.like]: `%${decodeURIComponent(search)}%` }
        };
      }

      const subscriberData = await Subscribers.findAndCountAll({
        where: whereConditions,
        include: [
          {
            model: Users,
            as: 'user', 
            attributes: ['user_id', 'name', 'email'],
            where: Object.keys(userWhereConditions).length > 0 ? userWhereConditions : undefined
          },
          {
            model: Packages,
            as: 'package',
            attributes: ['package_id', 'package_name', 'price', 'duration_days', 'status']
          }
        ],
        order: [['created_date', 'DESC']], 
        limit: parseInt(limit),
        offset: offset,
        distinct: true
      });

      // Function to calculate days remaining
      const calculateDaysRemaining = (endDate) => {
        if (!endDate) return { daysRemaining: 0, isExpired: true };
        
        const today = new Date();
        const expiry = new Date(endDate);
        
        // Set both dates to start of day for accurate comparison
        today.setHours(0, 0, 0, 0);
        expiry.setHours(0, 0, 0, 0);
        
        // Calculate difference in milliseconds
        const diffTime = expiry.getTime() - today.getTime();
        
        // Convert to days (86400000 ms = 1 day)
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return {
          daysRemaining: Math.max(0, diffDays), // Don't show negative days
          isExpired: diffDays < 0,
          isToday: diffDays === 0,
          isExpiringSoon: diffDays > 0 && diffDays <= 7 // Expires in 7 days or less
        };
      };

      // Map the data to match frontend expectations
      const mappedSubscribers = subscriberData.rows.map(subscriber => {
        const daysInfo = calculateDaysRemaining(subscriber.end_date);
        
        return {
          id: `MOLAR#${subscriber.subscriber_id}`,
          subscriberId: subscriber.subscriber_id,
          name: subscriber.user?.name || 'Unknown User',
          email: subscriber.user?.email || 'N/A',
          planName: subscriber.package?.package_name || 'Unknown Package',
          startDate: subscriber.start_date ? new Date(subscriber.start_date).toISOString().split('T')[0] : 'N/A',
          endDate: subscriber.end_date ? new Date(subscriber.end_date).toISOString().split('T')[0] : 'N/A',
          price: subscriber.package?.price || 0,
          totalDuration: subscriber.package?.duration_days || 0,
          daysRemaining: daysInfo.daysRemaining,
          isExpired: daysInfo.isExpired,
          isToday: daysInfo.isToday,
          isExpiringSoon: daysInfo.isExpiringSoon,
          packageStatus: subscriber.package?.status || 0,
          status: subscriber.status?.toLowerCase() || 'inactive',
          userId: subscriber.user_id,
          packageId: subscriber.package_id,
          created_date: subscriber.created_date,
          updated_date: subscriber.updated_date
        };
      });

      res.json({
        success: true,
        data: mappedSubscribers,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total: subscriberData.count,
          total_pages: Math.ceil(subscriberData.count / limit),
          from: offset + 1,
          to: Math.min(offset + parseInt(limit), subscriberData.count)
        }
      });

    } catch (error) {
      console.error('Error fetching subscribers:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  },

  // Update subscriber status
  updateStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // Validate status
      const validStatuses = ['ACTIVE', 'INACTIVE'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status value'
        });
      }

      const updateData = {
        status: status,
        updated_by: 'admin',
        updated_date: new Date()
      };

      const [updatedRows] = await Subscribers.update(updateData, {
        where: { subscriber_id: id }
      });

      if (updatedRows === 0) {
        return res.status(404).json({
          success: false,
          error: 'Subscriber not found'
        });
      }

      // Fetch updated subscriber with relations
      const updatedSubscriber = await Subscribers.findByPk(id, {
        include: [
          {
            model: Users,
            as: 'user',
            attributes: ['user_id', 'name', 'email']
          },
          {
            model: Packages,
            as: 'package',
            attributes: ['package_id', 'package_name', 'price']
          }
        ]
      });

      res.json({
        success: true,
        message: 'Subscriber status updated successfully',
        data: {
          id: `MOLAR#${updatedSubscriber.subscriber_id}`,
          subscriberId: updatedSubscriber.subscriber_id,
          status: updatedSubscriber.status.toLowerCase(),
          name: updatedSubscriber.user?.name,
          planName: updatedSubscriber.package?.package_name
        }
      });

    } catch (error) {
      console.error('Error updating subscriber status:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  },


};
