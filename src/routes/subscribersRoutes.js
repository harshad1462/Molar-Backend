const express = require('express');
const router = express.Router();
const subscribersController = require('../controllers/subscribersController');

// GET /api/subscribers - Get all subscribers with pagination and search
router.get('/', subscribersController.findAll);

// PUT /api/subscribers/:id/status - Update subscriber status
router.put('/:id/status', subscribersController.updateStatus);

// router.get('/user/:userId', subscribersController.getUserSubscription);
// router.get('/user/:userId/history', subscribersController.getUserSubscriptionHistory);
// router.get('/packages/available', subscribersController.getAvailablePackages);
// router.post('/create', subscribersController.createSubscription);

module.exports = router;
