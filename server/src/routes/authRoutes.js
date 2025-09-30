const express = require('express');
const { handleRegister, handleLogin, handleGoogle, handleForgotPassword } = require('../controllers/authController');

const router = express.Router();

router.post('/register', handleRegister);
router.post('/login', handleLogin);
router.post('/google', handleGoogle);
router.post('/forgot-password', handleForgotPassword);

module.exports = router;


