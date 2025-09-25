const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// POST /api/admin/registration
router.post('/registration', adminController.registerAdmin);
router.post('/login', adminController.loginAdmin);

module.exports = router;
