const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// GET /api/users - Get all users with search and pagination
router.get('/', userController.findAll);

// GET /api/users/:id - Get single user by ID
router.get('/:id', userController.findOne);

// Add this to your userRoutes.js
router.put('/:id', userController.updateProfile);
router.post('/update-fcm-token', userController.updateFCMToken);
router.delete('/delete-fcm-token', userController.deleteFCMToken);
router.get('/tokens', userController.getUsersWithTokens);

module.exports = router;
