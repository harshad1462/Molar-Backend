const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestsController');
const authMiddleware = require('../middleware/auth');
// Create a new request and send to qualified doctors
router.post('/create',requestController.createRequest);
// router.post('/create', authMiddleware,requestController.createRequest);
router.get('/AllRequest', requestController.getAllRequests);
router.get('/:id', requestController.getRequestById);

// Doctor-specific routes
router.get('/doctor/:userId/pending', requestController.getPendingRequestsForDoctor);
router.get('/doctor/:userId/accepted', requestController.getAcceptedRequestsForDoctor);
router.get('/doctor/:userId', requestController.getAllRequestsForDoctor);

// Accept/Decline actions
router.put('/:requestId/accept', requestController.acceptRequest);
router.put('/:requestId/decline', requestController.declineRequest);

// Statistics
router.get('/stats/doctor/:userId', requestController.getDoctorStats);
module.exports = router;
