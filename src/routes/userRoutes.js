const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// GET /api/users - Get all users with search and pagination
router.get('/', userController.findAll);

// GET /api/users/:id - Get single user by ID
router.get('/:id', userController.findOne);

module.exports = router;
