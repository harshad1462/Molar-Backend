const express = require('express');
const router = express.Router();
const consultantController = require('../controllers/consultantController');

// Master data routes
// router.get('/specializations', consultantController.getSpecializations);
// router.get('/cities', consultantController.getCities);

// OTP routes - REMOVE the middleware
router.post('/send-otp', consultantController.sendOTP);
router.post('/verify-otp', consultantController.verifyOTP);

// Authentication routes
router.post('/auth/login', consultantController.loginUser);
router.post('/login', consultantController.loginConsultant);
router.post('/register', consultantController.registerConsultant);

// Get all consultants
router.get('/', consultantController.getAllConsultants);

module.exports = router;
