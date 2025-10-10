const express = require('express');
const router = express.Router();
const fcmController = require('../controllers/fcmController');

// FCM token management
router.post('/save-token', fcmController.saveFCMToken);
router.post('/remove-token', fcmController.removeFCMToken);
router.get('/users-with-tokens', fcmController.getUsersWithTokens);

module.exports = router;
