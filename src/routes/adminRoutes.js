const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// POST /api/admin/registration
router.post('/registration', adminController.registerAdmin);
router.post('/login', adminController.loginAdmin);

// Add these routes for admin/testing purposes
router.post('/admin/verify-user', adminController.verifyUser);
router.post('/admin/activate-subscription', adminController.activateSubscription);
router.post('/admin/setup-user-access', adminController.setupUserAccess);


module.exports = router;
