const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');

// GET /api/reviews - Get all reviews with pagination and search
router.get('/', reviewController.findAll);

// GET /api/reviews/stats - Get review statistics
router.get('/stats', reviewController.getStats);

// GET /api/reviews/:id - Get single review by ID
router.get('/:id', reviewController.findOne);

// PUT /api/reviews/:id/status - Update review status
router.put('/:id/status', reviewController.updateStatus);

// DELETE /api/reviews/:id - Delete review
router.delete('/:id', reviewController.delete);

module.exports = router;
