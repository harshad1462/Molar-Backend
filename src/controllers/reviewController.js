const sequelize = require('../config/database');
const initModels = require('../models/init-models');
const { Op } = require('sequelize');

const models = initModels(sequelize);
const Reviews = models.reviews;
const Users = models.users;

module.exports = {
  // Get all reviews with search and pagination
  findAll: async (req, res) => {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search = '',
        status = '' // Optional status filter
      } = req.query;

      const offset = (page - 1) * limit;
      
      // Build search conditions
      let whereConditions = {};
      
      if (search) {
        const searchTerm = decodeURIComponent(search);
        whereConditions = {
          [Op.or]: [
            { '$given_by_user.name$': { [Op.like]: `%${searchTerm}%` } },
            { '$given_to_user.name$': { [Op.like]: `%${searchTerm}%` } },
            { description: { [Op.like]: `%${searchTerm}%` } }
          ]
        };
      }

      // Add status filter if provided
      if (status && ['APPROVE', 'DISAPPROVE'].includes(status.toUpperCase())) {
        whereConditions.status = status.toUpperCase();
      }

      const reviewData = await Reviews.findAndCountAll({
        where: whereConditions,
        include: [
          {
            model: Users,
            as: 'given_by_user',
            attributes: ['user_id', 'name', 'email'],
            required: true
          },
          {
            model: Users,
            as: 'given_to_user',
            attributes: ['user_id', 'name', 'email'],
            required: true
          }
        ],
        order: [['created_date', 'DESC']], 
        limit: parseInt(limit),
        offset: offset,
        distinct: true
      });

      // Map the data to match frontend expectations
      const mappedReviews = reviewData.rows.map(review => ({
        id: `MOLARR#${review.review_id}`,
        reviewId: review.review_id,
        givenBy: {
          userId: review.given_by_user.user_id,
          name: review.given_by_user.name,
          email: review.given_by_user.email
        },
        givenTo: {
          userId: review.given_to_user.user_id,
          name: review.given_to_user.name,
          email: review.given_to_user.email
        },
        description: review.description || 'No description provided',
        rating: review.rating,
        status: review.status,
        isApproved: review.status === 'APPROVE',
        created_date: review.created_date,
        updated_date: review.updated_date
      }));

      res.json({
        success: true,
        data: mappedReviews,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total: reviewData.count,
          total_pages: Math.ceil(reviewData.count / limit),
          from: offset + 1,
          to: Math.min(offset + parseInt(limit), reviewData.count)
        }
      });

    } catch (error) {
      console.error('Error fetching reviews:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  },

  // Get single review by ID
  findOne: async (req, res) => {
    try {
      const { id } = req.params;

      const review = await Reviews.findByPk(id, {
        include: [
          {
            model: Users,
            as: 'given_by_user',
            attributes: ['user_id', 'name', 'email']
          },
          {
            model: Users,
            as: 'given_to_user',
            attributes: ['user_id', 'name', 'email']
          }
        ]
      });

      if (!review) {
        return res.status(404).json({ 
          success: false, 
          error: 'Review not found' 
        });
      }

      // Map the data to match frontend expectations
      const mappedReview = {
        id: `MOLARR#${review.review_id}`,
        reviewId: review.review_id,
        givenBy: {
          userId: review.given_by_user.user_id,
          name: review.given_by_user.name,
          email: review.given_by_user.email
        },
        givenTo: {
          userId: review.given_to_user.user_id,
          name: review.given_to_user.name,
          email: review.given_to_user.email
        },
        description: review.description || 'No description provided',
        rating: review.rating,
        status: review.status,
        isApproved: review.status === 'APPROVE',
        created_date: review.created_date,
        updated_date: review.updated_date
      };

      res.json({
        success: true,
        data: mappedReview
      });

    } catch (error) {
      console.error('Error fetching review:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  },

  // Update review status (approve/disapprove)
  updateStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // Validate status
      if (!status || !['APPROVE', 'DISAPPROVE'].includes(status.toUpperCase())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status. Must be APPROVE or DISAPPROVE'
        });
      }

      // Check if review exists
      const review = await Reviews.findByPk(id);
      if (!review) {
        return res.status(404).json({
          success: false,
          error: 'Review not found'
        });
      }

      // Update the status
      const [updatedRows] = await Reviews.update(
        {
          status: status.toUpperCase(),
          updated_by: 'admin',
          updated_date: new Date()
        },
        {
          where: { review_id: id }
        }
      );

      if (updatedRows === 0) {
        return res.status(404).json({
          success: false,
          error: 'Review not found'
        });
      }

      res.json({
        success: true,
        message: `Review ${status.toLowerCase()}d successfully`,
        data: {
          reviewId: id,
          status: status.toUpperCase()
        }
      });

    } catch (error) {
      console.error('Error updating review status:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  },

  // Get review statistics
  getStats: async (req, res) => {
    try {
      const stats = await Reviews.findAll({
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('review_id')), 'count']
        ],
        group: ['status'],
        raw: true
      });

      const totalReviews = await Reviews.count();
      const avgRating = await Reviews.findOne({
        attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'avgRating']],
        raw: true
      });

      const formattedStats = {
        total: totalReviews,
        approved: stats.find(s => s.status === 'APPROVE')?.count || 0,
        disapproved: stats.find(s => s.status === 'DISAPPROVE')?.count || 0,
        averageRating: parseFloat(avgRating.avgRating || 0).toFixed(1)
      };

      res.json({
        success: true,
        data: formattedStats
      });

    } catch (error) {
      console.error('Error fetching review stats:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  },

  // Delete review
  delete: async (req, res) => {
    try {
      const { id } = req.params;

      const deletedRows = await Reviews.destroy({
        where: { review_id: id }
      });

      if (deletedRows === 0) {
        return res.status(404).json({
          success: false,
          error: 'Review not found'
        });
      }

      res.json({
        success: true,
        message: 'Review deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting review:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
};
