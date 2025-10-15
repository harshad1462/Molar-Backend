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
 * Get all requests created by the host with filtering
 * Supports filter parameter: my_requests, incoming, ongoing_requests, past_requests
 */
exports.getHostRequests = async (req, res) => {
  try {
    const { userId } = req.params;
    const { filter, page = 1, limit = 20 } = req.query;
    
    console.log(`📍 Fetching host requests for user ID: ${userId}, filter: ${filter || 'all'}`);
    
    let whereConditions = {
      user_id: parseInt(userId)
    };
    
    // Apply filter based on frontend filter type
    if (filter) {
      switch (filter) {
        case 'my_requests':
          // PENDING or ACCEPTED (waiting for doctor selection)
          whereConditions.status = { [Op.in]: ['PENDING', 'ACCEPTED'] };
          whereConditions.assigned_doctor_id = null;
          break;
        case 'incoming':
          // CONFIRMED (doctor assigned but not started by doctor)
          whereConditions.status = 'CONFIRMED';
          whereConditions.assigned_doctor_id = { [Op.not]: null };
          break;
        case 'ongoing_requests':
          // STARTED (doctor has started consultation)
          whereConditions.status = 'STARTED';
          break;
        case 'past_requests':
          // COMPLETED or CANCELLED
          whereConditions.status = { [Op.in]: ['COMPLETED', 'CANCELLED'] };
          break;
      }
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
          attributes: [
            'user_id', 'name', 'phone_number', 'email', 
            'specialization', 'qualification', 'profile_pic_url', 'experience'
          ],
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
      
      const acceptedByUserIds = parseJSONField(requestData.accepted_by_user_ids);
      const sentToUserIds = parseJSONField(requestData.sent_to_user_ids);
      
      if (acceptedByUserIds && acceptedByUserIds.length > 0) {
        const acceptedDoctors = await User.findAll({
          where: {
            user_id: { [Op.in]: acceptedByUserIds }
          },
          attributes: [
            'user_id', 'name', 'phone_number', 'email',
            'specialization', 'qualification', 'profile_pic_url', 'experience'
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
 * Get incoming requests (CONFIRMED status with assigned doctor)
 * Doctor will start these, not the host
 */
exports.getIncomingRequests = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    console.log(`📍 Fetching incoming requests for user ID: ${userId}`);
    
    const offset = (page - 1) * limit;
    
    const { count, rows: requests } = await Request.findAndCountAll({
      where: {
        user_id: parseInt(userId),
        status: 'CONFIRMED',
        assigned_doctor_id: { [Op.not]: null }
      },
      include: [
        {
          model: Clinic,
          as: 'clinic',
          attributes: ['clinic_id', 'clinic_name', 'city', 'address', 'area', 'pin_code']
        },
        {
          model: User,
          as: 'assignedDoctor',
          attributes: [
            'user_id', 'name', 'phone_number', 'email',
            'specialization', 'qualification', 'profile_pic_url', 'experience'
          ]
        }
      ],
      order: [['request_datetime', 'ASC']],
      limit: parseInt(limit),
      offset: offset
    });
    
    console.log(`✅ Found ${count} incoming requests`);
    
    res.json({
      success: true,
      data: requests.map(r => r.toJSON()),
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(count / limit),
        total: count,
        per_page: parseInt(limit)
      },
      message: `Found ${count} incoming requests`
    });
    
  } catch (error) {
    console.error('❌ Error fetching incoming requests:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch incoming requests',
      details: error.message
    });
  }
};

/**
 * Get ongoing requests (STARTED status)
 * These are consultations that doctor has started
 */
exports.getOngoingRequests = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    console.log(`📍 Fetching ongoing requests for user ID: ${userId}`);
    
    const offset = (page - 1) * limit;
    
    const { count, rows: requests } = await Request.findAndCountAll({
      where: {
        user_id: parseInt(userId),
        status: 'STARTED'
      },
      include: [
        {
          model: Clinic,
          as: 'clinic',
          attributes: ['clinic_id', 'clinic_name', 'city', 'address', 'area', 'pin_code']
        },
        {
          model: User,
          as: 'assignedDoctor',
          attributes: [
            'user_id', 'name', 'phone_number', 'email',
            'specialization', 'qualification', 'profile_pic_url', 'experience'
          ]
        }
      ],
      order: [['request_datetime', 'ASC']],
      limit: parseInt(limit),
      offset: offset
    });
    
    console.log(`✅ Found ${count} ongoing requests`);
    
    res.json({
      success: true,
      data: requests.map(r => r.toJSON()),
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(count / limit),
        total: count,
        per_page: parseInt(limit)
      },
      message: `Found ${count} ongoing requests`
    });
    
  } catch (error) {
    console.error('❌ Error fetching ongoing requests:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ongoing requests',
      details: error.message
    });
  }
};

/**
 * Get past requests (COMPLETED or CANCELLED)
 */
exports.getPastRequests = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    console.log(`📍 Fetching past requests for user ID: ${userId}`);
    
    const offset = (page - 1) * limit;
    
    const { count, rows: requests } = await Request.findAndCountAll({
      where: {
        user_id: parseInt(userId),
        status: { [Op.in]: ['COMPLETED', 'CANCELLED'] }
      },
      include: [
        {
          model: Clinic,
          as: 'clinic',
          attributes: ['clinic_id', 'clinic_name', 'city', 'address', 'area', 'pin_code']
        },
        {
          model: User,
          as: 'assignedDoctor',
          attributes: [
            'user_id', 'name', 'phone_number', 'email',
            'specialization', 'qualification', 'profile_pic_url', 'experience'
          ],
          required: false
        }
      ],
      order: [['updated_date', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });
    
    console.log(`✅ Found ${count} past requests`);
    
    res.json({
      success: true,
      data: requests.map(r => r.toJSON()),
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(count / limit),
        total: count,
        per_page: parseInt(limit)
      },
      message: `Found ${count} past requests`
    });
    
  } catch (error) {
    console.error('❌ Error fetching past requests:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch past requests',
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
          attributes: [
            'user_id', 'name', 'phone_number', 'email', 
            'specialization', 'qualification', 'profile_pic_url', 'experience'
          ],
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
          user_id: { [Op.in]: acceptedByUserIds }
        },
        attributes: [
          'user_id', 'name', 'phone_number', 'email',
          'specialization', 'qualification', 'profile_pic_url', 'experience'
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
 * Moves from ACCEPTED to CONFIRMED status
 * Sets assigned_doctor_id
 */
exports.confirmDoctor = async (req, res) => {
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
      accepted_by_user_ids: updatedAcceptedByUserIds,
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
    
    // My Requests: PENDING/ACCEPTED with no assigned doctor
    const myRequests = await Request.count({
      where: {
        user_id: userIdInt,
        status: { [Op.in]: ['PENDING', 'ACCEPTED'] },
        assigned_doctor_id: null
      }
    });
    
    // Incoming: CONFIRMED with assigned doctor
    const incomingRequests = await Request.count({
      where: {
        user_id: userIdInt,
        status: 'CONFIRMED',
        assigned_doctor_id: { [Op.not]: null }
      }
    });
    
    // Ongoing: STARTED by doctor
    const ongoingRequests = await Request.count({
      where: {
        user_id: userIdInt,
        status: 'STARTED'
      }
    });
    
    // Completed
    const completedRequests = await Request.count({
      where: {
        user_id: userIdInt,
        status: 'COMPLETED'
      }
    });
    
    // Cancelled
    const cancelledRequests = await Request.count({
      where: {
        user_id: userIdInt,
        status: 'CANCELLED'
      }
    });
    
    // Total
    const totalRequests = await Request.count({
      where: { user_id: userIdInt }
    });
    
    // Total spent on completed requests
    const spendingResult = await Request.findAll({
      where: { user_id: userIdInt, status: 'COMPLETED' },
      attributes: [[sequelize.fn('SUM', sequelize.col('offering_rupees')), 'total_spent']],
      raw: true
    });
    
    const totalSpent = spendingResult[0]?.total_spent || 0;
    
    const stats = {
      totalRequests,
      myRequests,
      incomingRequests,
      ongoingRequests,
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







/**
 * Complete a consultation request
 * Moves from STARTED → COMPLETED
 */
exports.completeRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { user_id, completion_notes } = req.body;
    
    const userId = parseInt(user_id);
    
    console.log(`✅ Host ${userId} completing request ${requestId}`);
    
    const request = await Request.findByPk(requestId, {
      include: [
        {
          model: User,
          as: 'assignedDoctor',
          attributes: ['user_id', 'name', 'fcm_token']
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
        error: 'You are not authorized to complete this request'
      });
    }
    
    if (request.status !== 'STARTED') {
      return res.status(400).json({
        success: false,
        error: `Cannot complete request with status ${request.status}. Only STARTED requests can be completed.`
      });
    }
    
    const host = await User.findByPk(userId);
    
    await request.update({
      status: 'COMPLETED',
      completion_notes: completion_notes || 'Completed by host',
      updated_by: host?.name || 'host',
      updated_date: new Date()
    });
    
    console.log(`✅ Request ${requestId} completed successfully`);
    
    // Send notification to doctor
    if (request.assignedDoctor?.fcm_token) {
      expoPushService.sendExpoPushNotification(
        [request.assignedDoctor.fcm_token],
        `Consultation Completed`,
        `The consultation for ${request.specialization} has been marked as completed`,
        { 
          request_id: requestId.toString(), 
          type: 'CONSULTATION_COMPLETED',
          status: 'COMPLETED'
        }
      ).catch(err => console.error('Push notification error:', err));
    }
    
    res.json({
      success: true,
      message: 'Consultation completed successfully',
      data: { 
        request_id: requestId, 
        status: 'COMPLETED',
        completion_time: new Date()
      }
    });
    
  } catch (error) {
    console.error('❌ Error completing request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete request',
      details: error.message
    });
  }
};


module.exports = exports;
