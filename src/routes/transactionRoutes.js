const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');

// GET /api/transactions - Get all transactions with pagination and search
router.get('/', transactionController.findAll);

// GET /api/transactions/:id - Get single transaction by ID
router.get('/:id', transactionController.findOne);

module.exports = router;
