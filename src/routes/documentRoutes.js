const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { documentUpload, handleDocumentUploadError } = require('../middleware/documentUploadMiddleware');

// POST - Upload document
router.post('/upload', 
  documentUpload, 
  handleDocumentUploadError,
  documentController.uploadDocument
);

// GET - Get user documents
router.get('/user/:userId', documentController.getUserDocuments);

// PUT - Update document status (Admin)
router.put('/status', documentController.updateDocumentStatus);

// DELETE - Delete document
router.delete('/user/:userId/:documentType', documentController.deleteDocument);


module.exports = router;
