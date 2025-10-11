const Razorpay = require('razorpay');
const crypto = require('crypto');
const initModels = require('../models/init-models');
const sequelize = require('../config/database'); // Your DB config

const models = initModels(sequelize);
const { transactions, subscribers, users, packages } = models;

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: 'rzp_test_6iRE2VEfQ2p7qE',
  key_secret: 'qK3roYl1NgO7VzA013gsoUN9',
});

// ✅ CREATE RAZORPAY ORDER
exports.createOrder = async (req, res) => {
  try {
    const { userId, planId, amount, currency } = req.body;

    console.log('📝 Creating Razorpay order:', { userId, planId, amount, currency });

    // Validate inputs
    if (!userId || !planId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, planId, amount',
      });
    }

    // Check if user exists
    const user = await users.findOne({ where: { user_id: userId } });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Check if package exists
    const packageData = await packages.findOne({ where: { package_id: planId } });
    if (!packageData) {
      return res.status(404).json({
        success: false,
        error: 'Package not found',
      });
    }

    // Create Razorpay order
    const options = {
      amount: amount, // Amount in paise
      currency: currency || 'INR',
      receipt: `sub_${userId}_${planId}_${Date.now()}`,
      notes: {
        userId: userId.toString(),
        planId: planId.toString(),
        userName: user.name,
        planName: packageData.package_name,
      },
    };

    const order = await razorpay.orders.create(options);

    console.log('✅ Razorpay order created:', order.id);

    // ✅ CREATE PENDING TRANSACTION ENTRY
    const transaction = await transactions.create({
      user_id: userId,
      amount: amount / 100, // Convert paise to rupees for storage
      status: 'PENDING',
      razorpay_payment_id: order.id, // Temporarily store order ID
      tran_date: new Date(),
      created_by: `user_${userId}`,
      created_date: new Date(),
    });

    console.log('✅ Transaction created:', transaction.tran_id);

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      transactionId: transaction.tran_id,
    });
  } catch (error) {
    console.error('❌ Create order error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create order',
    });
  }
};

// ✅ VERIFY PAYMENT AND UPDATE TRANSACTION
// exports.verifyPayment = async (req, res) => {
//   try {
//     const { orderId, razorpayPaymentId, razorpaySignature, userId, planId } = req.body;

//     console.log('🔍 Verifying payment:', { orderId, razorpayPaymentId });

//     // Validate inputs
//     if (!orderId || !razorpayPaymentId || !razorpaySignature || !userId || !planId) {
//       return res.status(400).json({
//         success: false,
//         error: 'Missing required fields',
//       });
//     }

//     // ✅ VERIFY RAZORPAY SIGNATURE
//     const generatedSignature = crypto
//       .createHmac('sha256', 'qK3roYl1NgO7VzA013gsoUN9')
//       .update(`${orderId}|${razorpayPaymentId}`)
//       .digest('hex');

//     if (generatedSignature !== razorpaySignature) {
//       console.error('❌ Invalid signature');
      
//       // Update transaction status to FAILED
//       await transactions.update(
//         { 
//           status: 'FAILED',
//           updated_by: `user_${userId}`,
//           updated_date: new Date(),
//         },
//         { where: { razorpay_payment_id: orderId } }
//       );

//       return res.status(400).json({
//         success: false,
//         error: 'Invalid payment signature',
//       });
//     }

//     console.log('✅ Payment signature verified');

//     // ✅ UPDATE TRANSACTION WITH PAYMENT ID AND STATUS
//     const [updatedRows] = await transactions.update(
//       {
//         razorpay_payment_id: razorpayPaymentId, // Update with actual payment ID
//         status: 'SUCCESS',
//         updated_by: `user_${userId}`,
//         updated_date: new Date(),
//       },
//       { where: { razorpay_payment_id: orderId } } // Find by order ID
//     );

//     if (updatedRows === 0) {
//       console.error('❌ Transaction not found');
//       return res.status(404).json({
//         success: false,
//         error: 'Transaction not found',
//       });
//     }

//     console.log('✅ Transaction updated to SUCCESS');

//     // ✅ GET PACKAGE DETAILS FOR SUBSCRIPTION DATES
//     const packageData = await packages.findOne({ where: { package_id: planId } });
    
//     if (!packageData) {
//       return res.status(404).json({
//         success: false,
//         error: 'Package not found',
//       });
//     }

//     // Calculate subscription dates
//     const startDate = new Date();
//     const endDate = new Date();
//     endDate.setDate(endDate.getDate() + (packageData.duration || 180)); // Default 180 days

//     // ✅ CREATE OR UPDATE SUBSCRIBER ENTRY
//     const [subscriber, created] = await subscribers.findOrCreate({
//       where: { user_id: userId },
//       defaults: {
//         user_id: userId,
//         package_id: planId,
//         start_date: startDate,
//         end_date: endDate,
//         payment_status: 'COMPLETED',
//         status: 'ACTIVE',
//       },
//     });

//     if (!created) {
//       // Update existing subscription
//       await subscribers.update(
//         {
//           package_id: planId,
//           start_date: startDate,
//           end_date: endDate,
//           payment_status: 'COMPLETED',
//           status: 'ACTIVE',
//         },
//         { where: { user_id: userId } }
//       );
//     }

//     console.log('✅ Subscriber entry created/updated');

//     // ✅ UPDATE USER SUBSCRIPTION STATUS
//     await users.update(
//       { 
//         has_subscription: 1,
//         updated_by: `user_${userId}`,
//         updated_date: new Date(),
//       },
//       { where: { user_id: userId } }
//     );

//     console.log('✅ User subscription status updated');

//     res.json({
//       success: true,
//       message: 'Payment verified and subscription activated successfully',
//       subscriptionId: subscriber.subscriber_id,
//       transactionId: razorpayPaymentId,
//       subscriptionDetails: {
//         startDate: startDate,
//         endDate: endDate,
//         status: 'ACTIVE',
//       },
//     });
//   } catch (error) {
//     console.error('❌ Verify payment error:', error);
//     res.status(500).json({
//       success: false,
//       error: error.message || 'Payment verification failed',
//     });
//   }
// };
// ✅ VERIFY PAYMENT AND UPDATE BOTH TABLES
exports.verifyPayment = async (req, res) => {
  try {
    const { orderId, razorpayPaymentId, razorpaySignature, userId, planId } = req.body;

    console.log('🔍 Verifying payment:', { orderId, razorpayPaymentId });

    // Validate inputs
    if (!orderId || !razorpayPaymentId || !razorpaySignature) {
      console.error('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        error: 'Missing orderId, razorpayPaymentId, or razorpaySignature',
      });
    }

    // ✅ VERIFY RAZORPAY SIGNATURE
    const generatedSignature = crypto
      .createHmac('sha256', 'qK3roYl1NgO7VzA013gsoUN9')
      .update(`${orderId}|${razorpayPaymentId}`)
      .digest('hex');

    console.log('🔐 Signature verification:', {
      generated: generatedSignature.substring(0, 20) + '...',
      received: razorpaySignature.substring(0, 20) + '...',
      match: generatedSignature === razorpaySignature
    });

    if (generatedSignature !== razorpaySignature) {
      console.error('❌ Invalid signature');
      
      // Update transaction to FAILED
      await transactions.update(
        { 
          status: 'FAILED',
          updated_by: `user_${userId}`,
          updated_date: new Date(),
        },
        { where: { razorpay_payment_id: orderId } }
      );

      return res.status(400).json({
        success: false,
        error: 'Payment signature verification failed',
      });
    }

    console.log('✅ Payment signature verified successfully');

    // ✅ FIND TRANSACTION BY ORDER ID
    const existingTransaction = await transactions.findOne({
      where: { razorpay_payment_id: orderId }
    });

    if (!existingTransaction) {
      console.error('❌ Transaction not found for order:', orderId);
      return res.status(404).json({
        success: false,
        error: 'Transaction not found',
      });
    }

    console.log('📦 Found transaction:', existingTransaction.tran_id);

    // ✅ UPDATE TRANSACTION TO SUCCESS
    await transactions.update(
      {
        razorpay_payment_id: razorpayPaymentId,
        status: 'SUCCESS',
        updated_by: `user_${userId}`,
        updated_date: new Date(),
      },
      { where: { tran_id: existingTransaction.tran_id } }
    );

    console.log('✅ Transaction updated to SUCCESS');

    // ✅ GET PACKAGE DETAILS (USE CORRECT FIELD NAME: duration_days)
    const packageData = await packages.findOne({ 
      where: { package_id: planId } 
    });
    
    if (!packageData) {
      console.warn('⚠️ Package not found, using default duration');
    }

    // Calculate subscription dates using duration_days
    const startDate = new Date();
    const endDate = new Date();
    const durationDays = packageData?.duration_days || 180; // Use duration_days
    endDate.setDate(endDate.getDate() + durationDays);

    console.log('📅 Subscription dates:', { 
      startDate, 
      endDate, 
      durationDays 
    });

    // ✅ CREATE OR UPDATE SUBSCRIBER ENTRY
    const [subscriber, created] = await subscribers.findOrCreate({
      where: { user_id: userId },
      defaults: {
        user_id: userId,
        package_id: planId,
        start_date: startDate,
        end_date: endDate,
        status: 'ACTIVE',
        created_by: `user_${userId}`,
        created_date: new Date(),
      },
    });

    if (!created) {
      // Update existing subscription
      await subscribers.update(
        {
          package_id: planId,
          start_date: startDate,
          end_date: endDate,
          status: 'ACTIVE',
          updated_by: `user_${userId}`,
          updated_date: new Date(),
        },
        { where: { user_id: userId } }
      );
      console.log('✅ Updated existing subscriber');
    } else {
      console.log('✅ Created new subscriber');
    }

    // ✅ INCREMENT TOTAL_SUBSCRIBERS IN PACKAGES TABLE
    if (created) {
      // Only increment if this is a new subscriber
      await packages.increment(
        'total_subscribers',
        { 
          by: 1,
          where: { package_id: planId }
        }
      );
      console.log('✅ Incremented package total_subscribers count');
    }

    // ✅ UPDATE USER SUBSCRIPTION STATUS
    await users.update(
      { 
        has_subscription: 1,
        updated_by: `user_${userId}`,
        updated_date: new Date(),
      },
      { where: { user_id: userId } }
    );

    console.log('✅ User subscription status updated');

    // ✅ SEND SUCCESS RESPONSE
    res.json({
      success: true,
      message: 'Payment verified and subscription activated successfully',
      subscriptionId: subscriber.subscriber_id,
      transactionId: razorpayPaymentId,
      subscriptionDetails: {
        startDate: startDate,
        endDate: endDate,
        durationDays: durationDays,
        status: 'ACTIVE',
      },
    });

  } catch (error) {
    console.error('❌ Verify payment error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Payment verification failed',
    });
  }
};

// ✅ GET TRANSACTION HISTORY
exports.getTransactionHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    const userTransactions = await transactions.findAll({
      where: { user_id: userId },
      order: [['tran_date', 'DESC']],
    });

    res.json({
      success: true,
      transactions: userTransactions,
    });
  } catch (error) {
    console.error('❌ Get transactions error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch transactions',
    });
  }
};

// ✅ GET TRANSACTION BY ID
exports.getTransactionById = async (req, res) => {
  try {
    const { transactionId } = req.params;

    const transaction = await transactions.findOne({
      where: { tran_id: transactionId },
      include: [
        {
          model: users,
          as: 'user',
          attributes: ['user_id', 'name', 'email'],
        },
      ],
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found',
      });
    }

    res.json({
      success: true,
      transaction: transaction,
    });
  } catch (error) {
    console.error('❌ Get transaction error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch transaction',
    });
  }
};
