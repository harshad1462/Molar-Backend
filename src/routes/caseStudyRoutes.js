const express = require('express');
const router = express.Router();
const caseStudyController = require('../controllers/caseStudyController');
const { caseStudyUpload, handleUploadError } = require('../middleware/upload');

// GET /api/case-studies - Get all case studies with pagination and search
router.get('/', caseStudyController.findAll);

// GET /api/case-studies/users - Get all users for dropdown
router.get('/users', caseStudyController.getUsers);

// POST /api/case-studies - Create new case study with file upload
router.post('/', caseStudyUpload, caseStudyController.create);

// GET /api/case-studies/:id - Get single case study by ID
router.get('/:id', caseStudyController.findOne);

// DELETE /api/case-studies/:id - Delete case study
router.delete('/:id', caseStudyController.delete);

// Error handling middleware for multer (must be after routes that use upload)
router.use(handleUploadError);

module.exports = router;
