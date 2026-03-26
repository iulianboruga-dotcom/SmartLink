const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');
const { validateRegister, validateLogin } = require('../middleware/validate');

// POST /api/auth/register
router.post('/register', validateRegister, register);

// POST /api/auth/login
router.post('/login', validateLogin, login);

module.exports = router;
