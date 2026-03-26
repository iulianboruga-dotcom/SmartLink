const express = require('express');
const router = express.Router();
const { getAll, getById, update } = require('../controllers/patientController');
const { verifyToken, requireRole } = require('../middleware/auth');

// GET /api/patients — doar medicul vede lista pacienților săi
router.get('/', verifyToken, requireRole('doctor'), getAll);

// GET /api/patients/:id
router.get('/:id', verifyToken, getById);

// PUT /api/patients/:id
router.put('/:id', verifyToken, requireRole('doctor'), update);

module.exports = router;
