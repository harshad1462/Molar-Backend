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

// ✅ HELPER FUNCTION TO FIX MARIADB JSON PARSING
const parseJSONField = (field) => {
    if (!field) return [];
    if (Array.isArray(field)) return field;
    if (typeof field === 'string') {
        try {
            const parsed = JSON.parse(field);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.error('JSON parse error:', e);
            return [];
        }
    }
    return [];
};

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
                    attributes: ['clinic_id', 'clinic_name', 'city', 'address', 'area', 'pin_code', 'user_id'],
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
        
        // ✅ FETCH ACCEPTED DOCTORS FOR EACH REQUEST - WITH JSON PARSING
        const enrichedRequests = await Promise.all(requests.map(async (request) => {
            const requestData = request.toJSON();
            
            // ✅ PARSE JSON FIELDS BEFORE USING THEM
            const acceptedByUserIds = parseJSONField(requestData.accepted_by_user_ids);
            const sentToUserIds = parseJSONField(requestData.sent_to_user_ids);
            
            if (acceptedByUserIds && acceptedByUserIds.length > 0) {
                const acceptedDoctors = await User.findAll({
                    where: {
                        user_id: {
                            [Op.in]: acceptedByUserIds  // ✅ NOW IT'S AN ARRAY
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
            
            requestData.pendingDoctorsCount = sentToUserIds.length;
            
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
                    attributes: ['clinic_id', 'clinic_name', 'city', 'address', 'area', 'pin_code', 'user_id'],
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
        
        // ✅ PARSE JSON FIELD BEFORE USING IT
        const acceptedByUserIds = parseJSONField(requestData.accepted_by_user_ids);
        
        if (acceptedByUserIds && acceptedByUserIds.length > 0) {
            const acceptedDoctors = await User.findAll({
                where: {
                    user_id: {
                        [Op.in]: acceptedByUserIds  // ✅ NOW IT'S AN ARRAY
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
/**
 * Confirm/Select a specific doctor for a request
 * Only updates the request - NO appointment creation
 */
exports.confirmDoctor = async (req, res) => {
    // ✅ USE TRANSACTION TO ENSURE DATA CONSISTENCY
    const t = await sequelize.transaction();
    
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
            ],
            transaction: t
        });
        
        if (!request) {
            await t.rollback();
            return res.status(404).json({
                success: false,
                error: 'Request not found'
            });
        }
        
        if (request.user_id !== userId) {
            await t.rollback();
            return res.status(403).json({
                success: false,
                error: 'You are not authorized to confirm doctors for this request'
            });
        }
        
        const acceptedByUserIds = parseJSONField(request.accepted_by_user_ids);
        
        if (!acceptedByUserIds || !acceptedByUserIds.includes(doctorId)) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                error: 'This doctor has not accepted the request yet'
            });
        }
        
        const doctor = await User.findByPk(doctorId, { transaction: t });
        const host = await User.findByPk(userId, { transaction: t });
        
        if (!doctor) {
            await t.rollback();
            return res.status(404).json({
                success: false,
                error: 'Doctor not found'
            });
        }
        
        // ✅ REMOVE ONLY THE ASSIGNED DOCTOR FROM accepted_by_user_ids
                const updatedAcceptedByUserIds = acceptedByUserIds.filter(id => id !== doctorId);

        console.log(`📋 Removing doctor ${doctorId} from accepted_by_user_ids`);
        console.log(`👥 Before: ${acceptedByUserIds.length} doctors | After: ${updatedAcceptedByUserIds.length} doctors`);
        
        // ✅ UPDATE REQUEST STATUS TO CONFIRMED
        await request.update({
            assigned_doctor_id: doctorId,
            accepted_by_user_ids: updatedAcceptedByUserIds,  // ✅ REMOVE ASSIGNED DOCTOR
            status: 'CONFIRMED',
            confirmation_notes: confirmation_notes || null,
            updated_by: host?.name || 'host',
            updated_date: new Date()
        }, { transaction: t });
        
        console.log(`✅ Request ${requestId} confirmed with doctor ${doctorId}`);
        
        // ✅ COMMIT TRANSACTION
        await t.commit();
        
        // ✅ FETCH UPDATED REQUEST
        const updatedRequest = await Request.findByPk(requestId, {
            include: [
                {
                    model: Clinic,
                    as: 'clinic',
                    attributes: ['clinic_id', 'clinic_name', 'city', 'address']
                },
                {
                    model: User,
                    as: 'assignedDoctor',
                    attributes: ['user_id', 'name', 'phone_number', 'email', 'specialization', 'profile_pic_url']
                }
            ]
        });
        
        const appointmentDateTime = new Date(request.request_datetime);
        
        // ✅ SEND NOTIFICATION TO CONFIRMED DOCTOR
        if (doctor?.fcm_token) {
            expoPushService.sendExpoPushNotification(
                [doctor.fcm_token],
                `🎉 You've Been Confirmed!`,
                `${request.clinic?.clinic_name || 'A clinic'} confirmed you for ${request.specialization} on ${appointmentDateTime.toLocaleDateString()}`,
                {
                    request_id: requestId.toString(),
                    type: 'DOCTOR_CONFIRMED',
                    clinic_id: request.clinic_id.toString(),
                    clinic_name: request.clinic?.clinic_name || '',
                    date: appointmentDateTime.toISOString(),
                    amount: request.offering_rupees.toString(),
                    specialization: request.specialization,
                    status: 'CONFIRMED'
                }
            ).catch(err => console.error('Push notification error:', err));
        }
        
        // ✅ SEND NOTIFICATION TO HOST
        if (host?.fcm_token) {
            expoPushService.sendExpoPushNotification(
                [host.fcm_token],
                `✅ Doctor Confirmed`,
                `Dr. ${doctor?.name} confirmed for ${request.specialization} on ${appointmentDateTime.toLocaleDateString()}`,
                {
                    request_id: requestId.toString(),
                    type: 'DOCTOR_CONFIRMED',
                    doctor_id: doctorId.toString(),
                    doctor_name: doctor?.name || 'Doctor',
                    date: appointmentDateTime.toISOString(),
                    specialization: request.specialization,
                    status: 'CONFIRMED'
                }
            ).catch(err => console.error('Push notification error:', err));
        }
        
        // ✅ NOTIFY OTHER DOCTORS
        if (updatedAcceptedByUserIds.length > 0) {
            const otherDoctors = await User.findAll({
                where: { user_id: { [Op.in]: updatedAcceptedByUserIds } },
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
        
        // ✅ RETURN ONLY REQUEST DATA
        res.json({
            success: true,
            data: updatedRequest,
            message: 'Doctor confirmed successfully',
            doctor_info: {
                doctor_id: doctorId,
                doctor_name: doctor?.name || 'Unknown',
                doctor_phone: doctor?.phone_number
            },
            request_info: {
                request_id: requestId,
                date: appointmentDateTime,
                amount: request.offering_rupees,
                status: 'CONFIRMED'
            },
            remaining_accepted_doctors: updatedAcceptedByUserIds.length
        });
        
    } catch (error) {
        // ✅ ROLLBACK ON ERROR
        await t.rollback();
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
        
        // ✅ PARSE JSON FIELD BEFORE USING IT
        const acceptedByUserIds = parseJSONField(request.accepted_by_user_ids);
        
        if (acceptedByUserIds && acceptedByUserIds.length > 0) {
            const doctors = await User.findAll({
                where: { user_id: { [Op.in]: acceptedByUserIds } },
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
