const express = require('express');
const router = express.Router();
const packageController = require('../controllers/packageController');

// GET all subscription plans
router.get('/', packageController.findAll);

// GET single package by ID
router.get('/:id', packageController.findOne);

// POST - Create new subscription
router.post('/', packageController.create);

// PUT - Update subscription package
router.put('/:id', packageController.update);

// PATCH - Change status active/inactive (THE MAIN ONE FOR STATUS TOGGLE)
router.patch('/:id/status', packageController.updateStatus);

// DELETE package
router.delete('/:id', packageController.delete);

module.exports = router;
