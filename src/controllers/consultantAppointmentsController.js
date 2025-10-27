const initModels = require('../models/init-models');
const sequelize = require('../config/database');
const { Op } = require('sequelize');

const models = initModels(sequelize);
const Request = models.requests;
const Clinic = models.clinics;
const User = models.users;

// Helper function for JSON parsing
const parseJSONField = (field) => {
    if (!field) return [];
    if (Array.isArray(field)) return field;
    if (typeof field === 'string') {
        try {
            const parsed = JSON.parse(field);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }
    return [];
};

/**
 * Get all appointments for a consultant/doctor
 * Status mapping:
 * - ACCEPTED → My Appointments (accepted but not confirmed by host yet)
 * - CONFIRMED → Upcoming (confirmed by host)
 * - STARTED → Ongoing (consultation in progress)
 * - COMPLETED → Completed (consultation finished)
 */
/**
 * Get all appointments for a consultant/doctor
 */
exports.getConsultantAppointments = async (req, res) => {
    try {
        const { consultantId } = req.params;
        const { status, page = 1, limit = 20 } = req.query;
        
        const doctorId = parseInt(consultantId);
        const offset = (page - 1) * limit;
        
        console.log(`📍 Fetching appointments for consultant ${doctorId}, status: ${status || 'all'}`);
        
        let whereConditions = {};
        
        // Map status to backend conditions
        if (status === 'upcoming') {
            whereConditions.status = 'CONFIRMED';
            whereConditions.assigned_doctor_id = doctorId;
        } else if (status === 'ongoing') {
            whereConditions.status = 'STARTED';
            whereConditions.assigned_doctor_id = doctorId;
        } else if (status === 'completed') {
            whereConditions.status = 'COMPLETED';
            whereConditions.assigned_doctor_id = doctorId;
        } else if (status === 'accepted') {
            whereConditions.status = 'ACCEPTED';
            whereConditions[Op.and] = [
                sequelize.literal(`JSON_CONTAINS(accepted_by_user_ids, '${doctorId}')`)
            ];
        } else {
            whereConditions[Op.or] = [
                sequelize.literal(`JSON_CONTAINS(accepted_by_user_ids, '${doctorId}')`),
                { assigned_doctor_id: doctorId }
            ];
        }
        
        const { count, rows: requests } = await Request.findAndCountAll({
            where: whereConditions,
            include: [
                {
                    model: Clinic,
                    as: 'clinic',
                    // ✅ FIXED: Use clinic_latitude and clinic_longitude
                    attributes: ['clinic_id', 'clinic_name', 'city', 'address', 'area', 'pin_code', 'clinic_latitude', 'clinic_longitude'],
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: ['user_id', 'name', 'phone_number', 'email', 'profile_pic_url']
                        }
                    ]
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['user_id', 'name', 'phone_number', 'email', 'profile_pic_url']
                },
                {
                    model: User,
                    as: 'assignedDoctor',
                    attributes: ['user_id', 'name', 'specialization', 'phone_number'],
                    required: false
                }
            ],
            order: [['request_datetime', 'ASC']],
            limit: parseInt(limit),
            offset: offset
        });
        
        // Transform requests to appointment format
        const transformedAppointments = requests.map(request => {
            const requestData = request.toJSON();
            const acceptedByUserIds = parseJSONField(requestData.accepted_by_user_ids);
            const appointmentDate = new Date(requestData.request_datetime);
            
            const hostUser = requestData.creator || requestData.clinic?.user;
            
            return {
                id: requestData.request_id,
                requestId: requestData.request_id,
                patientName: hostUser?.name || 'Unknown Host',
                patientImage: hostUser?.profile_pic_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(hostUser?.name || 'User')}&background=random`,
                hostName: hostUser?.name,
                hostPhone: hostUser?.phone_number,
                hostEmail: hostUser?.email,
                clinicName: requestData.clinic?.clinic_name || '',
                procedure: requestData.specialization,
                description: requestData.requirements || `${requestData.specialization} consultation`,
                date: appointmentDate.toLocaleDateString('en-GB', { 
                    day: '2-digit', 
                    month: 'short', 
                    year: 'numeric' 
                }),
                time: appointmentDate.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                }),
                dateTime: appointmentDate.toISOString(),
                status: requestData.status === 'CONFIRMED' ? 'upcoming' : 
                        requestData.status === 'STARTED' ? 'ongoing' : 
                        requestData.status === 'COMPLETED' ? 'completed' : 
                        requestData.status === 'ACCEPTED' ? 'accepted' : 'pending',
                duration: `${requestData.duration_minutes || 60} mins`,
                durationMinutes: requestData.duration_minutes || 60,
                type: 'In-Person',
                fee: `₹${requestData.offering_rupees}`,
                amount: parseFloat(requestData.offering_rupees),
                contactNumber: hostUser?.phone_number,
                specialization: requestData.specialization,
                city: requestData.clinic?.city || '',
                area: requestData.clinic?.area || '',
                // ✅ FIXED: Use clinic_latitude and clinic_longitude
                location: requestData.clinic ? {
                    address: requestData.clinic.address || '',
                    city: requestData.clinic.city || '',
                    area: requestData.clinic.area || '',
                    pinCode: requestData.clinic.pin_code || '',
                    coordinates: {
                        latitude: requestData.clinic.clinic_latitude || 0,
                        longitude: requestData.clinic.clinic_longitude || 0
                    },
                    placeName: requestData.clinic.clinic_name || ''
                } : null,
                startedAt: requestData.status === 'STARTED' ? new Date(requestData.updated_date).toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                }) : null,
                completedAt: requestData.status === 'COMPLETED' ? new Date(requestData.updated_date).toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                }) : null,
                isConfirmed: requestData.assigned_doctor_id === doctorId,
                isAssigned: requestData.assigned_doctor_id === doctorId,
                totalAccepted: acceptedByUserIds.length,
                confirmationNotes: requestData.confirmation_notes,
                treatmentNotes: requestData.treatment_notes,
                prescriptions: requestData.prescriptions,
                createdDate: requestData.created_date,
                updatedDate: requestData.updated_date
            };
        });
        
        console.log(`✅ Found ${transformedAppointments.length} appointments for consultant ${doctorId}`);
        
        res.json({
            success: true,
            data: transformedAppointments,
            pagination: {
                current_page: parseInt(page),
                total_pages: Math.ceil(count / limit),
                total: count,
                per_page: parseInt(limit)
            },
            message: `Found ${count} appointments`
        });
        
    } catch (error) {
        console.error('❌ Error fetching consultant appointments:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch appointments',
            details: error.message
        });
    }
};


/**
 * Get single appointment details
 */
exports.getConsultantAppointmentById = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { consultantId } = req.query;
        
        const request = await Request.findByPk(appointmentId, {
            include: [
                {
                    model: Clinic,
                    as: 'clinic',
                    attributes: ['clinic_id', 'clinic_name', 'city', 'address', 'area', 'pin_code', 'clinic_latitude', 'clinic_longitude'],
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: ['user_id', 'name', 'phone_number', 'email', 'profile_pic_url']
                        }
                    ]
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['user_id', 'name', 'phone_number', 'email', 'profile_pic_url']
                },
                {
                    model: User,
                    as: 'assignedDoctor',
                    attributes: ['user_id', 'name', 'specialization', 'phone_number'],
                    required: false
                }
            ]
        });
        
        if (!request) {
            return res.status(404).json({
                success: false,
                error: 'Appointment not found'
            });
        }
        
        const requestData = request.toJSON();
        const acceptedByUserIds = parseJSONField(requestData.accepted_by_user_ids);
        const doctorId = parseInt(consultantId);
        
        // Check if consultant has access
        const hasAccess = acceptedByUserIds.includes(doctorId) || requestData.assigned_doctor_id === doctorId;
        
        if (consultantId && !hasAccess) {
            return res.status(403).json({
                success: false,
                error: 'You are not authorized to view this appointment'
            });
        }
        
        res.json({
            success: true,
            data: requestData
        });
        
    } catch (error) {
        console.error('❌ Error fetching appointment details:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch appointment details',
            details: error.message
        });
    }
};

/**
 * Start consultation
 */
exports.startConsultation = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { consultant_id } = req.body;
        
        const request = await Request.findByPk(appointmentId);
        
        if (!request) {
            return res.status(404).json({ 
                success: false, 
                error: 'Appointment not found' 
            });
        }
        
        if (request.assigned_doctor_id !== parseInt(consultant_id)) {
            return res.status(403).json({ 
                success: false, 
                error: 'You are not assigned to this appointment' 
            });
        }
        
        if (request.status !== 'CONFIRMED') {
            return res.status(400).json({ 
                success: false, 
                error: `Cannot start consultation. Current status: ${request.status}` 
            });
        }
        
        const doctor = await User.findByPk(consultant_id);
        
        await request.update({
            status: 'STARTED',
            updated_by: doctor?.name || 'doctor',
            updated_date: new Date()
        });
        
        console.log(`✅ Consultation started for appointment ${appointmentId} by doctor ${consultant_id}`);
        
        res.json({
            success: true,
            data: request,
            message: 'Consultation started successfully'
        });
        
    } catch (error) {
        console.error('❌ Error starting consultation:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to start consultation', 
            details: error.message 
        });
    }
};

/**
 * Complete consultation
 */
exports.completeConsultation = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { consultant_id, treatment_notes, prescriptions } = req.body;
        
        const request = await Request.findByPk(appointmentId);
        
        if (!request) {
            return res.status(404).json({ 
                success: false, 
                error: 'Appointment not found' 
            });
        }
        
        if (request.assigned_doctor_id !== parseInt(consultant_id)) {
            return res.status(403).json({ 
                success: false, 
                error: 'You are not assigned to this appointment' 
            });
        }
        
        if (request.status !== 'STARTED') {
            return res.status(400).json({ 
                success: false, 
                error: `Cannot complete consultation. Current status: ${request.status}` 
            });
        }
        
        const doctor = await User.findByPk(consultant_id);
        
        await request.update({
            status: 'COMPLETED',
            treatment_notes: treatment_notes || null,
            prescriptions: prescriptions || null,
            updated_by: doctor?.name || 'doctor',
            updated_date: new Date()
        });
        
        console.log(`✅ Consultation completed for appointment ${appointmentId} by doctor ${consultant_id}`);
        
        res.json({
            success: true,
            data: request,
            message: 'Consultation completed successfully'
        });
        
    } catch (error) {
        console.error('❌ Error completing consultation:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to complete consultation', 
            details: error.message 
        });
    }
};

/**
 * Get appointment statistics for consultant
 */
exports.getConsultantStatistics = async (req, res) => {
    try {
        const { consultantId } = req.params;
        const doctorId = parseInt(consultantId);
        
        const totalAccepted = await Request.count({
            where: sequelize.literal(`JSON_CONTAINS(accepted_by_user_ids, '${doctorId}')`)
        });
        
        const totalConfirmed = await Request.count({
            where: { 
                assigned_doctor_id: doctorId,
                status: { [Op.in]: ['CONFIRMED', 'STARTED', 'COMPLETED'] }
            }
        });
        
        const upcoming = await Request.count({
            where: { 
                assigned_doctor_id: doctorId,
                status: 'CONFIRMED'
            }
        });
        
        const ongoing = await Request.count({
            where: { 
                assigned_doctor_id: doctorId,
                status: 'STARTED'
            }
        });
        
        const completed = await Request.count({
            where: { 
                assigned_doctor_id: doctorId,
                status: 'COMPLETED'
            }
        });
        
        const earningsResult = await Request.findAll({
            where: { 
                assigned_doctor_id: doctorId,
                status: 'COMPLETED'
            },
            attributes: [[sequelize.fn('SUM', sequelize.col('offering_rupees')), 'total_earnings']],
            raw: true
        });
        
        const totalEarnings = earningsResult[0]?.total_earnings || 0;
        
        const stats = {
            totalAccepted,
            totalConfirmed,
            upcoming,
            ongoing,
            completed,
            totalEarnings: parseFloat(totalEarnings) || 0,
            completionRate: totalConfirmed > 0 ? ((completed / totalConfirmed) * 100).toFixed(1) : 0
        };
        
        console.log(`✅ Statistics retrieved for consultant ${consultantId}:`, stats);
        
        res.json({
            success: true,
            data: stats,
            message: 'Statistics retrieved successfully'
        });
        
    } catch (error) {
        console.error('❌ Error fetching consultant statistics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch statistics',
            details: error.message
        });
    }
};




/**
 * Get appointment counts by status for filter badges
 */
exports.getConsultantAppointmentCounts = async (req, res) => {
    try {
        const { consultantId } = req.params;
        const doctorId = parseInt(consultantId);
        
        console.log(`📊 Fetching appointment counts for consultant ${doctorId}`);
        
        // Count upcoming (CONFIRMED)
        const upcoming = await Request.count({
            where: { 
                assigned_doctor_id: doctorId,
                status: 'CONFIRMED'
            }
        });
        
        // Count ongoing (STARTED)
        const ongoing = await Request.count({
            where: { 
                assigned_doctor_id: doctorId,
                status: 'STARTED'
            }
        });
        
        // Count completed (COMPLETED)
        const completed = await Request.count({
            where: { 
                assigned_doctor_id: doctorId,
                status: 'COMPLETED'
            }
        });
        
        const counts = {
            upcoming,
            ongoing,
            completed,
            total: upcoming + ongoing + completed
        };
        
        console.log(`✅ Counts for consultant ${doctorId}:`, counts);
        
        res.json({
            success: true,
            data: counts,
            message: 'Counts retrieved successfully'
        });
        
    } catch (error) {
        console.error('❌ Error fetching counts:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch counts',
            details: error.message
        });
    }
};


// ============================================
// OTP FOR CONSULTATION START
// ============================================

// In-memory OTP storage (5 minutes expiry, static OTP: 1234)
const otpStore = new Map();

/**
 * Send OTP to clinic for consultation start verification
 */
exports.sendConsultationStartOTP = async (req, res) => {
  try {
    const { request_id, consultant_id } = req.body;
    
    console.log(`📱 Sending OTP for request ${request_id}, consultant ${consultant_id}`);
    
    // Validate request exists and consultant is assigned
    const request = await Request.findOne({
      where: {
        request_id: request_id,
        assigned_doctor_id: parseInt(consultant_id),
        status: 'CONFIRMED'
      },
      include: [
        {
          model: Clinic,
          as: 'clinic',
          attributes: ['clinic_id', 'clinic_name', 'user_id'],
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['user_id', 'name', 'phone_number']
            }
          ]
        }
      ]
    });
    
    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Request not found or you are not authorized'
      });
    }
    
    // Get clinic owner's phone number
    const clinicPhone = request.clinic?.user?.phone_number;
    
    if (!clinicPhone) {
      return res.status(400).json({
        success: false,
        error: 'Clinic phone number not found'
      });
    }
    
    // Generate static OTP (or dynamic in production)
    const otp = '1234'; // Static for testing
    
    const expiryTime = Date.now() + 5 * 60 * 1000; // 5 minutes
    
    // Store OTP
    const otpKey = `consultation_start_${request_id}`;
    otpStore.set(otpKey, {
      otp: otp,
      expiryTime: expiryTime,
      clinicPhone: clinicPhone,
      consultantId: consultant_id,
      attempts: 0,
      createdAt: Date.now()
    });
    
    console.log(`✅ OTP stored: ${otp} (expires in 5 minutes)`);
    
    return res.status(200).json({
      success: true,
      message: `OTP sent to clinic phone ending with ${clinicPhone.slice(-4)}`,
      masked_phone: `******${clinicPhone.slice(-4)}`,
      debug_otp: otp // Remove in production
    });
    
  } catch (error) {
    console.error('❌ Error sending consultation start OTP:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send OTP',
      details: error.message
    });
  }
};

/**
 * Verify OTP for consultation start
 */
exports.verifyConsultationStartOTP = async (req, res) => {
  try {
    const { request_id, consultant_id, otp } = req.body;
    
    console.log(`🔐 Verifying OTP for request ${request_id}`);
    
    const otpKey = `consultation_start_${request_id}`;
    const storedData = otpStore.get(otpKey);
    
    if (!storedData) {
      return res.status(400).json({
        success: false,
        error: 'OTP expired or not found. Please request a new OTP.'
      });
    }
    
    // Check expiry (5 minutes)
    if (Date.now() > storedData.expiryTime) {
      otpStore.delete(otpKey);
      return res.status(400).json({
        success: false,
        error: 'OTP has expired. Please request a new OTP.'
      });
    }
    
    // Check attempts (max 3)
    if (storedData.attempts >= 3) {
      otpStore.delete(otpKey);
      return res.status(400).json({
        success: false,
        error: 'Maximum OTP attempts exceeded. Please request a new OTP.'
      });
    }
    
    // Verify consultant ID matches
    if (storedData.consultantId !== consultant_id) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized consultant'
      });
    }
    
    // Verify OTP
    if (storedData.otp !== otp.toString()) {
      storedData.attempts += 1;
      otpStore.set(otpKey, storedData);
      
      return res.status(400).json({
        success: false,
        error: `Invalid OTP. ${3 - storedData.attempts} attempts remaining.`
      });
    }
    
    // OTP is valid - Clear it immediately
    otpStore.delete(otpKey);
    
    console.log(`✅ OTP verified successfully for request ${request_id}`);
    
    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      verified: true
    });
    
  } catch (error) {
    console.error('❌ Error verifying consultation start OTP:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to verify OTP',
      details: error.message
    });
  }
};

// Auto-cleanup expired OTPs every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of otpStore.entries()) {
    if (now > data.expiryTime) {
      otpStore.delete(key);
      console.log(`🧹 Cleaned up expired OTP: ${key}`);
    }
  }
}, 10 * 60 * 1000);



module.exports = exports;
