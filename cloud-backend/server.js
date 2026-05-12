require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

const authRoutes = require('./routes/authRoutes');
const patientRoutes = require('./routes/patientRoutes');
const sensorRoutes = require('./routes/sensorRoutes');
const alarmRoutes = require('./routes/alarmRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');
const doctorRoutes = require('./routes/doctorRoutes');

const app = express();
const PORT = process.env.PORT || 8080;

const swaggerDocument = YAML.load('./swagger.yaml');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Middleware securitate
app.use(helmet());

// CORS — permite Vercel și localhost
app.use(cors({
  origin: [
    process.env.CORS_ORIGIN,
    'http://localhost:3000',
  ],
  credentials: true,
}));

app.use(express.json());

// Rute API
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/alarms', alarmRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/doctors', doctorRoutes);

// Health check — folosit de Azure App Service
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Error handling global
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Eroare internă server',
  });
});

app.listen(PORT, () => {
  console.log(`SmartLink API pornit pe portul ${PORT}`);
});
