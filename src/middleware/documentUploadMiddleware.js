const multer = require('multer');
const path = require('path');
const fs = require('fs');

const baseDir = path.join(__dirname, '../../Public/uploads/documents');
const identityProofDir = path.join(baseDir, 'identity-proof');
const degreeCertificateDir = path.join(baseDir, 'degree-certificate');
const dciRegistrationDir = path.join(baseDir, 'dci-registration');

[baseDir, identityProofDir, degreeCertificateDir, dciRegistrationDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, baseDir);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const filename = `temp_${timestamp}_${random}${extension}`;
    cb(null, filename);
  }
});

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

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1
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
  }
};
