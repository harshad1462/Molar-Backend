const sequelize = require('../config/database');
const initModels = require('../models/init-models');
const path = require('path');
const fs = require('fs');

const models = initModels(sequelize);
const Users = models.users;

module.exports = {
uploadDocument: async (req, res) => {
  try {
    const { userId, documentType } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    
    if (!userId || !documentType) {
      return res.status(400).json({ success: false, error: 'User ID and document type are required' });
    }

    console.log('📋 Processing upload:', { userId, documentType, tempFile: req.file.filename });

    // ✅ SUPPORT BOTH CAMELCASE AND SNAKE_CASE (INCLUDING AADHAAR)
    const validDocTypes = [
      'identity_proof', 'identityProof', 'aadhaarDocument', // ✅ Added aadhaarDocument
      'degree_certificate', 'degreeDocument', 
      'dci_registration', 'dciLicense',
      'experience_letter', 'experienceLetter'
    ];
    
    if (!validDocTypes.includes(documentType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid document type. Allowed: ' + validDocTypes.join(', ')
      });
    }

    // ✅ MAP FRONTEND NAMES TO DATABASE COLUMNS (AADHAAR = IDENTITY)
    const mapToColumn = {
      identityProof: 'identity_proof',
      aadhaarDocument: 'identity_proof', // ✅ AADHAAR MAPS TO IDENTITY_PROOF
      identity_proof: 'identity_proof',
      degreeDocument: 'degree_certificate',
      degree_certificate: 'degree_certificate',
      dciLicense: 'dci_registration',
      dci_registration: 'dci_registration',
      experienceLetter: 'experience_letter',
      experience_letter: 'experience_letter'
    };

    const columnKey = mapToColumn[documentType];

    // Check if user exists
    const user = await Users.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // ✅ DIRECTORY AND FILENAME GENERATION (USING YOUR FOLDER STRUCTURE)
    const baseDir = path.join(__dirname, '../../Public/uploads/documents');
    const dirMap = {
      identity_proof: path.join(baseDir, 'identity-proof'), // ✅ HYPHEN NOT UNDERSCORE
      degree_certificate: path.join(baseDir, 'degree-certificate'),
      dci_registration: path.join(baseDir, 'dci-registration'),
      experience_letter: path.join(baseDir, 'experience-letter')
    };

    const targetDir = dirMap[columnKey];
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // ✅ GENERATE FINAL FILENAME
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1E9);
    const extension = path.extname(req.file.originalname);
    const nameWithoutExt = path.basename(req.file.originalname, extension);
    const cleanName = nameWithoutExt
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9._-]/g, '')
      .substring(0, 30);

    const finalFilename = `${columnKey}_user${userId}_${timestamp}_${random}_${cleanName}${extension}`;

    // ✅ MOVE FILE FROM TEMP TO FINAL LOCATION
    const tempFilePath = req.file.path;
    const finalFilePath = path.join(targetDir, finalFilename);

    try {
      fs.renameSync(tempFilePath, finalFilePath);
      console.log('✅ File moved:', tempFilePath, '->', finalFilePath);
    } catch (moveError) {
      console.error('❌ File move error:', moveError);
      return res.status(500).json({ success: false, error: 'Failed to move uploaded file' });
    }

    // ✅ GENERATE CORRECT URL FOR DATABASE (WITH HYPHENS)
    const folderMap = {
      identity_proof: 'identity-proof',
      degree_certificate: 'degree-certificate', 
      dci_registration: 'dci-registration',
      experience_letter: 'experience-letter'
    };

    const folderName = folderMap[columnKey];
    const fileUrl = `/uploads/documents/${folderName}/${finalFilename}`;
    
    // Prepare update data
    const updateData = {
      updated_date: new Date(),
      updated_by: `user_${userId}`
    };
    
    // ✅ MAP TO CORRECT DATABASE FIELDS
    switch (columnKey) {
      case 'identity_proof':
        updateData.identity_proof = fileUrl;
        updateData.identity_proof_status = 'PENDING';
        break;
      case 'degree_certificate':
        updateData.degree_certificate = fileUrl;
        updateData.degree_certificate_status = 'PENDING';
        break;
      case 'dci_registration':
        updateData.dci_registration = fileUrl;
        updateData.dci_registration_status = 'PENDING';
        break;
      case 'experience_letter':
        updateData.experience_letter = fileUrl;
        break;
    }

    // Update user record
    await Users.update(updateData, { where: { user_id: userId } });

    console.log(`✅ Document uploaded for user ${userId}: ${documentType} -> ${columnKey} -> ${fileUrl}`);

    res.json({
      success: true,
      message: `${columnKey.replace('_', ' ')} uploaded successfully and sent for verification`,
      data: {
        userId: parseInt(userId),
        documentType: columnKey,
        originalType: documentType,
        fileUrl,
        filename: finalFilename, // ✅ USE FINAL FILENAME
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
        status: columnKey === 'experience_letter' ? 'UPLOADED' : 'PENDING',
        uploadedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Document upload error:', error);
    
    // Clean up uploaded file if database update fails
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to upload document: ' + error.message
    });
  }
},


  // Get user documents
  getUserDocuments: async (req, res) => {
    try {
      const { userId } = req.params;
      
      const user = await Users.findByPk(userId, {
        attributes: [
          'user_id', 'name', 'email', 'phone_number',
          'identity_proof', 'identity_proof_status',
          'degree_certificate', 'degree_certificate_status', 
          'dci_registration', 'dci_registration_status',
          'experience_letter',
          'is_verified', 'has_subscription',
          'updated_date'
        ]
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Calculate verification progress
      const documents = [
        { type: 'identity_proof', status: user.identity_proof_status, required: true },
        { type: 'degree_certificate', status: user.degree_certificate_status, required: true },
        { type: 'dci_registration', status: user.dci_registration_status, required: true }
      ];

      const totalRequired = documents.filter(doc => doc.required).length;
      const verifiedCount = documents.filter(doc => doc.status === 'VERIFIED').length;
      const pendingCount = documents.filter(doc => doc.status === 'PENDING').length;
      const rejectedCount = documents.filter(doc => doc.status === 'REJECTED').length;

      // ✅ RETURN BOTH CAMELCASE AND SNAKE_CASE FOR COMPATIBILITY
      res.json({
        success: true,
        data: {
          userId: user.user_id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phone_number,
          documents: {
            // Snake case (for existing admin)
            identity_proof: {
              url: user.identity_proof,
              status: user.identity_proof_status || 'PENDING',
              required: true
            },
            degree_certificate: {
              url: user.degree_certificate,
              status: user.degree_certificate_status || 'PENDING',
              required: true
            },
            dci_registration: {
              url: user.dci_registration,
              status: user.dci_registration_status || 'PENDING',
              required: true
            },
            experience_letter: {
              url: user.experience_letter,
              status: 'OPTIONAL',
              required: false
            },
            // Camel case (for mobile app)
            identityProof: {
              url: user.identity_proof,
              status: user.identity_proof_status || 'PENDING',
              required: true
            },
            degreeDocument: {
              url: user.degree_certificate,
              status: user.degree_certificate_status || 'PENDING',
              required: true
            },
            dciLicense: {
              url: user.dci_registration,
              status: user.dci_registration_status || 'PENDING',
              required: true
            },
            experienceLetter: {
              url: user.experience_letter,
              status: 'OPTIONAL',
              required: false
            }
          },
          verification: {
            isVerified: !!user.is_verified,
            hasSubscription: !!user.has_subscription,
            progress: {
              total: totalRequired,
              verified: verifiedCount,
              pending: pendingCount,
              rejected: rejectedCount,
              percentage: Math.round((verifiedCount / totalRequired) * 100)
            }
          },
          lastUpdated: user.updated_date
        }
      });

    } catch (error) {
      console.error('Get documents error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // Update document status (Admin only)
  updateDocumentStatus: async (req, res) => {
    try {
      const { userId, documentType, status, remarks } = req.body;

      // Validate inputs
      const validStatuses = ['PENDING', 'VERIFIED', 'REJECTED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status. Allowed: ' + validStatuses.join(', ')
        });
      }

      const validDocTypes = ['identity_proof', 'degree_certificate', 'dci_registration'];
      if (!validDocTypes.includes(documentType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid document type for status update'
        });
      }

      // Update document status
      const updateData = {
        [`${documentType}_status`]: status,
        updated_date: new Date(),
        updated_by: 'admin'
      };

      const [updatedRows] = await Users.update(updateData, {
        where: { user_id: userId }
      });

      if (updatedRows === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Check if all required documents are verified
      const user = await Users.findByPk(userId, {
        attributes: ['user_id', 'name', 'identity_proof_status', 'degree_certificate_status', 'dci_registration_status', 'is_verified']
      });

      const allVerified = user.identity_proof_status === 'VERIFIED' &&
                         user.degree_certificate_status === 'VERIFIED' &&
                         user.dci_registration_status === 'VERIFIED';

      // Auto-update is_verified status
      if (allVerified && !user.is_verified) {
        await Users.update(
          { is_verified: true, updated_date: new Date() },
          { where: { user_id: userId } }
        );
        console.log(`User ${userId} automatically verified - all documents approved`);
      } else if (!allVerified && user.is_verified) {
        await Users.update(
          { is_verified: false, updated_date: new Date() },
          { where: { user_id: userId } }
        );
        console.log(`User ${userId} verification revoked - document status changed`);
      }

      res.json({
        success: true,
        message: `${documentType.replace('_', ' ')} status updated to ${status}`,
        data: {
          userId: user.user_id,
          userName: user.name,
          documentType,
          newStatus: status,
          isVerified: allVerified,
          remarks: remarks || null,
          updatedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Update document status error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // Delete document (User or Admin)
  deleteDocument: async (req, res) => {
    try {
      const { userId, documentType } = req.params;

      const validDocTypes = ['identity_proof', 'degree_certificate', 'dci_registration', 'experience_letter'];
      if (!validDocTypes.includes(documentType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid document type'
        });
      }

      const user = await Users.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Get current document URL
      const currentDocUrl = user[documentType];
      if (!currentDocUrl) {
        return res.status(404).json({
          success: false,
          error: 'Document not found'
        });
      }

      // Prepare update data
      const updateData = {
        [documentType]: null,
        updated_date: new Date()
      };

      // Reset status for documents that have status
      if (documentType !== 'experience_letter') {
        updateData[`${documentType}_status`] = 'PENDING';
        // If verification was true, set it to false
        if (user.is_verified) {
          updateData.is_verified = false;
        }
      }

      // Update database
      await Users.update(updateData, {
        where: { user_id: userId }
      });

      // Delete physical file
      try {
        const filePath = path.join(__dirname, '../../public', currentDocUrl);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (fileError) {
        console.error('File deletion error:', fileError);
        // Don't fail the request if file deletion fails
      }

      res.json({
        success: true,
        message: `${documentType.replace('_', ' ')} deleted successfully`,
        data: {
          userId: parseInt(userId),
          documentType,
          deletedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Delete document error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

};
