const initModels = require('../models/init-models');
const sequelize = require('../config/database');
const { Op } = require('sequelize');
const expoPushService = require('../services/expoPushService');

// Initialize models
const models = initModels(sequelize);

// Extract models
const Request = models.requests;
const Clinic = models.clinics;
const User = models.users;

/**
 * Get all requests created by the host (clinic owner)
 * Includes accepted doctors information
 */
exports.getHostRequests = async (req, res) => {
    try {
        const { userId } = req.params;
        const { status, page = 1, limit = 20 } = req.query;
        
        console.log(`📍 Fetching host requests for user ID: ${userId}`);
        
        let whereConditions = {
            user_id: parseInt(userId)
        };
        
        if (status) {
            whereConditions.status = status.toUpperCase();
        }
        
        const offset = (page - 1) * limit;
        
        const { count, rows: requests } = await Request.findAndCountAll({
            where: whereConditions,
            include: [
                {
                    model: Clinic,
                    as: 'clinic',
                    // ✅ REMOVED phone_number - it doesn't exist in clinics table
                    attributes: ['clinic_id', 'clinic_name', 'city', 'address', 'area', 'pin_code', 'user_id'],
                    // ✅ ADD nested include to get clinic owner's phone from users table
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: ['user_id', 'name', 'phone_number', 'email']
                        }
                    ]
                },
                {
                    model: User,
                    as: 'assignedDoctor',
                    attributes: ['user_id', 'name', 'phone_number', 'email', 'specialization', 'qualification', 'profile_pic_url'],
                    required: false
                }
            ],
            order: [['created_date', 'DESC']],
            limit: parseInt(limit),
            offset: offset
        });
        
        // ✅ FETCH ACCEPTED DOCTORS FOR EACH REQUEST
        const enrichedRequests = await Promise.all(requests.map(async (request) => {
            const requestData = request.toJSON();
            
            if (requestData.accepted_by_user_ids && requestData.accepted_by_user_ids.length > 0) {
                const acceptedDoctors = await User.findAll({
                    where: {
                        user_id: {
                            [Op.in]: requestData.accepted_by_user_ids
                        }
                    },
                    attributes: [
                        'user_id',
                        'name',
                        'phone_number',
                        'email',
                        'specialization',
                        'qualification',
                        'profile_pic_url',
                    ]
                });
                
                requestData.acceptedDoctors = acceptedDoctors;
            } else {
                requestData.acceptedDoctors = [];
            }
            
            requestData.pendingDoctorsCount = requestData.sent_to_user_ids ? requestData.sent_to_user_ids.length : 0;
            
            return requestData;
        }));
        
        console.log(`✅ Found ${enrichedRequests.length} host requests`);
        
        res.json({
            success: true,
            data: enrichedRequests,
            pagination: {
                current_page: parseInt(page),
                total_pages: Math.ceil(count / limit),
                total: count,
                per_page: parseInt(limit)
            },
            message: `Found ${count} consultation requests`
        });
        
    } catch (error) {
        console.error('❌ Error fetching host requests:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch host requests',
            details: error.message
        });
    }
};

/**
 * Get single host request by ID with full details
 */
exports.getHostRequestById = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { userId } = req.query;
        
        console.log(`📍 Fetching host request ${requestId} for user ${userId}`);
        
        const request = await Request.findByPk(requestId, {
            include: [
                {
                    model: Clinic,
                    as: 'clinic',
                    // ✅ REMOVED phone_number
                    attributes: ['clinic_id', 'clinic_name', 'city', 'address', 'area', 'pin_code', 'user_id'],
                    // ✅ ADD nested include
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: ['user_id', 'name', 'phone_number', 'email']
                        }
                    ]
                },
                {
                    model: User,
                    as: 'assignedDoctor',
                    attributes: ['user_id', 'name', 'phone_number', 'email', 'specialization',  'qualification', 'profile_pic_url'],
                    required: false
                }
            ]
        });
        
        if (!request) {
            return res.status(404).json({
                success: false,
                error: 'Request not found'
            });
        }
        
        if (userId && request.user_id !== parseInt(userId)) {
            return res.status(403).json({
                success: false,
                error: 'You are not authorized to view this request'
            });
        }
        
        const requestData = request.toJSON();
        
        if (requestData.accepted_by_user_ids && requestData.accepted_by_user_ids.length > 0) {
            const acceptedDoctors = await User.findAll({
                where: {
                    user_id: {
                        [Op.in]: requestData.accepted_by_user_ids
                    }
                },
                attributes: [
                    'user_id',
                    'name',
                    'phone_number',
                    'email',
                    'specialization',
                    'qualification',
                    'profile_pic_url',
                ]
            });
            
            requestData.acceptedDoctors = acceptedDoctors;
        } else {
            requestData.acceptedDoctors = [];
        }
        
        res.json({
            success: true,
            data: requestData
        });
        
    } catch (error) {
        console.error('❌ Error fetching host request:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch request details',
            details: error.message
        });
    }
};

/**
 * Confirm/Select a specific doctor for a request
 */
exports.confirmDoctor = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { doctor_id, user_id, confirmation_notes } = req.body;
        
        const userId = parseInt(user_id);
        const doctorId = parseInt(doctor_id);
        
        console.log(`✅ Host ${userId} confirming doctor ${doctorId} for request ${requestId}`);
        
        const request = await Request.findByPk(requestId, {
            include: [
                {
                    model: Clinic,
                    as: 'clinic',
                    attributes: ['clinic_id', 'clinic_name', 'user_id', 'city', 'address']
                }
            ]
        });
        
        if (!request) {
            return res.status(404).json({
                success: false,
                error: 'Request not found'
            });
        }
        
        if (request.user_id !== userId) {
            return res.status(403).json({
                success: false,
                error: 'You are not authorized to confirm doctors for this request'
            });
        }
        
        if (!request.accepted_by_user_ids || !request.accepted_by_user_ids.includes(doctorId)) {
            return res.status(400).json({
                success: false,
                error: 'This doctor has not accepted the request yet'
            });
        }
        
        const doctor = await User.findByPk(doctorId);
        const host = await User.findByPk(userId);
        
        if (!doctor) {
            return res.status(404).json({
                success: false,
                error: 'Doctor not found'
            });
        }
        
        await request.update({
            assigned_doctor_id: doctorId,
            status: 'CONFIRMED',
            confirmation_notes: confirmation_notes || null,
            updated_by: host?.name || 'host',
            updated_date: new Date()
        });
        
        const updatedRequest = await Request.findByPk(requestId, {
            include: [
                {
                    model: Clinic,
                    as: 'clinic',
                    // ✅ REMOVED phone_number from here too
                    attributes: ['clinic_id', 'clinic_name', 'city', 'address']
                },
                {
                    model: User,
                    as: 'assignedDoctor',
                    attributes: ['user_id', 'name', 'phone_number', 'email', 'specialization', 'profile_pic_url']
                }
            ]
        });
        
        console.log(`✅ Doctor ${doctorId} confirmed for request ${requestId}`);
        
        // Send notification to confirmed doctor
        if (doctor?.fcm_token) {
            expoPushService.sendExpoPushNotification(
                [doctor.fcm_token],
                `🎉 You've Been Selected!`,
                `${request.clinic?.clinic_name || 'A clinic'} has confirmed you for the ${request.specialization} consultation`,
                {
                    request_id: requestId.toString(),
                    type: 'DOCTOR_CONFIRMED',
                    clinic_id: request.clinic_id.toString(),
                    clinic_name: request.clinic?.clinic_name || ''
                }
            ).catch(err => console.error('Push notification error:', err));
        }
        
        // Notify other doctors
        const otherDoctorIds = request.accepted_by_user_ids.filter(id => id !== doctorId);
        if (otherDoctorIds.length > 0) {
            const otherDoctors = await User.findAll({
                where: { user_id: { [Op.in]: otherDoctorIds } },
                attributes: ['fcm_token']
            });
            
            const otherTokens = otherDoctors
                .map(d => d.fcm_token)
                .filter(token => token && token.startsWith('ExponentPushToken'));
            
            if (otherTokens.length > 0) {
                expoPushService.sendExpoPushNotification(
                    otherTokens,
                    `Request Filled`,
                    `The ${request.specialization} consultation has been filled by another doctor`,
                    {
                        request_id: requestId.toString(),
                        type: 'REQUEST_FILLED',
                        status: 'NOT_SELECTED'
                    }
                ).catch(err => console.error('Push notification error:', err));
            }
        }
        
        res.json({
            success: true,
            data: updatedRequest,
            message: 'Doctor confirmed successfully',
            doctor_info: {
                doctor_id: doctorId,
                doctor_name: doctor?.name || 'Unknown',
                doctor_phone: doctor?.phone_number
            }
        });
        
    } catch (error) {
        console.error('❌ Error confirming doctor:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to confirm doctor',
            details: error.message
        });
    }
};

/**
 * Cancel a request
 */
exports.cancelRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { user_id, cancellation_reason } = req.body;
        
        const userId = parseInt(user_id);
        
        console.log(`❌ Host ${userId} cancelling request ${requestId}`);
        
        const request = await Request.findByPk(requestId);
        
        if (!request) {
            return res.status(404).json({
                success: false,
                error: 'Request not found'
            });
        }
        
        if (request.user_id !== userId) {
            return res.status(403).json({
                success: false,
                error: 'You are not authorized to cancel this request'
            });
        }
        
        if (['COMPLETED', 'CANCELLED'].includes(request.status)) {
            return res.status(400).json({
                success: false,
                error: `Cannot cancel a ${request.status.toLowerCase()} request`
            });
        }
        
        const host = await User.findByPk(userId);
        
        await request.update({
            status: 'CANCELLED',
            cancellation_reason: cancellation_reason || 'Cancelled by host',
            updated_by: host?.name || 'host',
            updated_date: new Date()
        });
        
        console.log(`✅ Request ${requestId} cancelled successfully`);
        
        if (request.accepted_by_user_ids && request.accepted_by_user_ids.length > 0) {
            const doctors = await User.findAll({
                where: { user_id: { [Op.in]: request.accepted_by_user_ids } },
                attributes: ['fcm_token']
            });
            
            const tokens = doctors
                .map(d => d.fcm_token)
                .filter(token => token && token.startsWith('ExponentPushToken'));
            
            if (tokens.length > 0) {
                expoPushService.sendExpoPushNotification(
                    tokens,
                    `Request Cancelled`,
                    `The ${request.specialization} consultation request has been cancelled`,
                    { request_id: requestId.toString(), type: 'REQUEST_CANCELLED' }
                ).catch(err => console.error('Push notification error:', err));
            }
        }
        
        res.json({
            success: true,
            message: 'Request cancelled successfully',
            data: { request_id: requestId, status: 'CANCELLED' }
        });
        
    } catch (error) {
        console.error('❌ Error cancelling request:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to cancel request',
            details: error.message
        });
    }
};

/**
 * Get statistics for host dashboard
 */
exports.getHostStatistics = async (req, res) => {
    try {
        const { userId } = req.params;
        
        console.log(`📊 Fetching statistics for host ID: ${userId}`);
        
        const userIdInt = parseInt(userId);
        
        const totalRequests = await Request.count({ where: { user_id: userIdInt } });
        const pendingRequests = await Request.count({ where: { user_id: userIdInt, status: { [Op.in]: ['PENDING', 'ACCEPTED'] } } });
        const confirmedRequests = await Request.count({ where: { user_id: userIdInt, status: 'CONFIRMED' } });
        const completedRequests = await Request.count({ where: { user_id: userIdInt, status: 'COMPLETED' } });
        const cancelledRequests = await Request.count({ where: { user_id: userIdInt, status: 'CANCELLED' } });
        
        const spendingResult = await Request.findAll({
            where: { user_id: userIdInt, status: 'COMPLETED' },
            attributes: [[sequelize.fn('SUM', sequelize.col('offering_rupees')), 'total_spent']],
            raw: true
        });
        
        const totalSpent = spendingResult[0]?.total_spent || 0;
        
        const stats = {
            totalRequests,
            pendingRequests,
            confirmedRequests,
            completedRequests,
            cancelledRequests,
            totalSpent: parseFloat(totalSpent) || 0,
            fulfillment_rate: totalRequests > 0 ? ((completedRequests / totalRequests) * 100).toFixed(1) : 0,
            cancellation_rate: totalRequests > 0 ? ((cancelledRequests / totalRequests) * 100).toFixed(1) : 0
        };
        
        console.log(`✅ Stats retrieved for host ${userId}:`, stats);
        
        res.json({
            success: true,
            data: stats,
            message: 'Statistics retrieved successfully'
        });
        
    } catch (error) {
        console.error('❌ Error fetching host statistics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch statistics',
            details: error.message
        });
    }
};

module.exports = exports;
