const express = require('express');
const router = express.Router();
const hostController = require('../controllers/hostController');
// const authMiddleware = require('../middleware/authMiddleware'); // Uncomment if you have auth middleware

/**
 * @route   GET /api/host/requests/:userId
 * @desc    Get all requests created by host with filter support
 * @access  Private
 * @query   filter (my_requests|incoming|ongoing_requests|past_requests), page, limit
 */
router.get('/requests/:userId', hostController.getHostRequests);
router.post('/request/:requestId/complete', hostController.completeRequest);

/**
 * @route   GET /api/host/incoming/:userId
 * @desc    Get incoming requests (CONFIRMED status with assigned doctor)
 * @access  Private
 * @query   page, limit
 */
router.get('/incoming/:userId', hostController.getIncomingRequests);

/**
 * @route   GET /api/host/ongoing/:userId
 * @desc    Get ongoing requests (STARTED status - doctor has started)
 * @access  Private
 * @query   page, limit
 */
router.get('/ongoing/:userId', hostController.getOngoingRequests);

/**
 * @route   GET /api/host/past/:userId
 * @desc    Get past requests (COMPLETED or CANCELLED)
 * @access  Private
 * @query   page, limit
 */
router.get('/past/:userId', hostController.getPastRequests);

/**
 * @route   GET /api/host/request/:requestId
 * @desc    Get single request details with accepted doctors
 * @access  Private
 * @query   userId (for authorization)
 */
router.get('/request/:requestId', hostController.getHostRequestById);

/**
 * @route   POST /api/host/request/:requestId/confirm-doctor
 * @desc    Confirm a doctor for a request (ACCEPTED → CONFIRMED)
 * @access  Private
 * @body    { doctor_id, user_id, confirmation_notes (optional) }
 */
router.post('/request/:requestId/confirm-doctor', hostController.confirmDoctor);

/**
 * @route   POST /api/host/request/:requestId/cancel
 * @desc    Cancel a request
 * @access  Private
 * @body    { user_id, cancellation_reason (optional) }
 */
router.post('/request/:requestId/cancel', hostController.cancelRequest);

/**
 * @route   GET /api/host/statistics/:userId
 * @desc    Get host dashboard statistics
 * @access  Private
 */
router.get('/statistics/:userId', hostController.getHostStatistics);

module.exports = router;
