const sequelize = require('../config/database');
const initModels = require('../models/init-models');
const models = initModels(sequelize);
const { users, clinics, subscribers, packages, group_codes, code_attributes } = models;
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

// Simple OTP storage (use Redis in production)
const otpStorage = new Map();

// JWT Secret (use environment variable in production)
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user.user_id,
      phone: user.phone_number,
      role: user.role,
      email: user.email
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
};

const moment = require('moment-timezone');

const getISTDate = () => {
  return moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss.SSS');
};

module.exports = {
  // Validation middleware
  validateConsultantRegistration: [
    body('name').notEmpty().withMessage('Full name is required'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('phone_number').isMobilePhone('en-IN').withMessage('Valid Indian mobile number is required'),
    body('qualification').notEmpty().withMessage('Qualification is required'),
    body('specialization').notEmpty().withMessage('Specialization is required'),
    body('clinics').isArray({ min: 1 }).withMessage('At least one clinic is required'),
    body('clinics.*.clinic_name').notEmpty().withMessage('Clinic name is required'),
    body('clinics.*.address').notEmpty().withMessage('Complete address is required'),
    body('clinics.*.city').notEmpty().withMessage('City is required'),
    body('clinics.*.pin_code').isLength({ min: 6, max: 6 }).withMessage('Valid 6-digit pin code is required')
  ],

  validateOTP: [
    body('phone_number').isMobilePhone('en-IN').withMessage('Valid mobile number is required'),
    body('otp').isLength({ min: 4, max: 6 }).withMessage('OTP must be 4-6 digits')
  ],



  // Get specializations from group codes
  getSpecializations: async (req, res) => {
    try {
      // Find the group code for Specialization
      const specializationGroup = await group_codes.findOne({
        where: { group_code: 'Specialization' }
      });

      if (!specializationGroup) {
        return res.status(404).json({
          success: false,
          message: 'Specialization group code not found'
        });
      }

      // Get all attributes for Specialization group
      const specializations = await code_attributes.findAll({
        where: { 
          group_code_id: specializationGroup.group_code_id,
          status: 'ACTIVE' 
        },
        attributes: ['code_attribute_id', 'attribute_name', 'attribute_value'],
        order: [['attribute_name', 'ASC']]
      });

      const formattedSpecializations = specializations.map(spec => ({
        id: spec.code_attribute_id,
        name: spec.attribute_name,
        value: spec.attribute_value
      }));

      res.status(200).json({
        success: true,
        data: formattedSpecializations
      });
    } catch (error) {
      console.error('Get Specializations Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch specializations',
        error: error.message
      });
    }
  },

  // Get cities from group codes
  getCities: async (req, res) => {
    try {
      // Find the group code for City
      const cityGroup = await group_codes.findOne({
        where: { group_code: 'City' }
      });

      if (!cityGroup) {
        return res.status(404).json({
          success: false,
          message: 'City group code not found'
        });
      }

      // Get all attributes for City group
      const cities = await code_attributes.findAll({
        where: { 
          group_code_id: cityGroup.group_code_id,
          status: 'ACTIVE' 
        },
        attributes: ['code_attribute_id', 'attribute_name', 'attribute_value'],
        order: [['attribute_name', 'ASC']]
      });

      const formattedCities = cities.map(city => ({
        id: city.code_attribute_id,
        name: city.attribute_name,
        value: city.attribute_value
      }));

      res.status(200).json({
        success: true,
        data: formattedCities
      });
    } catch (error) {
      console.error('Get Cities Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch cities',
        error: error.message
      });
    }
  },


  // Send OTP (Static 1234 for development)
sendOTP: async (req, res) => {
  try {
    // Manual validation since middleware is causing issues
    const { phone_number } = req.body;
    
    if (!phone_number) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Store static OTP 1234 for development
    otpStorage.set(phone_number, {
      otp: '1234',
      expires: Date.now() + 5 * 60 * 1000, // 5 minutes expiry
      verified: false
    });

    console.log(`Static OTP 1234 set for ${phone_number} (Development Mode)`);

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      expires_in: 300, // 5 minutes in seconds
      dev_note: 'Use OTP: 1234 for development'
    });

  } catch (error) {
    console.error('Send OTP Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP',
      error: error.message
    });
  }
},


  // Verify OTP (Always accept 1234)
  verifyOTP: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { phone_number, otp } = req.body;

      // For development, always accept 1234
      if (otp === '1234') {
        // Store verified status
        otpStorage.set(phone_number, {
          otp: '1234',
          expires: Date.now() + 30 * 60 * 1000, // 30 minutes
          verified: true
        });

        console.log(`OTP verified for ${phone_number} (Development Mode)`);

        return res.status(200).json({
          success: true,
          message: 'OTP verified successfully'
        });
      }

      // Check stored OTP for production behavior
      const storedOTP = otpStorage.get(phone_number);
      
      if (!storedOTP) {
        return res.status(400).json({
          success: false,
          message: 'OTP not found. Please request a new OTP.'
        });
      }

      if (Date.now() > storedOTP.expires) {
        otpStorage.delete(phone_number);
        return res.status(400).json({
          success: false,
          message: 'OTP has expired'
        });
      }

      if (storedOTP.otp !== otp) {
        return res.status(400).json({
          success: false,
          message: 'Invalid OTP'
        });
      }

      // Mark as verified
      storedOTP.verified = true;
      otpStorage.set(phone_number, storedOTP);

      res.status(200).json({
        success: true,
        message: 'OTP verified successfully'
      });

    } catch (error) {
      console.error('Verify OTP Error:', error);
      res.status(500).json({
        success: false,
        message: 'OTP verification failed',
        error: error.message
      });
    }
  },

loginUser: async (req, res) => {
  try {
    const { phone_number, otp } = req.body;

    if (otp !== '1234') {
      const storedOTP = otpStorage.get(phone_number);
      if (!storedOTP || !storedOTP.verified || storedOTP.otp !== otp) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or unverified OTP'
        });
      }
    }

    const user = await users.findOne({
      where: { phone_number },
      include: [
        {
          model: clinics,
          as: 'clinics',
          required: false
        },
        {
          model: subscribers,
          as: 'subscribers',
          required: false,
          where: { status: 'ACTIVE' },
          include: [{
            model: packages,
            as: 'package',
            required: false,
            attributes: ['package_id', 'package_name', 'price', 'duration_days', 'features']
          }]
        }
      ],
      attributes: [
        'user_id', 'name', 'email', 'phone_number', 'role', 'qualification', 
        'specialization', 'status', 'is_verified', 'has_subscription',
        'dci_number', 'dci_registration', 'degree_certificate', 'identity_proof',
        'identity_proof_number', 'experience',
        'identity_proof_status', 'degree_certificate_status', 'dci_registration_status',
        'profile_pic_url', 'created_date'
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found. Please register first.',
        action: 'REDIRECT_TO_REGISTRATION',
        phone_number: phone_number
      });
    }

    otpStorage.delete(phone_number);
    const token = generateToken(user);

    const activeSubscription = user.subscribers && user.subscribers.length > 0 ? user.subscribers[0] : null;
    const currentPackage = activeSubscription?.package || null;

    let userData;
    
    if (user.role === 'DOCTOR') {
      userData = {
        id: user.user_id,
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phone_number,
        phone_number: user.phone_number,
        role: 'doctor',
        currentRole: 'consultant',
        isHost: true,
        canToggleRole: true,
        qualification: user.qualification,
        specialization: user.specialization,
        experience: user.experience,
        dciNumber: user.dci_number,
        dci_number: user.dci_number,
        identityProofNumber: user.identity_proof_number,
        identity_proof_number: user.identity_proof_number,
        dashboardType: 'DOCTOR_DASHBOARD',
        isVerified: !!user.is_verified,
        is_verified: !!user.is_verified,
        hasSubscription: !!user.has_subscription,
        has_subscription: !!user.has_subscription,
        profilePicUrl: user.profile_pic_url,
        profile_pic_url: user.profile_pic_url,
        profileImage: user.profile_pic_url,
        registrationDate: user.created_date,
        created_date: user.created_date,
        subscription: activeSubscription ? {
          planId: currentPackage?.package_id,
          planName: currentPackage?.package_name,
          price: currentPackage?.price,
          duration: currentPackage?.duration_days,
          features: currentPackage?.features,
          startDate: activeSubscription.start_date,
          endDate: activeSubscription.end_date,
          status: activeSubscription.status
        } : null,
        subscriptionPlan: currentPackage?.package_id || null,
        documents: {
          dciNumber: user.dci_number,
          dciRegistration: user.dci_registration,
          degreeCertificate: user.degree_certificate,
          identityProof: user.identity_proof
        },
        identity_proof: user.identity_proof,
        identityProof: user.identity_proof,
        degree_certificate: user.degree_certificate,
        dci_registration: user.dci_registration,
        identity_proof_status: user.identity_proof_status,
        degree_certificate_status: user.degree_certificate_status,
        dci_registration_status: user.dci_registration_status,
        clinics: user.clinics ? user.clinics.map(clinic => ({
          id: clinic.clinic_id,
          name: clinic.clinic_name,
          address: clinic.address,
          city: clinic.city,
          pinCode: clinic.pin_code,
          isPrimary: clinic.is_primary
        })) : []
      };
    } else if (user.role === 'INTERN') {
      userData = {
        id: user.user_id,
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phone_number,
        phone_number: user.phone_number,
        role: 'intern',
        currentRole: 'intern',
        isHost: false,
        canToggleRole: false,
        qualification: user.qualification,
        specialization: user.specialization,
        identityProofNumber: user.identity_proof_number,
        identity_proof_number: user.identity_proof_number,
        dashboardType: 'INTERN_DASHBOARD',
        isVerified: !!user.is_verified,
        is_verified: !!user.is_verified,
        hasSubscription: !!user.has_subscription,
        has_subscription: !!user.has_subscription,
        profilePicUrl: user.profile_pic_url,
        profile_pic_url: user.profile_pic_url,
        profileImage: user.profile_pic_url,
        registrationDate: user.created_date,
        created_date: user.created_date,
        documents: {
          dciNumber: user.dci_number,
          dciRegistration: user.dci_registration,
          degreeCertificate: user.degree_certificate,
          identityProof: user.identity_proof
        },
        identity_proof: user.identity_proof,
        identityProof: user.identity_proof,
        degree_certificate: user.degree_certificate,
        identity_proof_status: user.identity_proof_status,
        degree_certificate_status: user.degree_certificate_status,
        clinics: []
      };
    } else {
      userData = {
        id: user.user_id,
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phone_number,
        phone_number: user.phone_number,
        role: user.role.toLowerCase(),
        currentRole: user.role.toLowerCase(),
        isHost: user.role === 'ADMIN',
        canToggleRole: false,
        qualification: user.qualification,
        specialization: user.specialization,
        experience: user.experience,
        dciNumber: user.dci_number,
        dci_number: user.dci_number,
        identityProofNumber: user.identity_proof_number,
        identity_proof_number: user.identity_proof_number,
        dashboardType: 'ADMIN_DASHBOARD',
        isVerified: !!user.is_verified,
        is_verified: !!user.is_verified,
        hasSubscription: !!user.has_subscription,
        has_subscription: !!user.has_subscription,
        profilePicUrl: user.profile_pic_url,
        profile_pic_url: user.profile_pic_url,
        profileImage: user.profile_pic_url,
        registrationDate: user.created_date,
        created_date: user.created_date,
        documents: {
          dciNumber: user.dci_number,
          dciRegistration: user.dci_registration,
          degreeCertificate: user.degree_certificate,
          identityProof: user.identity_proof
        },
        identity_proof: user.identity_proof,
        identityProof: user.identity_proof,
        degree_certificate: user.degree_certificate,
        dci_registration: user.dci_registration,
        clinics: []
      };
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token: token,
      user: userData
    });

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
},

// loginUser: async (req, res) => {
//   try {
//     const { phone_number, otp } = req.body;

//     if (otp !== '1234') {
//       const storedOTP = otpStorage.get(phone_number);
//       if (!storedOTP || !storedOTP.verified || storedOTP.otp !== otp) {
//         return res.status(400).json({
//           success: false,
//           message: 'Invalid or unverified OTP'
//         });
//       }
//     }

//     const user = await users.findOne({
//       where: { phone_number },
//       include: [{
//         model: clinics,
//         as: 'clinics',
//         required: false
//       }],
//       attributes: [
//         'user_id', 'name', 'email', 'phone_number', 'role', 'qualification', 
//         'specialization', 'status', 'is_verified', 'has_subscription',
//         'dci_number', 'dci_registration', 'degree_certificate', 'identity_proof',
//         'identity_proof_number', 'experience',
//         'profile_pic_url', 'created_date'
//       ]
//     });

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: 'User not found. Please register first.',
//         action: 'REDIRECT_TO_REGISTRATION',
//         phone_number: phone_number
//       });
//     }

//     otpStorage.delete(phone_number);
//     const token = generateToken(user);

//     let userData;
    
//     if (user.role === 'DOCTOR') {
//       userData = {
//         id: user.user_id,
//         user_id: user.user_id,
//         name: user.name,
//         email: user.email,
//         phoneNumber: user.phone_number,
//         phone_number: user.phone_number,
//         role: 'doctor',
//         currentRole: 'consultant',
//         isHost: true,
//         canToggleRole: true,
//         qualification: user.qualification,
//         specialization: user.specialization,
//         experience: user.experience,
//         dciNumber: user.dci_number,
//         dci_number: user.dci_number,
//         identityProofNumber: user.identity_proof_number,
//         identity_proof_number: user.identity_proof_number,
//         dashboardType: 'DOCTOR_DASHBOARD',
//         isVerified: !!user.is_verified,
//         hasSubscription: !!user.has_subscription,
//         profilePicUrl: user.profile_pic_url,
//         profile_pic_url: user.profile_pic_url,
//         profileImage: user.profile_pic_url,
//         registrationDate: user.created_date,
//         created_date: user.created_date,
//         documents: {
//           dciNumber: user.dci_number,
//           dciRegistration: user.dci_registration,
//           degreeCertificate: user.degree_certificate,
//           identityProof: user.identity_proof
//         },
//         identity_proof: user.identity_proof,
//         identityProof: user.identity_proof,
//         degree_certificate: user.degree_certificate,
//         dci_registration: user.dci_registration,
//         identity_proof_status: user.identity_proof_status,
//         degree_certificate_status: user.degree_certificate_status,
//         dci_registration_status: user.dci_registration_status,
//         clinics: user.clinics ? user.clinics.map(clinic => ({
//           id: clinic.clinic_id,
//           name: clinic.clinic_name,
//           address: clinic.address,
//           city: clinic.city,
//           pinCode: clinic.pin_code,
//           isPrimary: clinic.is_primary
//         })) : []
//       };
//     } else if (user.role === 'INTERN') {
//       userData = {
//         id: user.user_id,
//         user_id: user.user_id,
//         name: user.name,
//         email: user.email,
//         phoneNumber: user.phone_number,
//         phone_number: user.phone_number,
//         role: 'intern',
//         currentRole: 'intern',
//         isHost: false,
//         canToggleRole: false,
//         qualification: user.qualification,
//         specialization: user.specialization,
//         identityProofNumber: user.identity_proof_number,
//         identity_proof_number: user.identity_proof_number,
//         dashboardType: 'INTERN_DASHBOARD',
//         isVerified: !!user.is_verified,
//         hasSubscription: !!user.has_subscription,
//         profilePicUrl: user.profile_pic_url,
//         profile_pic_url: user.profile_pic_url,
//         profileImage: user.profile_pic_url,
//         registrationDate: user.created_date,
//         created_date: user.created_date,
//         documents: {
//           dciNumber: user.dci_number,
//           dciRegistration: user.dci_registration,
//           degreeCertificate: user.degree_certificate,
//           identityProof: user.identity_proof
//         },
//         identity_proof: user.identity_proof,
//         identityProof: user.identity_proof,
//         degree_certificate: user.degree_certificate,
//         identity_proof_status: user.identity_proof_status,
//         degree_certificate_status: user.degree_certificate_status,
//         clinics: []
//       };
//     } else {
//       userData = {
//         id: user.user_id,
//         user_id: user.user_id,
//         name: user.name,
//         email: user.email,
//         phoneNumber: user.phone_number,
//         phone_number: user.phone_number,
//         role: user.role.toLowerCase(),
//         currentRole: user.role.toLowerCase(),
//         isHost: user.role === 'ADMIN',
//         canToggleRole: false,
//         qualification: user.qualification,
//         specialization: user.specialization,
//         experience: user.experience,
//         dciNumber: user.dci_number,
//         dci_number: user.dci_number,
//         identityProofNumber: user.identity_proof_number,
//         identity_proof_number: user.identity_proof_number,
//         dashboardType: 'ADMIN_DASHBOARD',
//         isVerified: !!user.is_verified,
//         hasSubscription: !!user.has_subscription,
//         profilePicUrl: user.profile_pic_url,
//         profile_pic_url: user.profile_pic_url,
//         profileImage: user.profile_pic_url,
//         registrationDate: user.created_date,
//         created_date: user.created_date,
//         documents: {
//           dciNumber: user.dci_number,
//           dciRegistration: user.dci_registration,
//           degreeCertificate: user.degree_certificate,
//           identityProof: user.identity_proof
//         },
//         identity_proof: user.identity_proof,
//         identityProof: user.identity_proof,
//         degree_certificate: user.degree_certificate,
//         dci_registration: user.dci_registration,
//         clinics: []
//       };
//     }

//     res.status(200).json({
//       success: true,
//       message: 'Login successful',
//       token: token,
//       user: userData
//     });

//   } catch (error) {
//     console.error('Login Error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Login failed',
//       error: error.message
//     });
//   }
// },



//  registerConsultant function
registerConsultant: async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      name,
      email,
      phone_number,
      qualification,
      specialization,
      clinics: clinicsData
    } = req.body;

    // Verify OTP was verified (accepts 1234 for development)
    const storedOTP = otpStorage.get(phone_number);
    if (!storedOTP || (!storedOTP.verified && req.body.otp !== '1234')) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Phone number not verified. Please verify OTP first.'
      });
    }

    // Check for duplicate entries
    const [existingPhone, existingEmail] = await Promise.all([
      users.findOne({ where: { phone_number } }),
      email ? users.findOne({ where: { email } }) : null
    ]);

    if (existingPhone) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: 'Phone number already registered'
      });
    }

    if (existingEmail) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: 'Email already registered'
      });
    }

    const currentISTDate = getISTDate();

    // ✅ Create user with verification and subscription fields
    const newUser = await users.create({
      name,
      email,
      phone_number,
      qualification,
      specialization,
      dci_number: null,
      dci_registration: null,
      degree_certificate: null,
      identity_proof: null,
      password: null,
      role: 'DOCTOR',
      status: 'ACTIVE',
      // ✅ NEW: Set default values for verification and subscription
      is_verified: false,        // New registrations are unverified
      has_subscription: false,   // New registrations have no subscription
      created_by: 'system',
      created_date: currentISTDate,
      updated_by: 'system',
      updated_date: currentISTDate
    }, { transaction });

    // Create clinics (existing code)
    const createdClinics = [];
    for (let i = 0; i < clinicsData.length; i++) {
      const clinic = clinicsData[i];
      const newClinic = await clinics.create({
        user_id: newUser.user_id,
        clinic_name: clinic.clinic_name,
        address: clinic.address,
        city: clinic.city,
        pin_code: clinic.pin_code,
        is_primary: i === 0 || clinic.is_primary,
        status: 'ACTIVE',
        created_by: 'system',
        created_date: currentISTDate,
        updated_by: 'system',
        updated_date: currentISTDate
      }, { transaction });
      
      createdClinics.push(newClinic);
    }

    await transaction.commit();
    otpStorage.delete(phone_number);
    const token = generateToken(newUser);

    // ✅ Return user data with verification status
    res.status(201).json({
      success: true,
      message: 'Registration successful. Please complete verification and subscription to access dashboard.',
      token: token,
      user: {
        id: newUser.user_id,
        name: newUser.name,
        email: newUser.email,
        phoneNumber: newUser.phone_number,
        role: 'doctor',
        currentRole: 'doctor',
        isHost: true,
        canToggleRole: true,
        qualification: newUser.qualification,
        specialization: newUser.specialization,
        isVerified: newUser.is_verified,      // ✅ Include verification status
        hasSubscription: newUser.has_subscription, // ✅ Include subscription status
        clinics: createdClinics.map(clinic => ({
          id: clinic.clinic_id,
          name: clinic.clinic_name,
          city: clinic.city,
          isPrimary: clinic.is_primary
        }))
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Registration Error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
},


  // Get all consultants
  getAllConsultants: async (req, res) => {
    try {
      const { page = 1, limit = 10, city, specialization, status } = req.query;
      const offset = (page - 1) * limit;

      const whereCondition = { role: 'DOCTOR' };
      const clinicWhereCondition = {};

      if (status) whereCondition.status = status;
      if (specialization) whereCondition.specialization = specialization;
      if (city) clinicWhereCondition.city = city;

      const consultants = await users.findAndCountAll({
        where: whereCondition,
        include: [{
          model: clinics,
          as: 'clinics',
          where: clinicWhereCondition,
          required: city ? true : false
        }],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_date', 'DESC']]
      });

      res.status(200).json({
        success: true,
        data: consultants.rows,
        pagination: {
          total: consultants.count,
          page: parseInt(page),
          limit: parseInt(limit),
          total_pages: Math.ceil(consultants.count / limit)
        }
      });

    } catch (error) {
      console.error('Get Consultants Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch consultants',
        error: error.message
      });
    }
  },

  // GET SINGLE CONSULTANT BY ID
// ✅ NEW: GET SINGLE CONSULTANT BY ID WITH SUBSCRIPTION INFO
getConsultantById: async (req, res) => {
  try {
    const { userId } = req.params;

    console.log('📋 Fetching consultant data for user:', userId);

    const Subscribers = models.subscribers;
    const Packages = models.packages;

    const consultant = await Users.findOne({
      where: { user_id: userId },
      attributes: [
        'user_id',
        'name',
        'email',
        'phone_number',
        'qualification',
        'specialization',
        'has_subscription',
        'is_verified',
        'profile_pic_url',
        'dci_number',
        'identity_proof_number',
        'role',
        'status',
        'username',
        'experience',
        'identity_proof',
        'degree_certificate',
        'dci_registration',
        'created_date',
        'updated_date',
      ],
    });

    if (!consultant) {
      return res.status(404).json({
        success: false,
        error: 'Consultant not found',
      });
    }

    // Fetch active subscription if exists
    let subscriptionInfo = null;
    if (consultant.has_subscription) {
      const activeSubscription = await Subscribers.findOne({
        where: { 
          user_id: userId,
          status: 'ACTIVE'
        },
        include: [
          {
            model: Packages,
            as: 'package',
            attributes: ['package_id', 'package_name', 'duration_days', 'price'],
          },
        ],
      });

      if (activeSubscription) {
        subscriptionInfo = {
          subscriber_id: activeSubscription.subscriber_id,
          package_id: activeSubscription.package_id,
          package_name: activeSubscription.package?.package_name || 'N/A',
          start_date: activeSubscription.start_date,
          end_date: activeSubscription.end_date,
          status: activeSubscription.status,
        };
      }
    }

    // Return data in format compatible with AuthContext
    const responseData = {
      user_id: consultant.user_id,
      id: consultant.user_id,
      name: consultant.name,
      email: consultant.email,
      phone_number: consultant.phone_number,
      phoneNumber: consultant.phone_number,
      role: consultant.role,
      status: consultant.status,
      profile_pic_url: consultant.profile_pic_url,
      profileImage: consultant.profile_pic_url,
      username: consultant.username,
      qualification: consultant.qualification,
      specialization: consultant.specialization,
      experience: consultant.experience,
      dci_number: consultant.dci_number,
      dciNumber: consultant.dci_number,
      identity_proof: consultant.identity_proof,
      identity_proof_number: consultant.identity_proof_number,
      identityProofNumber: consultant.identity_proof_number,
      degree_certificate: consultant.degree_certificate,
      dci_registration: consultant.dci_registration,
      is_verified: consultant.is_verified,
      isVerified: consultant.is_verified === 1 || consultant.is_verified === true,
      has_subscription: consultant.has_subscription,
      hasSubscription: consultant.has_subscription === 1 || consultant.has_subscription === true,
      subscription: subscriptionInfo,
      created_date: consultant.created_date,
      updated_date: consultant.updated_date,
    };

    res.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error('❌ Get consultant error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch consultant data',
    });
  }
},


};
