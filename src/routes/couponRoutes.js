const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');

// GET /api/coupons - Get all coupons with pagination and search
router.get('/', couponController.findAll);

// POST /api/coupons - Create new coupon
router.post('/', couponController.create);

// GET /api/coupons/search-users - Search users for specific customer selection
router.get('/search-users', couponController.searchUsers);

// GET /api/coupons/user/:userId - Get coupons available for specific user
router.get('/user/:userId', couponController.getAvailableForUser);

// GET /api/coupons/:id - Get single coupon by ID (MUST be after /search-users and /user/:userId)
router.get('/:id', couponController.findOne);

// PUT /api/coupons/:id - Update coupon
router.put('/:id', couponController.update);

// PUT /api/coupons/:id/status - Update coupon status
router.put('/:id/status', couponController.updateStatus);

// DELETE /api/coupons/:id - Delete coupon
router.delete('/:id', couponController.delete);

module.exports = router;
