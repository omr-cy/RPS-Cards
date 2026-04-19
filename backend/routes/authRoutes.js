const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/google', authController.googleAuth);
router.get('/profile/:uid', authController.getProfile);

module.exports = router;
