const sequelize = require('../config/database');
const initModels = require('../models/init-models');
const models = initModels(sequelize);
const { users, clinics, group_codes, code_attributes } = models;
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

  // // Login existing consultant
  loginConsultant: async (req, res) => {
    try {
      const { phone_number, otp } = req.body;

      // Verify OTP first (accepts 1234 for development)
      if (otp !== '1234') {
        const storedOTP = otpStorage.get(phone_number);
        if (!storedOTP || !storedOTP.verified || storedOTP.otp !== otp) {
          return res.status(400).json({
            success: false,
            message: 'Invalid or unverified OTP'
          });
        }
      }

      // Find existing user
      const user = await users.findOne({
        where: { phone_number, role: 'DOCTOR' },
        include: [{
          model: clinics,
          as: 'clinics'
        }]
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found. Please register first.'
        });
      }

      // Clean up OTP storage
      otpStorage.delete(phone_number);

      // Generate JWT token
      const token = generateToken(user);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        token: token,
        user: {
          id: user.user_id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phone_number,
          role: 'doctor',
          currentRole: 'doctor',
          isHost: true,
          canToggleRole: true,
          qualification: user.qualification,
          specialization: user.specialization,
          clinics: user.clinics ? user.clinics.map(clinic => ({
            id: clinic.clinic_id,
            name: clinic.clinic_name,
            city: clinic.city,
            isPrimary: clinic.is_primary
          })) : []
        }
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

loginUser: async (req, res) => {
  try {
    const { phone_number, otp } = req.body;

    // Verify OTP first (accepts 1234 for development)
    if (otp !== '1234') {
      const storedOTP = otpStorage.get(phone_number);
      if (!storedOTP || !storedOTP.verified || storedOTP.otp !== otp) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or unverified OTP'
        });
      }
    }

    // Check if user exists with verification fields
    const user = await users.findOne({
      where: { phone_number },
      include: [{
        model: clinics,
        as: 'clinics',
        required: false  // LEFT JOIN to include users without clinics
      }],
      // Ensure we get verification fields from database
      attributes: [
        'user_id', 'name', 'email', 'phone_number', 'role', 'qualification', 
        'specialization', 'status', 'is_verified', 'has_subscription',
        'dci_number', 'dci_registration', 'degree_certificate', 'identity_proof',
        'profile_pic_url', 'created_date'
      ]
    });

    if (!user) {
      // User doesn't exist - redirect to registration
      return res.status(404).json({
        success: false,
        message: 'User not found. Please register first.',
        action: 'REDIRECT_TO_REGISTRATION',
        phone_number: phone_number
      });
    }

    // ✅ ALWAYS LOGIN - just include verification status in response
    otpStorage.delete(phone_number); // Clean up OTP
    const token = generateToken(user);

    // Role-based response - ALWAYS include verification status
    let userData;
    
    if (user.role === 'DOCTOR') {
      userData = {
        id: user.user_id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phone_number,
        role: 'doctor',
        currentRole: 'consultant', // Default to consultant
        isHost: true,
        canToggleRole: true, // Doctors can toggle between host/consultant
        qualification: user.qualification,
        specialization: user.specialization,
        dashboardType: 'DOCTOR_DASHBOARD',
        isVerified: !!user.is_verified,        // ✅ Always include from database
        hasSubscription: !!user.has_subscription, // ✅ Always include from database
        profilePicUrl: user.profile_pic_url,
        registrationDate: user.created_date,
        // ✅ Add document info for verification process
        documents: {
          dciNumber: user.dci_number,
          dciRegistration: user.dci_registration,
          degreeCertificate: user.degree_certificate,
          identityProof: user.identity_proof
        },
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
        name: user.name,
        email: user.email,
        phoneNumber: user.phone_number,
        role: 'intern',
        currentRole: 'intern',
        isHost: false,
        canToggleRole: false, // Interns cannot toggle roles
        qualification: user.qualification,
        specialization: user.specialization,
        dashboardType: 'INTERN_DASHBOARD',
        isVerified: !!user.is_verified,        // ✅ Always include from database
        hasSubscription: !!user.has_subscription, // ✅ Always include from database
        profilePicUrl: user.profile_pic_url,
        registrationDate: user.created_date,
        // ✅ Add document info for verification process
        documents: {
          dciNumber: user.dci_number,
          dciRegistration: user.dci_registration,
          degreeCertificate: user.degree_certificate,
          identityProof: user.identity_proof
        },
        clinics: [] // Interns don't have clinics
      };
    } else {
      // Admin or other roles
      userData = {
        id: user.user_id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phone_number,
        role: user.role.toLowerCase(),
        currentRole: user.role.toLowerCase(),
        isHost: user.role === 'ADMIN',
        canToggleRole: false,
        qualification: user.qualification,
        specialization: user.specialization,
        dashboardType: 'ADMIN_DASHBOARD',
        isVerified: !!user.is_verified,        // ✅ Always include from database
        hasSubscription: !!user.has_subscription, // ✅ Always include from database
        profilePicUrl: user.profile_pic_url,
        registrationDate: user.created_date,
        documents: {
          dciNumber: user.dci_number,
          dciRegistration: user.dci_registration,
          degreeCertificate: user.degree_certificate,
          identityProof: user.identity_proof
        },
        clinics: []
      };
    }

    // ✅ ALWAYS return success with verification status
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
  }
};
