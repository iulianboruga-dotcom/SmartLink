const express = require('express');
const router = express.Router();
const { create, getByPatient, deleteRecommendation } = require('../controllers/recommendationController');
const { verifyToken, requireRole } = require('../middleware/auth');

// POST /api/recommendations — doar medicul adaugă
router.post('/', verifyToken, requireRole('doctor'), create);

// GET /api/recommendations/:patientId
router.get('/:patientId', verifyToken, getByPatient);

// DELETE /api/recommendations/:id
router.delete('/:id', verifyToken, requireRole('doctor'), deleteRecommendation);

module.exports = router;
