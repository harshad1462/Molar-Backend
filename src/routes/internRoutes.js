const express = require("express");
const router = express.Router();
const internController = require("../controllers/internController");

router.post('/verify', internController.verify);     // Step 1
router.post('/register', internController.register); // Step 2

module.exports = router;
