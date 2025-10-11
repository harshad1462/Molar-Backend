// routes/clinicRoutes.js
const express = require('express');
const router = express.Router();
const clinicController = require('../controllers/clinicController');


// Special routes for clinic management
router.get('/user/:userId', clinicController.findByUserId); // Get clinics by user ID
router.get('/user/:userId/summary', clinicController.getUserClinicSummary); // Get clinic summary
router.post('/user/:userId', clinicController.addClinic);
router.put('/:clinicId', clinicController.updateClinic);
router.delete('/:clinicId', clinicController.deleteClinic);
router.put('/:clinicId/set-primary', clinicController.setPrimaryClinic);
module.exports = router;
