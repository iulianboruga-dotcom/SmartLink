const express = require('express');
const router = express.Router();
const { receiveSensorData, receiveECG, receiveAccelerometer, getHistory, getECGHistory } = require('../controllers/sensorController');
const { verifyToken } = require('../middleware/auth');
const { validateSensorData } = require('../middleware/validate');

// POST /api/sensors — trimis de aplicația Android
router.post('/', validateSensorData, receiveSensorData);

// POST /api/sensors/ecg
router.post('/ecg', receiveECG);

// POST /api/sensors/accelerometer
router.post('/accelerometer', receiveAccelerometer);

// GET /api/sensors/history?patientId=&startDate=&endDate=
router.get('/history', verifyToken, getHistory);

// GET /api/sensors/ecg?patientId=X — returnează cel mai recent batch ECG ca array {index, value}
router.get('/ecg', verifyToken, getECGHistory);

module.exports = router;
