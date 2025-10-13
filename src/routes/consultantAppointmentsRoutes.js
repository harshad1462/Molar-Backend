const express = require('express');
const router = express.Router();
const consultantAppointmentsController = require('../controllers/consultantAppointmentsController');

/**
 * @route   GET /api/consultant-appointments/:consultantId
 * @desc    Get all appointments for a consultant
 * @query   status (optional): 'upcoming', 'ongoing', 'completed', 'accepted', or empty for all
 * @query   page (optional): page number (default: 1)
 * @query   limit (optional): items per page (default: 20)
 */
router.get('/:consultantId', consultantAppointmentsController.getConsultantAppointments);

router.get('/details/:appointmentId', consultantAppointmentsController.getConsultantAppointmentById);
router.post('/:appointmentId/start', consultantAppointmentsController.startConsultation);
router.post('/:appointmentId/complete', consultantAppointmentsController.completeConsultation);
router.get('/:consultantId/statistics', consultantAppointmentsController.getConsultantStatistics);
router.get('/:consultantId/counts', consultantAppointmentsController.getConsultantAppointmentCounts);

module.exports = router;
