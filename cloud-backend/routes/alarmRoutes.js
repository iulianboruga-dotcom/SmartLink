const express = require('express');
const router = express.Router();
const { reportAlarm, getThresholds, upsertThresholds, getHistory, acknowledgeAlarm } = require('../controllers/alarmController');
const { verifyToken, requireRole } = require('../middleware/auth');
const { validateThresholds } = require('../middleware/validate');

// POST /api/alarms — trimis de aplicația Android când depășește un prag
router.post('/', reportAlarm);

// GET /api/alarms/history?patientId=
router.get('/history', verifyToken, getHistory);

// GET /api/alarms/thresholds/:patientId
router.get('/thresholds/:patientId', verifyToken, getThresholds);

// PUT /api/alarms/thresholds/:patientId — doar medicul poate seta praguri
router.put('/thresholds/:patientId', verifyToken, requireRole('doctor'), validateThresholds, upsertThresholds);

// PATCH /api/alarms/:id/acknowledge
router.patch('/:id/acknowledge', verifyToken, requireRole('doctor'), acknowledgeAlarm);

module.exports = router;
