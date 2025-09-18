const express = require('express');
const router = express.Router();
const codeAttributesController = require('../controllers/codeAttributesController');

router.post('/', codeAttributesController.create);
router.get('/', codeAttributesController.findAll);
router.get('/:id', codeAttributesController.findOne);
router.put('/:id', codeAttributesController.update);
router.delete('/:id', codeAttributesController.delete);

module.exports = router;
