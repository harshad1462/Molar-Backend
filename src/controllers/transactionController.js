const sequelize = require('../config/database');
const initModels = require('../models/init-models');
const { Op } = require('sequelize');

const models = initModels(sequelize);
const Transactions = models.transactions;
const Users = models.users;

module.exports = {
  // Get all transactions with user details
  findAll: async (req, res) => {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search = ''
      } = req.query;

      const offset = (page - 1) * limit;
      
      let queryOptions = {
        include: [
          {
            model: Users,
            as: 'user', 
            attributes: ['user_id', 'name', 'email']
          }
        ],
        order: [['tran_date', 'DESC']], 
        limit: parseInt(limit),
        offset: offset,
        distinct: true
      };

      // Handle search logic properly
      if (search) {
        const searchTerm = decodeURIComponent(search);
        
        // Use raw SQL with proper OR conditions across joined tables
        queryOptions.where = {
          [Op.or]: [
            // Search in transaction fields
            { razorpay_payment_id: { [Op.like]: `%${searchTerm}%` } },
            // Search in user name via subquery
            {
              user_id: {
                [Op.in]: sequelize.literal(`(
                  SELECT user_id FROM users 
                  WHERE name LIKE '%${searchTerm.replace(/'/g, "''")}%'
                )`)
              }
            }
          ]
        };
      }

      const transactionData = await Transactions.findAndCountAll(queryOptions);

      // Map the data to match frontend expectations
      const mappedTransactions = transactionData.rows.map(transaction => ({
        id: `MOLAR#${transaction.tran_id}`,
        tranId: transaction.tran_id,
        transactionId: transaction.razorpay_payment_id,
        userName: transaction.user?.name || 'Unknown User',
        userEmail: transaction.user?.email || 'N/A',
        date: transaction.tran_date ? new Date(transaction.tran_date).toISOString().split('T')[0] : 'N/A',
        time: transaction.tran_date ? new Date(transaction.tran_date).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }) : 'N/A',
        amount: transaction.amount || 0,
        status: transaction.status?.toLowerCase() || 'unknown',
        userId: transaction.user_id,
        created_date: transaction.created_date,
        updated_date: transaction.updated_date
      }));

      res.json({
        success: true,
        data: mappedTransactions,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total: transactionData.count,
          total_pages: Math.ceil(transactionData.count / limit),
          from: offset + 1,
          to: Math.min(offset + parseInt(limit), transactionData.count)
        }
      });

    } catch (error) {
      console.error('Error fetching transactions:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  },

  // Alternative approach using separate queries (more reliable)
  findAllAlternative: async (req, res) => {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search = ''
      } = req.query;

      const offset = (page - 1) * limit;
      
      let whereConditions = {};
      
      if (search) {
        const searchTerm = decodeURIComponent(search);
        
        // First, find user IDs that match the search term
        const matchingUsers = await Users.findAll({
          where: {
            name: { [Op.like]: `%${searchTerm}%` }
          },
          attributes: ['user_id']
        });
        
        const userIds = matchingUsers.map(user => user.user_id);
        
        // Then search transactions by payment ID OR user IDs
        whereConditions = {
          [Op.or]: [
            { razorpay_payment_id: { [Op.like]: `%${searchTerm}%` } },
            ...(userIds.length > 0 ? [{ user_id: { [Op.in]: userIds } }] : [])
          ]
        };
      }

      const transactionData = await Transactions.findAndCountAll({
        where: whereConditions,
        include: [
          {
            model: Users,
            as: 'user', 
            attributes: ['user_id', 'name', 'email']
          }
        ],
        order: [['tran_date', 'DESC']], 
        limit: parseInt(limit),
        offset: offset,
        distinct: true
      });

      // Map the data to match frontend expectations
      const mappedTransactions = transactionData.rows.map(transaction => ({
        id: `MOLAR#${transaction.tran_id}`,
        tranId: transaction.tran_id,
        transactionId: transaction.razorpay_payment_id,
        userName: transaction.user?.name || 'Unknown User',
        userEmail: transaction.user?.email || 'N/A',
        date: transaction.tran_date ? new Date(transaction.tran_date).toISOString().split('T')[0] : 'N/A',
        time: transaction.tran_date ? new Date(transaction.tran_date).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }) : 'N/A',
        amount: transaction.amount || 0,
        status: transaction.status?.toLowerCase() || 'unknown',
        userId: transaction.user_id,
        created_date: transaction.created_date,
        updated_date: transaction.updated_date
      }));

      res.json({
        success: true,
        data: mappedTransactions,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total: transactionData.count,
          total_pages: Math.ceil(transactionData.count / limit),
          from: offset + 1,
          to: Math.min(offset + parseInt(limit), transactionData.count)
        }
      });

    } catch (error) {
      console.error('Error fetching transactions:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  },

  // Get single transaction by ID
  findOne: async (req, res) => {
    try {
      const { id } = req.params;

      const transaction = await Transactions.findByPk(id, {
        include: [
          {
            model: Users,
            as: 'user',
            attributes: ['user_id', 'name', 'email', 'phone_number']
          }
        ]
      });

      if (!transaction) {
        return res.status(404).json({ 
          success: false, 
          error: 'Transaction not found' 
        });
      }

      // Map the data to match frontend expectations
      const mappedTransaction = {
        id: `MOLAR#${transaction.tran_id}`,
        tranId: transaction.tran_id,
        transactionId: transaction.razorpay_payment_id,
        userName: transaction.user?.name || 'Unknown User',
        userEmail: transaction.user?.email || 'N/A',
        userPhone: transaction.user?.phone_number || 'N/A',
        date: transaction.tran_date ? new Date(transaction.tran_date).toISOString().split('T')[0] : 'N/A',
        time: transaction.tran_date ? new Date(transaction.tran_date).toLocaleTimeString() : 'N/A',
        amount: transaction.amount || 0,
        status: transaction.status || 'unknown',
        userId: transaction.user_id,
        created_date: transaction.created_date,
        updated_date: transaction.updated_date
      };

      res.json({
        success: true,
        data: mappedTransaction
      });

    } catch (error) {
      console.error('Error fetching transaction:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
};
