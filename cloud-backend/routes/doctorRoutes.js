const express = require('express');
const router = express.Router();
const { getProfile, getAll } = require('../controllers/doctorController');
const { verifyToken, requireRole } = require('../middleware/auth');

// GET /api/doctors — lista medicilor (public pentru asociere)
router.get('/', getAll);

// GET /api/doctors/profile — profilul medicului logat
router.get('/profile', verifyToken, requireRole('doctor'), getProfile);

module.exports = router;
