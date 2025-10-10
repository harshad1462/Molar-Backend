const fcmService = require('../services/fcmService');

/**
 * Save FCM token when user logs in
 */
exports.saveFCMToken = async (req, res) => {
    try {
        const { user_id, fcm_token } = req.body;
        
        const result = await fcmService.saveFCMToken(user_id, fcm_token);
        
        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(400).json(result);
        }
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to save FCM token',
            details: error.message
        });
    }
};

/**
 * Remove FCM token on logout
 */
exports.removeFCMToken = async (req, res) => {
    try {
        const { user_id } = req.body;
        
        const result = await fcmService.removeFCMToken(user_id);
        
        res.status(200).json(result);
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to remove FCM token'
        });
    }
};

/**
 * Get users with FCM tokens (for testing)
 */
exports.getUsersWithTokens = async (req, res) => {
    try {
        const { role, specialization } = req.query;
        
        const filters = {};
        if (role) filters.role = role;
        if (specialization) filters.specialization = specialization;
        
        const users = await fcmService.getUsersWithTokens(filters);
        
        res.status(200).json({
            success: true,
            data: users,
            count: users.length
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch users with tokens'
        });
    }
};
