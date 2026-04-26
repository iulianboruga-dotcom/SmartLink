const express = require('express');
const router = express.Router();
const { getAll, getById, update, assignDoctor, unassignDoctor } = require('../controllers/patientController');
const { verifyToken, requireRole } = require('../middleware/auth');

// GET /api/patients - doar medicul vede lista pacientilor sai
router.get('/', verifyToken, requireRole('doctor'), getAll);

// POST /api/patients/assign-doctor - asociere pacient-doctor
router.post('/assign-doctor', verifyToken, requireRole('doctor'), assignDoctor);

//DELETE /api/patients/unassign-doctor  dezasociere pacient-doctor
router.delete('/unassign-doctor', verifyToken, requireRole('doctor'), unassignDoctor);

// GET /api/patients/:id
router.get('/:id', verifyToken, getById);

// PUT /api/patients/:id
router.put('/:id', verifyToken, requireRole('doctor'), update);

module.exports = router;
