const express = require('express');
const router = express.Router();
const appointmentsController = require('../controllers/appointmentsController');

// GET /api/appointments - Get all appointments with filtering and pagination
router.get('/', appointmentsController.findAll);

// GET /api/appointments/stats - Get appointment statistics
router.get('/stats', appointmentsController.getStats);

// GET /api/appointments/:id - Get single appointment by ID
router.get('/:id', appointmentsController.findOne);

// PUT /api/appointments/:id/status - Update appointment status
router.put('/:id/status', appointmentsController.updateStatus);

module.exports = router;
