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




const initModels = require('../models/init-models');
const sequelize = require('../config/database');
const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');

// Initialize models
const models = initModels(sequelize);

// Extract models
const Request = models.requests;
const Clinic = models.clinics;
const User = models.users;

// JWT Secret (should match your auth controller)
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';

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

        // const token = req.header('Authorization')?.replace('Bearer ', '');
        
        // if (token) {
        //     try {
        //         const decoded = jwt.verify(token, JWT_SECRET);
        //         userId = decoded.userId; // ✅ Your JWT uses 'userId' not 'user_id'
        //         userName = decoded.phone || 'user'; // Fallback to phone from JWT
                
        //         console.log('Decoded JWT:', { userId, userName, role: decoded.role });
        //     } catch (tokenError) {
        //         console.log('Token verification failed:', tokenError.message);
        //         return res.status(401).json({
        //             success: false,
        //             error: 'Invalid or expired token'
        //         });
        //     }
        // } else {
        //     return res.status(401).json({
        //         success: false,
        //         error: 'Authorization token required'
        //     });
        // }

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

        // Find qualified doctors based on your criteria
        const qualifiedDoctors = await User.findAll({
            where: {
                role: 'DOCTOR',
                status: 'ACTIVE',
                is_verified: true, // ✅ Using your is_verified field
                specialization: specialization
            },
            attributes: ['user_id', 'name', 'phone_number', 'specialization']
        });

        const sent_to_user_ids = qualifiedDoctors.map(doctor => doctor.user_id);

        if (sent_to_user_ids.length === 0) {
            return res.status(404).json({
                success: false,
                error: `No verified doctors found for specialization: ${specialization}`
            });
        }

        // Get user details from database for created_by field
        const userDetails = await User.findByPk(userId);
        
        // Create the request with user ID from JWT token
        const request = await Request.create({
            specialization,
            requirements,
            clinic_id,
            duration_minutes,
            request_datetime,
            offering_rupees,
            user_id: userId, // ✅ From JWT token
            sent_to_user_ids,
            status: 'PENDING',
            created_by: userDetails?.name || userName, // Use actual name or fallback
            created_date: new Date()
        });

        res.status(201).json({
            success: true,
            data: {
                request,
                sent_to_doctors: qualifiedDoctors,
                total_doctors_contacted: sent_to_user_ids.length
            },
            message: `Request created and sent to ${sent_to_user_ids.length} verified doctors for ${specialization}`,
            debug: {
                user_id: userId,
                created_by: userDetails?.name || userName,
                clinic_owner: clinic.user_id
            }
        });

    } catch (error) {
        console.error('Error creating request:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create request',
            details: error.message
        });
    }
};


