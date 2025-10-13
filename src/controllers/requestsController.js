// // Fix the import - you need to use initModels
// const initModels = require('../models/init-models');
// const sequelize = require('../config/database'); // Your sequelize instance
// const { Op } = require('sequelize');

// // Initialize models
// const models = initModels(sequelize);

// // Extract models (use lowercase names as returned by initModels)
// const Request = models.requests;  // This should work now
// const Clinic = models.clinics;
// const User = models.users;

// // Create a new request and send to qualified doctors
// exports.createRequest = async (req, res) => {
//     try {
//         const {
//             specialization,
//             requirements,
//             clinic_id,
//             duration_minutes,
//             request_datetime,
//             offering_rupees
//         } = req.body;

//         // Validate required fields
//         if (!specialization || !clinic_id || !duration_minutes || !request_datetime || !offering_rupees) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Missing required fields'
//             });
//         }

//         // Check if request datetime is in future
//         if (new Date(request_datetime) <= new Date()) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Request datetime must be in the future'
//             });
//         }

//         // Get clinic details
//         const clinic = await Clinic.findByPk(clinic_id);
//         if (!clinic) {
//             return res.status(404).json({
//                 success: false,
//                 error: 'Clinic not found'
//             });
//         }

//         // Find qualified doctors (simplified - no city filtering for now)
//         const qualifiedDoctors = await User.findAll({
//             where: {
//                 role: 'DOCTOR',
//                 status: 'ACTIVE',
//                 is_verified: true,
//                 specialization: specialization
//             },
//             attributes: ['user_id', 'name', 'phone_number', 'specialization']
//         });

//         const sent_to_user_ids = qualifiedDoctors.map(doctor => doctor.user_id);

//         if (sent_to_user_ids.length === 0) {
//             return res.status(404).json({
//                 success: false,
//                 error: `No verified doctors found for specialization: ${specialization}`
//             });
//         }

//         // Create the request (remove user_id for now to test)
//         const request = await Request.create({
//             specialization,
//             requirements,
//             clinic_id,
//             duration_minutes,
//             request_datetime,
//             offering_rupees,
//             user_id: 1, // Hardcode for testing - replace with req.user.user_id later
//             sent_to_user_ids,
//             status: 'PENDING',
//             created_by: 'clinic', // Replace with req.user.username later
//             created_date: new Date()
//         });

//         res.status(201).json({
//             success: true,
//             data: {
//                 request,
//                 sent_to_doctors: qualifiedDoctors,
//                 total_doctors_contacted: sent_to_user_ids.length
//             },
//             message: `Request created and sent to ${sent_to_user_ids.length} verified doctors`
//         });

//     } catch (error) {
//         console.error('Error creating request:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to create request',
//             details: error.message
//         });
//     }
// };




// const initModels = require('../models/init-models');
// const sequelize = require('../config/database');
// const { Op } = require('sequelize');
// const jwt = require('jsonwebtoken');
// const fcmService = require('../services/fcmService'); // ✅ ADD THIS LINE

// // Initialize models
// const models = initModels(sequelize);

// // Extract models
// const Request = models.requests;
// const Clinic = models.clinics;
// const User = models.users;

// // JWT Secret (should match your auth controller)
// const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';

// // Create a new request and send to qualified doctors
// exports.createRequest = async (req, res) => {
//     try {
//         const {
//    user_id,  
//             specialization,
//             requirements,
//             clinic_id,
//             duration_minutes,
//             request_datetime,
//             offering_rupees
//         } = req.body;

//         // Get user from JWT token (matching your auth controller structure)
//         let userId = user_id;
//         let userName = 'system';

//         // const token = req.header('Authorization')?.replace('Bearer ', '');
        
//         // if (token) {
//         //     try {
//         //         const decoded = jwt.verify(token, JWT_SECRET);
//         //         userId = decoded.userId; // ✅ Your JWT uses 'userId' not 'user_id'
//         //         userName = decoded.phone || 'user'; // Fallback to phone from JWT
                
//         //         console.log('Decoded JWT:', { userId, userName, role: decoded.role });
//         //     } catch (tokenError) {
//         //         console.log('Token verification failed:', tokenError.message);
//         //         return res.status(401).json({
//         //             success: false,
//         //             error: 'Invalid or expired token'
//         //         });
//         //     }
//         // } else {
//         //     return res.status(401).json({
//         //         success: false,
//         //         error: 'Authorization token required'
//         //     });
//         // }

//         // Validate required fields
//         if (!specialization || !clinic_id || !duration_minutes || !request_datetime || !offering_rupees) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Missing required fields: specialization, clinic_id, duration_minutes, request_datetime, offering_rupees'
//             });
//         }

//         // Check if request datetime is in future
//         if (new Date(request_datetime) <= new Date()) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Request datetime must be in the future'
//             });
//         }

//         // Get clinic details and verify ownership
//         const clinic = await Clinic.findByPk(clinic_id);
//         if (!clinic) {
//             return res.status(404).json({
//                 success: false,
//                 error: 'Clinic not found'
//             });
//         }

//         // Security check: Verify user owns the clinic
//         if (clinic.user_id !== userId) {
//             return res.status(403).json({
//                 success: false,
//                 error: 'You are not authorized to create requests for this clinic'
//             });
//         }

//         // Find qualified doctors based on your criteria
//         const qualifiedDoctors = await User.findAll({
//             where: {
//                 role: 'DOCTOR',
//                 status: 'ACTIVE',
//                 is_verified: true, // ✅ Using your is_verified field
//                 specialization: specialization
//             },
//             attributes: ['user_id', 'name', 'phone_number', 'specialization']
//         });

//         const sent_to_user_ids = qualifiedDoctors.map(doctor => doctor.user_id);

//         if (sent_to_user_ids.length === 0) {
//             return res.status(404).json({
//                 success: false,
//                 error: `No verified doctors found for specialization: ${specialization}`
//             });
//         }

//         // Get user details from database for created_by field
//         const userDetails = await User.findByPk(userId);
        
//         // Create the request with user ID from JWT token
//         const request = await Request.create({
//             specialization,
//             requirements,
//             clinic_id,
//             duration_minutes,
//             request_datetime,
//             offering_rupees,
//             user_id: userId, // ✅ From JWT token
//             sent_to_user_ids,
//             status: 'PENDING',
//             created_by: userDetails?.name || userName, // Use actual name or fallback
//             created_date: new Date()
//         });

//         res.status(201).json({
//             success: true,
//             data: {
//                 request,
//                 sent_to_doctors: qualifiedDoctors,
//                 total_doctors_contacted: sent_to_user_ids.length
//             },
//             message: `Request created and sent to ${sent_to_user_ids.length} verified doctors for ${specialization}`,
//             debug: {
//                 user_id: userId,
//                 created_by: userDetails?.name || userName,
//                 clinic_owner: clinic.user_id
//             }
//         });

//     } catch (error) {
//         console.error('Error creating request:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to create request',
//             details: error.message
//         });
//     }
// };




// const initModels = require('../models/init-models');
// const sequelize = require('../config/database');
// const { Op } = require('sequelize');
// const jwt = require('jsonwebtoken');
// const fcmService = require('../services/fcmService'); // ✅ ADD THIS LINE

// // Initialize models
// const models = initModels(sequelize);

// // Extract models
// const Request = models.requests;
// const Clinic = models.clinics;
// const User = models.users;

// // JWT Secret (should match your auth controller)
// const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';

// // Create a new request and send to qualified doctors
// exports.createRequest = async (req, res) => {
//     try {
//         const {
//             user_id,  
//             specialization,
//             requirements,
//             clinic_id,
//             duration_minutes,
//             request_datetime,
//             offering_rupees
//         } = req.body;

//         // Get user from JWT token (matching your auth controller structure)
//         let userId = user_id;
//         let userName = 'system';

//         // ... your existing JWT validation code ...

//         // Validate required fields
//         if (!specialization || !clinic_id || !duration_minutes || !request_datetime || !offering_rupees) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Missing required fields: specialization, clinic_id, duration_minutes, request_datetime, offering_rupees'
//             });
//         }

//         // Check if request datetime is in future
//         if (new Date(request_datetime) <= new Date()) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Request datetime must be in the future'
//             });
//         }

//         // Get clinic details and verify ownership
//         const clinic = await Clinic.findByPk(clinic_id);
//         if (!clinic) {
//             return res.status(404).json({
//                 success: false,
//                 error: 'Clinic not found'
//             });
//         }

//         // Security check: Verify user owns the clinic
//         if (clinic.user_id !== userId) {
//             return res.status(403).json({
//                 success: false,
//                 error: 'You are not authorized to create requests for this clinic'
//             });
//         }

//         // ✅ UPDATED: Include fcm_token in attributes
//         const qualifiedDoctors = await User.findAll({
//             where: {
//                 role: 'DOCTOR',
//                 status: 'ACTIVE',
//                 is_verified: true,
//                 specialization: specialization
//             },
//             attributes: ['user_id', 'name', 'phone_number', 'specialization', 'fcm_token'] // ✅ ADD fcm_token
//         });

//         const sent_to_user_ids = qualifiedDoctors.map(doctor => doctor.user_id);

//         if (sent_to_user_ids.length === 0) {
//             return res.status(404).json({
//                 success: false,
//                 error: `No verified doctors found for specialization: ${specialization}`
//             });
//         }

//         // Get user details from database for created_by field
//         const userDetails = await User.findByPk(userId);
        
//         // Create the request with user ID from JWT token
//         const request = await Request.create({
//             specialization,
//             requirements,
//             clinic_id,
//             duration_minutes,
//             request_datetime,
//             offering_rupees,
//             user_id: userId,
//             sent_to_user_ids,
//             status: 'PENDING',
//             created_by: userDetails?.name || userName,
//             created_date: new Date()
//         });

//         // ✅ NEW: SEND FCM PUSH NOTIFICATIONS
//         console.log('📱 Sending FCM notifications to doctors...');
        
//         const notificationTitle = `🔔 New ${specialization} Consultation`;
//         const notificationBody = `${userDetails?.name || 'A clinic'} needs a ${specialization} consultation. Offering ₹${offering_rupees} for ${duration_minutes} minutes.`;
        
//         const notificationData = {
//             request_id: request.request_id?.toString() || request.id?.toString(),
//             type: 'NEW_REQUEST',
//             specialization: specialization,
//             offering: offering_rupees.toString(),
//             duration: duration_minutes.toString(),
//             clinic_name: clinic.clinic_name || 'Unknown Clinic',
//             clinic_city: clinic.city || 'Unknown Location',
//             clinic_address: clinic.address || '',
//             request_datetime: request_datetime,
//             priority: 'high',
//             user_name: userDetails?.name || 'Unknown User'
//         };

//         // Send FCM notifications to all qualified doctors
//         const fcmResult = await fcmService.sendToDoctors(
//             sent_to_user_ids,
//             notificationTitle,
//             notificationBody,
//             notificationData
//         );

//         console.log('🔔 FCM Notification Result:', {
//             success: fcmResult.success,
//             sent: fcmResult.successCount,
//             failed: fcmResult.failureCount,
//             totalDoctors: fcmResult.totalDoctors
//         });

//         // ✅ UPDATED: Include FCM results in response
//         res.status(201).json({
//             success: true,
//             data: {
//                 request,
//                 sent_to_doctors: qualifiedDoctors,
//                 total_doctors_contacted: sent_to_user_ids.length,
//                 fcm_notifications: {
//                     sent_successfully: fcmResult.successCount || 0,
//                     failed: fcmResult.failureCount || 0,
//                     total_doctors_with_tokens: fcmResult.totalDoctors || 0,
//                     notification_success: fcmResult.success
//                 }
//             },
//             message: `Request created and sent to ${sent_to_user_ids.length} verified doctors for ${specialization}. FCM notifications: ${fcmResult.successCount || 0} sent successfully.`,
//             debug: {
//                 user_id: userId,
//                 created_by: userDetails?.name || userName,
//                 clinic_owner: clinic.user_id,
//                 fcm_result: fcmResult.success ? 'SUCCESS' : 'FAILED'
//             }
//         });

//     } catch (error) {
//         console.error('❌ Error creating request:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to create request',
//             details: error.message
//         });
//     }
// };








const initModels = require('../models/init-models');
const sequelize = require('../config/database');
const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');
const fcmService = require('../services/fcmService');
const expoPushService = require('../services/expoPushService');
// Initialize models
const models = initModels(sequelize);

// Extract models
const Request = models.requests;
const Clinic = models.clinics;
const User = models.users;

// JWT Secret (should match your auth controller)
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';

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
// Create a new request and send to qualified doctors
exports.createRequest = async (req, res) => {
    try {
        const {
            user_id,  
            specialization,
            requirements,
            clinic_id,
            duration_minutes,
            request_datetime,
            offering_rupees
        } = req.body;

        // Get user from JWT token (matching your auth controller structure)
        let userId = user_id;
        let userName = 'system';

        // Validate required fields
        if (!specialization || !clinic_id || !duration_minutes || !request_datetime || !offering_rupees) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: specialization, clinic_id, duration_minutes, request_datetime, offering_rupees'
            });
        }

        // Check if request datetime is in future
        if (new Date(request_datetime) <= new Date()) {
            return res.status(400).json({
                success: false,
                error: 'Request datetime must be in the future'
            });
        }

        // Get clinic details and verify ownership
        const clinic = await Clinic.findByPk(clinic_id);
        if (!clinic) {
            return res.status(404).json({
                success: false,
                error: 'Clinic not found'
            });
        }

        // Security check: Verify user owns the clinic
        if (clinic.user_id !== userId) {
            return res.status(403).json({
                success: false,
                error: 'You are not authorized to create requests for this clinic'
            });
        }

        // Find qualified doctors with FCM tokens
        const qualifiedDoctors = await User.findAll({
            where: {
                role: 'DOCTOR',
                status: 'ACTIVE',
                is_verified: true,
                specialization: specialization,
                has_subscription: true,
                 user_id: {
                    [Op.ne]: userId  // ✅ EXCLUDE THE REQUEST CREATOR (user cannot send to themselves)
                }
            },
            attributes: ['user_id', 'name', 'phone_number', 'specialization', 'fcm_token']
        });

if (qualifiedDoctors.length === 0) {
    return res.status(404).json({
        success: false,
        error: 'No qualified doctors available',
        message: `Unfortunately, no ${specialization} doctors are currently available in ${clinic.city}. Please try again later.`,
        details: {
            specialization: specialization,
            city: clinic.city,
            suggestion: 'Try selecting a different specialization or check back later'
        }
    });
}

        const sent_to_user_ids = qualifiedDoctors.map(doctor => doctor.user_id);

        if (sent_to_user_ids.length === 0) {
            return res.status(404).json({
                success: false,
                error: `No verified doctors found for specialization: ${specialization}`
            });
        }

        // Get user details from database for created_by field
        const userDetails = await User.findByPk(userId);
        
        // Create the request
        const request = await Request.create({
            specialization,
            requirements,
            clinic_id,
            duration_minutes,
            request_datetime,
            offering_rupees,
            user_id: userId,
            sent_to_user_ids,
            status: 'PENDING',
            created_by: userDetails?.name || userName,
            created_date: new Date()
        });

      console.log(`✅ Request created with ID: ${request.request_id || request.id}`);

    // ✅ SEND PUSH NOTIFICATIONS
    const expoTokens = qualifiedDoctors
      .map(doctor => doctor.fcm_token)
      .filter(token => token && token.startsWith('ExponentPushToken'));

    console.log(`📱 Found ${expoTokens.length} doctors with Expo push tokens`);

    if (expoTokens.length > 0) {
      const notificationTitle = `🔔 New ${specialization} Request`;
      const notificationBody = `${clinic.clinic_name || 'A clinic'} needs a ${specialization}. Offering ₹${offering_rupees}`;
      
      const notificationData = {
        request_id: (request.request_id || request.id).toString(),
        type: 'NEW_REQUEST',
        specialization: specialization,
        offering: offering_rupees.toString(),
        duration: duration_minutes.toString(),
        clinic_name: clinic.clinic_name || 'Unknown',
        clinic_city: clinic.city || '',
        request_datetime: request_datetime,
        priority: 'high'
      };

      // Send notifications asynchronously
      expoPushService.sendExpoPushNotification(
        expoTokens,
        notificationTitle,
        notificationBody,
        notificationData
      ).then(result => {
        console.log('✅ Push notifications result:', {
          success: result.success,
          sent: result.successCount,
          failed: result.failureCount
        });
      }).catch(error => {
        console.error('❌ Push notification error:', error);
      });
    }

    res.status(201).json({
      success: true,
      data: {
        request: {
          request_id: request.request_id || request.id,
          specialization: request.specialization,
          clinic_id: request.clinic_id,
          duration_minutes: request.duration_minutes,
          request_datetime: request.request_datetime,
          offering_rupees: request.offering_rupees,
          status: request.status
        },
        sent_to_doctors: qualifiedDoctors.map(d => ({
          user_id: d.user_id,
          name: d.name,
          specialization: d.specialization,
          has_push_token: !!d.fcm_token
        })),
        total_doctors_contacted: sent_to_user_ids.length,
        doctors_with_tokens: expoTokens.length
      },
      message: `Request sent to ${sent_to_user_ids.length} doctors. Push notifications: ${expoTokens.length} sent.`
    });

    } catch (error) {
        console.error('❌ Error creating request:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create request',
            details: error.message
        });
    }
};

// ✅ NEW: Get all requests
exports.getAllRequests = async (req, res) => {
    try {
        const { status, specialization, page = 1, limit = 10 } = req.query;
        
        let whereConditions = {};
        
        if (status) {
            whereConditions.status = status.toUpperCase();
        }
        
        if (specialization) {
            whereConditions.specialization = specialization;
        }

        const offset = (page - 1) * limit;

        const requests = await Request.findAndCountAll({
            where: whereConditions,
            include: [
                {
                    model: Clinic,
                    as: 'clinic',
                    attributes: ['clinic_id', 'clinic_name', 'city', 'address']
                }
            ],
            order: [['created_date', 'DESC']],
            limit: parseInt(limit),
            offset: offset
        });

        res.json({
            success: true,
            data: requests.rows,
            pagination: {
                current_page: parseInt(page),
                total_pages: Math.ceil(requests.count / limit),
                total: requests.count
            }
        });

    } catch (error) {
        console.error('Error fetching requests:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// ✅ NEW: Get single request by ID
exports.getRequestById = async (req, res) => {
    try {
        const { id } = req.params;

        const request = await Request.findByPk(id, {
            include: [
                {
                    model: Clinic,
                    as: 'clinic',
                    attributes: ['clinic_id', 'clinic_name', 'city', 'address', 'phone_number']
                },
                {
                    model: User,
                    as: 'user',
                    attributes: ['user_id', 'name', 'email', 'phone_number']
                }
            ]
        });

        if (!request) {
            return res.status(404).json({
                success: false,
                error: 'Request not found'
            });
        }

        res.json({
            success: true,
            data: request
        });

    } catch (error) {
        console.error('Error fetching request:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};




// ✅ FIXED: Get pending requests for a specific doctor
exports.getPendingRequestsForDoctor = async (req, res) => {
    try {
        const { userId } = req.params;
        
        console.log(`📍 Fetching pending requests for doctor ID: ${userId}`);
        
        const requests = await Request.findAll({
            where: {
                status: 'PENDING',
                [Op.and]: [
                    sequelize.where(
                        sequelize.fn('JSON_CONTAINS',
                            sequelize.col('sent_to_user_ids'),
                            sequelize.literal(`'${parseInt(userId)}'`),
                            sequelize.literal(`'$'`)
                        ),
                        1
                    )
                ]
            },
            include: [
                {
                    model: Clinic,
                    as: 'clinic',
                    // ✅ ONLY USE FIELDS THAT EXIST IN YOUR CLINICS TABLE
                    attributes: ['clinic_id', 'clinic_name', 'city', 'address', 'area', 'pin_code']
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['user_id', 'name', 'phone_number', 'profile_pic_url', 'email']
                }
            ],
            order: [['created_date', 'DESC']]
        });
        
        console.log(`✅ Found ${requests.length} pending requests for doctor ${userId}`);
        
        res.json({
            success: true,
            data: requests,
            count: requests.length,
            message: `Found ${requests.length} pending consultation requests`
        });
        
    } catch (error) {
        console.error('❌ Error fetching pending requests:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch pending requests',
            details: error.message
        });
    }
};

// ✅ FIXED: Get accepted requests for a doctor
exports.getAcceptedRequestsForDoctor = async (req, res) => {
    try {
        const { userId } = req.params;
        
        console.log(`📍 Fetching accepted requests for doctor ID: ${userId}`);
        
        const requests = await Request.findAll({
            where: {
                status: {
                    [Op.in]: ['ACCEPTED', 'CONFIRMED', 'STARTED']
                },
                [Op.or]: [
                    sequelize.where(
                        sequelize.fn('JSON_CONTAINS',
                            sequelize.col('accepted_by_user_ids'),
                            sequelize.literal(`'${parseInt(userId)}'`),
                            sequelize.literal(`'$'`)
                        ),
                        1
                    ),
                    {
                        assigned_doctor_id: parseInt(userId)
                    }
                ]
            },
            include: [
                {
                    model: Clinic,
                    as: 'clinic',
                    // ✅ ONLY USE FIELDS THAT EXIST
                    attributes: ['clinic_id', 'clinic_name', 'city', 'address', 'area']
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['user_id', 'name', 'phone_number', 'email']
                },
                {
                    model: User,
                    as: 'assignedDoctor',
                    attributes: ['user_id', 'name', 'phone_number', 'specialization'],
                    required: false
                }
            ],
            order: [['updated_date', 'DESC']]
        });
        
        console.log(`✅ Found ${requests.length} accepted requests for doctor ${userId}`);
        
        res.json({
            success: true,
            data: requests,
            count: requests.length,
            message: `Found ${requests.length} accepted consultation requests`
        });
        
    } catch (error) {
        console.error('❌ Error fetching accepted requests:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch accepted requests',
            details: error.message
        });
    }
};

// ✅ FIXED: Get all requests for a doctor
exports.getAllRequestsForDoctor = async (req, res) => {
    try {
        const { userId } = req.params;
        
        console.log(`📍 Fetching all requests for doctor ID: ${userId}`);
        
        const requests = await Request.findAll({
            where: {
                [Op.or]: [
                    sequelize.where(
                        sequelize.fn('JSON_CONTAINS',
                            sequelize.col('sent_to_user_ids'),
                            sequelize.literal(`'${parseInt(userId)}'`),
                            sequelize.literal(`'$'`)
                        ),
                        1
                    ),
                    sequelize.where(
                        sequelize.fn('JSON_CONTAINS',
                            sequelize.col('accepted_by_user_ids'),
                            sequelize.literal(`'${parseInt(userId)}'`),
                            sequelize.literal(`'$'`)
                        ),
                        1
                    ),
                    {
                        assigned_doctor_id: parseInt(userId)
                    }
                ]
            },
            include: [
                {
                    model: Clinic,
                    as: 'clinic',
                    // ✅ ONLY USE FIELDS THAT EXIST
                    attributes: ['clinic_id', 'clinic_name', 'city', 'address']
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['user_id', 'name', 'phone_number']
                }
            ],
            order: [['created_date', 'DESC']]
        });
        
        res.json({
            success: true,
            data: requests,
            count: requests.length
        });
        
    } catch (error) {
        console.error('❌ Error fetching all requests:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch requests',
            details: error.message
        });
    }
};

// ✅ CORRECTED: Accept request WITHOUT assigning doctor immediately
// ✅ CORRECTED: Accept request WITHOUT assigning doctor immediately
exports.acceptRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { doctor_notes = '', user_id } = req.body;
        
        const userId = parseInt(user_id);
        
        console.log(`✅ Doctor ${userId} accepting request ${requestId}`);
        
        const request = await Request.findByPk(requestId, {
            include: [
                {
                    model: Clinic,
                    as: 'clinic',
                    attributes: ['clinic_id', 'clinic_name', 'city', 'address']
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['user_id', 'name', 'phone_number', 'fcm_token']
                }
            ]
        });
        
        if (!request) {
            return res.status(404).json({
                success: false,
                error: 'Request not found'
            });
        }
        
        if (request.status !== 'PENDING') {
            return res.status(400).json({
                success: false,
                error: `Request is already ${request.status.toLowerCase()}. Cannot accept.`,
                current_status: request.status
            });
        }
        
        // ✅ FIX: Parse sent_to_user_ids safely (handles string or array)
        const sentToUserIds = parseJSONField(request.sent_to_user_ids);
        
        if (!sentToUserIds || !sentToUserIds.includes(userId)) {
            return res.status(403).json({
                success: false,
                error: 'You are not authorized to accept this request'
            });
        }
        
        // ✅ REMOVE USER FROM sent_to_user_ids
        const updatedSentToUsers = sentToUserIds.filter(id => id !== userId);
        
        // ✅ FIX: Parse accepted_by_user_ids safely (handles string or array)
        const acceptedUserIds = parseJSONField(request.accepted_by_user_ids);
        
        // ✅ ADD USER TO accepted_by_user_ids
        if (!acceptedUserIds.includes(userId)) {
            acceptedUserIds.push(userId);
        }
        
        const doctor = await User.findByPk(userId);
        
        // ✅ UPDATE WITHOUT assigned_doctor_id - FIXED VARIABLE NAME
        await request.update({
            sent_to_user_ids: updatedSentToUsers,
            accepted_by_user_ids: acceptedUserIds,  // ✅ FIXED: Was acceptedUsers
            status: 'ACCEPTED',
            updated_by: doctor?.name || 'doctor',
            updated_date: new Date()
        });
        
        const updatedRequest = await Request.findByPk(requestId, {
            include: [
                {
                    model: Clinic,
                    as: 'clinic',
                    attributes: ['clinic_id', 'clinic_name', 'city', 'address']
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['user_id', 'name', 'phone_number']
                }
            ]
        });
        
        console.log(`✅ Request ${requestId} accepted by doctor ${userId}`);
        console.log(`📋 Removed from sent_to_user_ids, added to accepted_by_user_ids`);
        console.log(`👥 Total doctors who accepted: ${acceptedUserIds.length}`);  // ✅ FIXED
        console.log(`👥 Remaining doctors pending: ${updatedSentToUsers.length}`);
        
        // Send notification to clinic owner
        if (request.creator?.fcm_token) {
            expoPushService.sendExpoPushNotification(
                [request.creator.fcm_token],
                `✅ Doctor Accepted Your Request`,
                `Dr. ${doctor?.name || 'A doctor'} has accepted your ${request.specialization} consultation request`,
                {
                    request_id: requestId.toString(),
                    type: 'REQUEST_ACCEPTED',
                    doctor_id: userId.toString(),
                    doctor_name: doctor?.name || 'Doctor',
                    total_acceptances: acceptedUserIds.length.toString()  // ✅ FIXED
                }
            ).catch(err => console.error('Push notification error:', err));
        }
        
        res.json({
            success: true,
            data: updatedRequest,
            message: 'Request accepted successfully. Waiting for clinic to confirm.',
            doctor_info: {
                doctor_id: userId,
                doctor_name: doctor?.name || 'Unknown',
                total_doctors_accepted: acceptedUserIds.length,  // ✅ FIXED
                remaining_pending_doctors: updatedSentToUsers.length
            }
        });
        
    } catch (error) {
        console.error('❌ Error accepting request:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to accept request',
            details: error.message
        });
    }
};


// ✅ Decline request - already correct, no clinic attributes needed
exports.declineRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { reason = '', user_id } = req.body;
        
        const userId = parseInt(user_id);
        
        console.log(`❌ Doctor ${userId} declining request ${requestId}`);
        
        const request = await Request.findByPk(requestId);
        
        if (!request) {
            return res.status(404).json({
                success: false,
                error: 'Request not found'
            });
        }
        
        if (!request.sent_to_user_ids || !request.sent_to_user_ids.includes(userId)) {
            return res.status(403).json({
                success: false,
                error: 'You are not authorized to decline this request'
            });
        }
        
        const sentToUsers = request.sent_to_user_ids || [];
        const updatedSentTo = sentToUsers.filter(id => id !== userId);
        
        const doctor = await User.findByPk(userId);
        
        await request.update({
            sent_to_user_ids: updatedSentTo,
            updated_by: doctor?.name || 'doctor',
            updated_date: new Date()
        });
        
        console.log(`✅ Request ${requestId} declined successfully by doctor ${userId}`);
        
        res.json({
            success: true,
            message: 'Request declined successfully',
            data: {
                request_id: requestId,
                declined_by: userId,
                remaining_doctors: updatedSentTo.length,
                reason: reason || 'No reason provided'
            }
        });
        
    } catch (error) {
        console.error('❌ Error declining request:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to decline request',
            details: error.message
        });
    }
};


// ✅ FIXED: Get doctor statistics
exports.getDoctorStats = async (req, res) => {
    try {
        const { userId } = req.params;
        
        console.log(`📊 Fetching statistics for doctor ID: ${userId}`);
        
        const userIdInt = parseInt(userId);
        
        // Count total requests sent to this doctor
        const totalRequests = await Request.count({
            where: sequelize.where(
                sequelize.fn('JSON_CONTAINS',
                    sequelize.col('sent_to_user_ids'),
                    sequelize.literal(`'${userIdInt}'`),
                    sequelize.literal(`'$'`)
                ),
                1
            )
        });
        
        // Count pending requests
        const pendingRequests = await Request.count({
            where: {
                status: 'PENDING',
                [Op.and]: [
                    sequelize.where(
                        sequelize.fn('JSON_CONTAINS',
                            sequelize.col('sent_to_user_ids'),
                            sequelize.literal(`'${userIdInt}'`),
                            sequelize.literal(`'$'`)
                        ),
                        1
                    )
                ]
            }
        });
        
        // Count accepted requests
        const acceptedRequests = await Request.count({
            where: {
                status: {
                    [Op.in]: ['ACCEPTED', 'CONFIRMED', 'STARTED']
                },
                [Op.or]: [
                    sequelize.where(
                        sequelize.fn('JSON_CONTAINS',
                            sequelize.col('accepted_by_user_ids'),
                            sequelize.literal(`'${userIdInt}'`),
                            sequelize.literal(`'$'`)
                        ),
                        1
                    ),
                    {
                        assigned_doctor_id: userIdInt
                    }
                ]
            }
        });
        
        // Count completed requests
        const completedRequests = await Request.count({
            where: {
                status: 'COMPLETED',
                assigned_doctor_id: userIdInt
            }
        });
        
        // Calculate total earnings
        const earningsResult = await Request.findAll({
            where: {
                status: 'COMPLETED',
                assigned_doctor_id: userIdInt
            },
            attributes: [
                [sequelize.fn('SUM', sequelize.col('offering_rupees')), 'total_earnings']
            ],
            raw: true
        });
        
        const totalEarnings = earningsResult[0]?.total_earnings || 0;
        
        const stats = {
            totalRequests,
            pendingRequests,
            acceptedRequests,
            completedRequests,
            totalEarnings: parseFloat(totalEarnings) || 0,
            acceptance_rate: totalRequests > 0 
                ? ((acceptedRequests / totalRequests) * 100).toFixed(1) 
                : 0,
            completion_rate: acceptedRequests > 0 
                ? ((completedRequests / acceptedRequests) * 100).toFixed(1) 
                : 0
        };
        
        console.log(`✅ Stats retrieved for doctor ${userId}:`, stats);
        
        res.json({
            success: true,
            data: stats,
            message: 'Statistics retrieved successfully'
        });
        
    } catch (error) {
        console.error('❌ Error fetching doctor statistics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch statistics',
            details: error.message
        });
    }
};
