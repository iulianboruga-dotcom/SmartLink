// Date false realiste pentru SmartLink — folosite până la conectarea backend-ului real

const now = new Date();

// Generează citiri senzori pentru ultimele 24h (48 citiri la fiecare 30 min)
function generateSensorReadings(patientId, baseHR, baseTemp) {
  const readings = [];
  for (let i = 47; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 30 * 60 * 1000);
    readings.push({
      id: `${patientId}-s-${i}`,
      patientId,
      pulse: Math.round(baseHR + (Math.random() - 0.5) * 20),
      temperature: parseFloat((baseTemp + (Math.random() - 0.5) * 1.5).toFixed(1)),
      humidity: Math.round(50 + (Math.random() - 0.5) * 20),
      recordedAt: time.toISOString(),
    });
  }
  return readings;
}

// Generează 100 puncte ECG realiste (între 400-700)
function generateECG(patientId) {
  const points = [];
  for (let i = 0; i < 100; i++) {
    let value = 512; // linie de baza
    // Simulare complex PQRST
    const pos = i % 20;
    if (pos === 4) value = 520;
    else if (pos === 5) value = 540;
    else if (pos === 6) value = 700; // varf R
    else if (pos === 7) value = 440; // val S
    else if (pos === 8) value = 510;
    else if (pos === 12) value = 530; // val T
    else if (pos === 13) value = 545;
    else if (pos === 14) value = 520;
    else value = 510 + Math.round((Math.random() - 0.5) * 10);
    points.push({ index: i, value });
  }
  return points;
}

// Praguri alarme default per pacient
function defaultThresholds(patientId) {
  return {
    patientId,
    pulseMin: 50,
    pulseMax: 120,
    tempMin: 35.5,
    tempMax: 38.0,
    humMin: 30,
    humMax: 70,
    updatedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

export const mockDoctors = [
  {
    id: 'doc-1',
    userId: 'user-doc-1',
    email: 'medic@test.com',
    firstName: 'Alexandru',
    lastName: 'Ionescu',
    specialization: 'Cardiologie',
    clinicName: 'Spitalul Clinic UPT',
    role: 'doctor',
  },
];

export const mockPatients = [
  {
    id: 'pac-1',
    userId: 'user-pac-1',
    email: 'pacient@test.com',
    firstName: 'Maria',
    lastName: 'Popescu',
    age: 45,
    weight: 68,
    height: 165,
    bloodType: 'A+',
    doctorId: 'doc-1',
    deviceId: 'ESP32-A1B2C3',
    role: 'patient',
  },
  {
    id: 'pac-2',
    userId: 'user-pac-2',
    email: 'pacient2@test.com',
    firstName: 'Ion',
    lastName: 'Dumitrescu',
    age: 62,
    weight: 85,
    height: 178,
    bloodType: 'O-',
    doctorId: 'doc-1',
    deviceId: 'ESP32-D4E5F6',
    role: 'patient',
  },
  {
    id: 'pac-3',
    userId: 'user-pac-3',
    email: 'pacient3@test.com',
    firstName: 'Elena',
    lastName: 'Constantin',
    age: 38,
    weight: 58,
    height: 162,
    bloodType: 'B+',
    doctorId: 'doc-1',
    deviceId: 'ESP32-G7H8I9',
    role: 'patient',
  },
];

export const mockSensorData = {
  'pac-1': generateSensorReadings('pac-1', 78, 36.8),
  'pac-2': generateSensorReadings('pac-2', 95, 37.4),
  'pac-3': generateSensorReadings('pac-3', 65, 36.5),
};

export const mockECGData = {
  'pac-1': generateECG('pac-1'),
  'pac-2': generateECG('pac-2'),
  'pac-3': generateECG('pac-3'),
};

export const mockThresholds = {
  'pac-1': defaultThresholds('pac-1'),
  'pac-2': defaultThresholds('pac-2'),
  'pac-3': defaultThresholds('pac-3'),
};

export const mockAlarms = {
  'pac-1': [
    { id: 'al-1-1', patientId: 'pac-1', type: 'PULSE_HIGH', measuredValue: 128, thresholdValue: 120, triggeredAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), acknowledged: false },
    { id: 'al-1-2', patientId: 'pac-1', type: 'TEMP_HIGH', measuredValue: 38.4, thresholdValue: 38.0, triggeredAt: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(), acknowledged: true },
    { id: 'al-1-3', patientId: 'pac-1', type: 'PULSE_LOW', measuredValue: 46, thresholdValue: 50, triggeredAt: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(), acknowledged: true },
    { id: 'al-1-4', patientId: 'pac-1', type: 'PULSE_HIGH', measuredValue: 135, thresholdValue: 120, triggeredAt: new Date(now.getTime() - 18 * 60 * 60 * 1000).toISOString(), acknowledged: true },
    { id: 'al-1-5', patientId: 'pac-1', type: 'HUM_LOW', measuredValue: 24, thresholdValue: 30, triggeredAt: new Date(now.getTime() - 23 * 60 * 60 * 1000).toISOString(), acknowledged: true },
  ],
  'pac-2': [
    { id: 'al-2-1', patientId: 'pac-2', type: 'PULSE_HIGH', measuredValue: 138, thresholdValue: 120, triggeredAt: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(), acknowledged: false },
    { id: 'al-2-2', patientId: 'pac-2', type: 'TEMP_HIGH', measuredValue: 38.7, thresholdValue: 38.0, triggeredAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(), acknowledged: false },
    { id: 'al-2-3', patientId: 'pac-2', type: 'PULSE_HIGH', measuredValue: 142, thresholdValue: 120, triggeredAt: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(), acknowledged: true },
    { id: 'al-2-4', patientId: 'pac-2', type: 'TEMP_HIGH', measuredValue: 39.1, thresholdValue: 38.0, triggeredAt: new Date(now.getTime() - 15 * 60 * 60 * 1000).toISOString(), acknowledged: true },
    { id: 'al-2-5', patientId: 'pac-2', type: 'HUM_HIGH', measuredValue: 76, thresholdValue: 70, triggeredAt: new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString(), acknowledged: true },
  ],
  'pac-3': [
    { id: 'al-3-1', patientId: 'pac-3', type: 'PULSE_LOW', measuredValue: 44, thresholdValue: 50, triggeredAt: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(), acknowledged: false },
    { id: 'al-3-2', patientId: 'pac-3', type: 'TEMP_LOW', measuredValue: 35.2, thresholdValue: 35.5, triggeredAt: new Date(now.getTime() - 9 * 60 * 60 * 1000).toISOString(), acknowledged: true },
    { id: 'al-3-3', patientId: 'pac-3', type: 'PULSE_HIGH', measuredValue: 124, thresholdValue: 120, triggeredAt: new Date(now.getTime() - 14 * 60 * 60 * 1000).toISOString(), acknowledged: true },
    { id: 'al-3-4', patientId: 'pac-3', type: 'HUM_LOW', measuredValue: 27, thresholdValue: 30, triggeredAt: new Date(now.getTime() - 19 * 60 * 60 * 1000).toISOString(), acknowledged: true },
    { id: 'al-3-5', patientId: 'pac-3', type: 'TEMP_HIGH', measuredValue: 38.2, thresholdValue: 38.0, triggeredAt: new Date(now.getTime() - 22 * 60 * 60 * 1000).toISOString(), acknowledged: true },
  ],
};

export const mockRecommendations = {
  'pac-1': [
    { id: 'rec-1-1', patientId: 'pac-1', doctorId: 'doc-1', text: 'Reduceți consumul de sare și grăsimi saturate. Dieta DASH recomandată.', priority: 'high', createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(), read: true },
    { id: 'rec-1-2', patientId: 'pac-1', doctorId: 'doc-1', text: 'Exerciții fizice moderate: 30 minute de mers pe jos zilnic.', priority: 'medium', createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(), read: true },
    { id: 'rec-1-3', patientId: 'pac-1', doctorId: 'doc-1', text: 'Consultație de control programată pentru săptămâna viitoare.', priority: 'low', createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), read: false },
  ],
  'pac-2': [
    { id: 'rec-2-1', patientId: 'pac-2', doctorId: 'doc-1', text: 'Medicație antihipertensivă: Amlodipina 5mg/zi dimineața.', priority: 'high', createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), read: true },
    { id: 'rec-2-2', patientId: 'pac-2', doctorId: 'doc-1', text: 'Monitorizare tensiune arterială de 2 ori pe zi (dimineața și seara).', priority: 'high', createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(), read: false },
    { id: 'rec-2-3', patientId: 'pac-2', doctorId: 'doc-1', text: 'Reducerea stresului: tehnici de respirație și meditație.', priority: 'medium', createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), read: false },
  ],
  'pac-3': [
    { id: 'rec-3-1', patientId: 'pac-3', doctorId: 'doc-1', text: 'Hidratare corespunzătoare: minim 2 litri de apă pe zi.', priority: 'medium', createdAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(), read: true },
    { id: 'rec-3-2', patientId: 'pac-3', doctorId: 'doc-1', text: 'Somn regulat: 7-8 ore pe noapte, program fix.', priority: 'low', createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(), read: true },
    { id: 'rec-3-3', patientId: 'pac-3', doctorId: 'doc-1', text: 'Evitați efortul fizic intens în perioadele de temperaturi extreme.', priority: 'medium', createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), read: false },
  ],
};

// Determină statusul unui pacient pe baza ultimelor citiri
export function getPatientStatus(patientId) {
  const readings = mockSensorData[patientId];
  const alarms = mockAlarms[patientId];
  if (!readings || readings.length === 0) return 'Normal';
  const lastReading = readings[readings.length - 1];
  const activeAlarms = alarms.filter((a) => !a.acknowledged);
  if (activeAlarms.length >= 2) return 'Critic';
  if (activeAlarms.length === 1) return 'Atenție';
  const { pulse, temperature } = lastReading;
  if (pulse > 120 || pulse < 50 || temperature > 38 || temperature < 35.5) return 'Atenție';
  return 'Normal';
}
