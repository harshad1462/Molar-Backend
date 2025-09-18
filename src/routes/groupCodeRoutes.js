const express = require('express');
const router = express.Router();
const groupCodeController = require('../controllers/groupCodeController');

router.post('/', groupCodeController.create);
router.get('/', groupCodeController.findAll);
router.get('/:id', groupCodeController.findOneWithAttributes); // includes code attributes
router.put('/:id', groupCodeController.update);
router.delete('/:id', groupCodeController.delete);

module.exports = router;
