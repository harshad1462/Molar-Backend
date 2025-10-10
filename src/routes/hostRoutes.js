const express = require('express');
const router = express.Router();
const hostController = require('../controllers/hostController');
// const authMiddleware = require('../middleware/authMiddleware'); // Uncomment if you have auth middleware

/**
 * @route   GET /api/host/requests/:userId
 * @desc    Get all requests created by host
 * @access  Private
 * @query   status (optional), page, limit
 */
router.get('/requests/:userId', hostController.getHostRequests);

/**
 * @route   GET /api/host/request/:requestId
 * @desc    Get single request details with accepted doctors
 * @access  Private
 * @query   userId (for authorization)
 */
router.get('/request/:requestId', hostController.getHostRequestById);

/**
 * @route   POST /api/host/request/:requestId/confirm-doctor
 * @desc    Confirm a doctor for a request
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
