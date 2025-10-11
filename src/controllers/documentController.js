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

      const validDocTypes = [
        'identity_proof', 'identityProof', 'aadhaarDocument',
        'degree_certificate', 'degreeDocument', 
        'dci_registration', 'dciLicense'
      ];
      
      if (!validDocTypes.includes(documentType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid document type. Allowed: ' + validDocTypes.join(', ')
        });
      }

      const mapToColumn = {
        identityProof: 'identity_proof',
        aadhaarDocument: 'identity_proof',
        identity_proof: 'identity_proof',
        degreeDocument: 'degree_certificate',
        degree_certificate: 'degree_certificate',
        dciLicense: 'dci_registration',
        dci_registration: 'dci_registration'
      };

      const columnKey = mapToColumn[documentType];

      const user = await Users.findByPk(userId);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      const baseDir = path.join(__dirname, '../../Public/uploads/documents');
      const dirMap = {
        identity_proof: path.join(baseDir, 'identity-proof'),
        degree_certificate: path.join(baseDir, 'degree-certificate'),
        dci_registration: path.join(baseDir, 'dci-registration')
      };

      const targetDir = dirMap[columnKey];
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const timestamp = Date.now();
      const random = Math.round(Math.random() * 1E9);
      const extension = path.extname(req.file.originalname);
      const nameWithoutExt = path.basename(req.file.originalname, extension);
      const cleanName = nameWithoutExt
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9._-]/g, '')
        .substring(0, 30);

      const finalFilename = `${columnKey}_user${userId}_${timestamp}_${random}_${cleanName}${extension}`;
      const tempFilePath = req.file.path;
      const finalFilePath = path.join(targetDir, finalFilename);

      try {
        fs.renameSync(tempFilePath, finalFilePath);
        console.log('✅ File moved:', tempFilePath, '->', finalFilePath);
      } catch (moveError) {
        console.error('❌ File move error:', moveError);
        return res.status(500).json({ success: false, error: 'Failed to move uploaded file' });
      }

      const folderMap = {
        identity_proof: 'identity-proof',
        degree_certificate: 'degree-certificate', 
        dci_registration: 'dci-registration'
      };

      const folderName = folderMap[columnKey];
      const fileUrl = `/uploads/documents/${folderName}/${finalFilename}`;
      
      const updateData = {
        updated_date: new Date(),
        updated_by: `user_${userId}`
      };
      
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
      }

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
          filename: finalFilename,
          originalName: req.file.originalname,
          size: req.file.size,
          mimeType: req.file.mimetype,
          status: 'PENDING',
          uploadedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Document upload error:', error);
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({
        success: false,
        error: 'Failed to upload document: ' + error.message
      });
    }
  },

  getUserDocuments: async (req, res) => {
    try {
      const { userId } = req.params;
      
      const user = await Users.findByPk(userId, {
        attributes: [
          'user_id', 
          'name', 
          'email', 
          'phone_number',
          'identity_proof', 
          'identity_proof_status',
          'degree_certificate', 
          'degree_certificate_status', 
          'dci_registration', 
          'dci_registration_status',
          'experience',
          'specialization',
          'qualification',
          'dci_number',
          'is_verified', 
          'has_subscription',
          'updated_date'
        ]
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      const documents = [
        { type: 'identity_proof', status: user.identity_proof_status, required: true },
        { type: 'degree_certificate', status: user.degree_certificate_status, required: true },
        { type: 'dci_registration', status: user.dci_registration_status, required: true }
      ];

      const totalRequired = documents.filter(doc => doc.required).length;
      const verifiedCount = documents.filter(doc => doc.status === 'VERIFIED').length;
      const pendingCount = documents.filter(doc => doc.status === 'PENDING').length;
      const rejectedCount = documents.filter(doc => doc.status === 'REJECTED').length;

      res.json({
        success: true,
        data: {
          userId: user.user_id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phone_number,
          experience: user.experience,
          specialization: user.specialization,
          qualification: user.qualification,
          dciNumber: user.dci_number,
          documents: {
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

  updateDocumentStatus: async (req, res) => {
    try {
      const { userId, documentType, status, remarks } = req.body;

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

      const user = await Users.findByPk(userId, {
        attributes: ['user_id', 'name', 'identity_proof_status', 'degree_certificate_status', 'dci_registration_status', 'is_verified']
      });

      const allVerified = user.identity_proof_status === 'VERIFIED' &&
                         user.degree_certificate_status === 'VERIFIED' &&
                         user.dci_registration_status === 'VERIFIED';

      if (allVerified && !user.is_verified) {
        await Users.update(
          { is_verified: true, updated_date: new Date() },
          { where: { user_id: userId } }
        );
        console.log(`User ${userId} automatically verified`);
      } else if (!allVerified && user.is_verified) {
        await Users.update(
          { is_verified: false, updated_date: new Date() },
          { where: { user_id: userId } }
        );
        console.log(`User ${userId} verification revoked`);
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

  deleteDocument: async (req, res) => {
    try {
      const { userId, documentType } = req.params;

      const validDocTypes = ['identity_proof', 'degree_certificate', 'dci_registration'];
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

      const currentDocUrl = user[documentType];
      if (!currentDocUrl) {
        return res.status(404).json({
          success: false,
          error: 'Document not found'
        });
      }

      const updateData = {
        [documentType]: null,
        [`${documentType}_status`]: 'PENDING',
        updated_date: new Date()
      };

      if (user.is_verified) {
        updateData.is_verified = false;
      }

      await Users.update(updateData, {
        where: { user_id: userId }
      });

      try {
        const filePath = path.join(__dirname, '../../Public', currentDocUrl);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (fileError) {
        console.error('File deletion error:', fileError);
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
  }
};
