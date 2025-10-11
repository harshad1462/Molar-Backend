const express = require('express');
const router = express.Router();
// const paymentController = require('../controllers/paymentController');
const paymentController = require('../controllers/paymentController');

// ✅ CREATE RAZORPAY ORDER
router.post('/create-order', paymentController.createOrder);

// ✅ VERIFY PAYMENT
router.post('/verify-payment', paymentController.verifyPayment);

// ✅ GET TRANSACTION HISTORY
router.get('/transactions/:userId', paymentController.getTransactionHistory);

// ✅ GET TRANSACTION BY ID
router.get('/transaction/:transactionId', paymentController.getTransactionById);

module.exports = router;
