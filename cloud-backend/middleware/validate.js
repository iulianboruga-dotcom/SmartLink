const { body, validationResult } = require('express-validator');

// Middleware care returnează erori de validare dacă există
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

// Validare register
const validateRegister = [
  body('email').isEmail().withMessage('Email invalid'),
  body('password').isLength({ min: 6 }).withMessage('Parola trebuie să aibă minim 6 caractere'),
  body('role').isIn(['doctor', 'patient']).withMessage('Rol invalid (doctor/patient)'),
  body('firstName').notEmpty().withMessage('Prenumele este obligatoriu'),
  body('lastName').notEmpty().withMessage('Numele este obligatoriu'),
  handleValidationErrors,
];

// Validare login
const validateLogin = [
  body('email').isEmail().withMessage('Email invalid'),
  body('password').notEmpty().withMessage('Parola este obligatorie'),
  handleValidationErrors,
];

// Validare date senzori de la ESP32
const validateSensorData = [
  body('patientId').notEmpty().withMessage('patientId obligatoriu'),
  body('pulse').isInt({ min: 0, max: 300 }).withMessage('Puls invalid (0-300)'),
  body('temperature').isFloat({ min: 20, max: 50 }).withMessage('Temperatură invalidă (20-50°C)'),
  body('humidity').isFloat({ min: 0, max: 100 }).withMessage('Umiditate invalidă (0-100%)'),
  handleValidationErrors,
];

// Validare praguri alarme
const validateThresholds = [
  body('pulseMin').isInt({ min: 0, max: 300 }).withMessage('pulseMin invalid'),
  body('pulseMax').isInt({ min: 0, max: 300 }).withMessage('pulseMax invalid'),
  body('tempMin').isFloat({ min: 20, max: 50 }).withMessage('tempMin invalid'),
  body('tempMax').isFloat({ min: 20, max: 50 }).withMessage('tempMax invalid'),
  body('humMin').isFloat({ min: 0, max: 100 }).withMessage('humMin invalid'),
  body('humMax').isFloat({ min: 0, max: 100 }).withMessage('humMax invalid'),
  handleValidationErrors,
];

module.exports = { validateRegister, validateLogin, validateSensorData, validateThresholds };
