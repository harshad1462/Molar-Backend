const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Document directories setup (using your exact path structure)
const baseDir = path.join(__dirname, '../../Public/uploads/documents'); // ✅ FIXED PATH
const identityProofDir = path.join(baseDir, 'identity-proof');
const degreeCertificateDir = path.join(baseDir, 'degree-certificate');
const dciRegistrationDir = path.join(baseDir, 'dci-registration');
const experienceLetterDir = path.join(baseDir, 'experience-letter');

// Create directories if they don't exist
[baseDir, identityProofDir, degreeCertificateDir, dciRegistrationDir, experienceLetterDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// ✅ SOLUTION: Store temp file first, then move in controller
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Always use base directory - we'll move the file later in controller
    cb(null, baseDir);
  },
  filename: function (req, file, cb) {
    // Generate temporary filename  
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const filename = `temp_${timestamp}_${random}${extension}`;
    cb(null, filename);
  }
});

// File filter for validation
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'application/pdf'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed.'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
    files: 1 // Single file upload
  }
});

module.exports = {
  documentUpload: upload.single('document'),
  
  handleDocumentUploadError: (error, req, res, next) => {
    console.error('📋 Document upload middleware error:', error.message);

    if (error instanceof multer.MulterError) {
      switch (error.code) {
        case 'LIMIT_FILE_SIZE':
          return res.status(400).json({
            success: false,
            error: 'File size too large. Maximum size is 5MB per file.',
            code: 'FILE_TOO_LARGE'
          });
        case 'LIMIT_FILE_COUNT':
          return res.status(400).json({
            success: false,
            error: 'Only one file allowed per upload.',
            code: 'TOO_MANY_FILES'
          });
        case 'LIMIT_UNEXPECTED_FILE':
          return res.status(400).json({
            success: false,
            error: 'Unexpected field. Use "document" as field name.',
            code: 'UNEXPECTED_FIELD'
          });
        default:
          return res.status(400).json({
            success: false,
            error: 'File upload error: ' + error.message,
            code: 'MULTER_ERROR'
          });
      }
    }
    
    return res.status(500).json({
      success: false,
      error: 'Server error during file upload: ' + error.message,
      code: 'SERVER_ERROR'
    });
  },

  // ✅ HELPER FUNCTIONS FOR CONTROLLER
  getTargetDirectory: (documentType) => {
    const dirMap = {
      identityProof: identityProofDir,
      aadhaarDocument: identityProofDir,
      degreeDocument: degreeCertificateDir,
      dciLicense: dciRegistrationDir,
      experienceLetter: experienceLetterDir,
      identity_proof: identityProofDir,
      degree_certificate: degreeCertificateDir,
      dci_registration: dciRegistrationDir,
      experience_letter: experienceLetterDir
    };
    return dirMap[documentType] || baseDir;
  },

  generateFinalFilename: (userId, documentType, originalName) => {
    const normalizeType = {
      identityProof: 'identity_proof',
      aadhaarDocument: 'identity_proof',
      degreeDocument: 'degree_certificate',
      dciLicense: 'dci_registration',
      experienceLetter: 'experience_letter',
      identity_proof: 'identity_proof',
      degree_certificate: 'degree_certificate',
      dci_registration: 'dci_registration',
      experience_letter: 'experience_letter'
    };
    
    const normalizedType = normalizeType[documentType] || documentType;
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1E9);
    const extension = path.extname(originalName);
    const nameWithoutExt = path.basename(originalName, extension);
    const cleanName = nameWithoutExt
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9._-]/g, '')
      .substring(0, 30);
    
    return `${normalizedType}_user${userId}_${timestamp}_${random}_${cleanName}${extension}`;
  }
};
