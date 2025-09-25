const express = require('express');
const router = express.Router();
const appointmentsController = require('../controllers/appointmentsController');

// GET /api/appointments - Get all appointments with filtering and pagination
router.get('/', appointmentsController.findAll);

// GET /api/appointments/:id - Get single appointment by ID
router.get('/:id', appointmentsController.findOne);

module.exports = router;
