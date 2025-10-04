const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestsController');
const authMiddleware = require('../middleware/auth');

// Create a new request and send to qualified doctors
router.post('/create',requestController.createRequest);
// router.post('/create', authMiddleware,requestController.createRequest);

module.exports = router;
