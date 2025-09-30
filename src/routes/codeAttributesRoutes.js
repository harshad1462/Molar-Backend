const express = require('express');
const router = express.Router();
const codeAttributesController = require('../controllers/codeAttributesController');

router.post('/', codeAttributesController.create);
router.get('/', codeAttributesController.findAll);
router.get('/:id', codeAttributesController.findOne);
router.put('/:id', codeAttributesController.update);
router.delete('/:id', codeAttributesController.delete);
router.get('/group/:group_code_id', codeAttributesController.findByGroupCodeId);
router.get('/group/:group_code_id', codeAttributesController.findByGroupCodeId);
// Add this route to your existing routes
router.put('/:id/toggle-status', codeAttributesController.toggleStatus);


module.exports = router;
