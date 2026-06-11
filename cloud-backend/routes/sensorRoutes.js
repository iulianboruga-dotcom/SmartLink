const express = require('express');
const router = express.Router();
const { receiveSensorData, receiveECG, receiveAccelerometer, getHistory, getECGHistory, getECGList } = require('../controllers/sensorController');
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

// GET /api/sensors/ecg/list?patientId=X — lista tuturor înregistrărilor (id + recorded_at)
router.get('/ecg/list', verifyToken, getECGList);

// GET /api/sensors/ecg?patientId=X[&recordingId=Y] — înregistrare ECG (ultima sau după ID)
router.get('/ecg', verifyToken, getECGHistory);

module.exports = router;
