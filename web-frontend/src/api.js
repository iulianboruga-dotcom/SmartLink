// Serviciu API SmartLink
// Deocamdată returnează mock data — înlocuiește cu fetch real la backend când este disponibil

import {
  mockPatients,
  mockDoctors,
  mockSensorData,
  mockECGData,
  mockThresholds,
  mockAlarms,
  mockRecommendations,
} from './mockData';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// ─── Autentificare ───────────────────────────────────────────────────────────

export async function login(email, password) {
  // TODO: înlocuiește cu fetch real la API
  // return fetch(`${API_URL}/auth/login`, { method: 'POST', body: JSON.stringify({ email, password }) })

  await simulateDelay();
  if (email === 'medic@test.com' && password === 'test123') {
    const user = mockDoctors[0];
    return { token: 'mock-token-doctor', user };
  }
  const patient = mockPatients.find((p) => p.email === email);
  if (patient && password === 'test123') {
    return { token: `mock-token-patient-${patient.id}`, user: patient };
  }
  throw new Error('Email sau parolă incorectă');
}

export async function logout() {
  // TODO: înlocuiește cu fetch real la API
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

// ─── Pacienți ────────────────────────────────────────────────────────────────

export async function getPatients() {
  // TODO: înlocuiește cu fetch real la API
  // return fetch(`${API_URL}/patients`, { headers: authHeaders() })
  await simulateDelay();
  return mockPatients;
}

export async function getPatientById(patientId) {
  // TODO: înlocuiește cu fetch real la API
  // return fetch(`${API_URL}/patients/${patientId}`, { headers: authHeaders() })
  await simulateDelay();
  const patient = mockPatients.find((p) => p.id === patientId);
  if (!patient) throw new Error('Pacientul nu a fost găsit');
  return patient;
}

export async function updatePatient(patientId, data) {
  // TODO: înlocuiește cu fetch real la API
  await simulateDelay();
  return { ...mockPatients.find((p) => p.id === patientId), ...data };
}

// ─── Date senzori ────────────────────────────────────────────────────────────

export async function getSensorHistory(patientId, startDate, endDate) {
  // TODO: înlocuiește cu fetch real la API
  // return fetch(`${API_URL}/sensors?patientId=${patientId}&startDate=${startDate}&endDate=${endDate}`, { headers: authHeaders() })
  await simulateDelay();
  let data = mockSensorData[patientId] || [];
  if (startDate) data = data.filter((r) => new Date(r.recordedAt) >= new Date(startDate));
  if (endDate) data = data.filter((r) => new Date(r.recordedAt) <= new Date(endDate));
  return data;
}

export async function getLatestSensorReading(patientId) {
  // TODO: înlocuiește cu fetch real la API
  await simulateDelay(100);
  const data = mockSensorData[patientId] || [];
  return data[data.length - 1] || null;
}

export async function getECGData(patientId) {
  // TODO: înlocuiește cu fetch real la API
  await simulateDelay();
  return mockECGData[patientId] || [];
}

// ─── Alarme ──────────────────────────────────────────────────────────────────

export async function getAlarms(patientId) {
  // TODO: înlocuiește cu fetch real la API
  // return fetch(`${API_URL}/alarms?patientId=${patientId}`, { headers: authHeaders() })
  await simulateDelay();
  return mockAlarms[patientId] || [];
}

export async function getAllAlarms() {
  // TODO: înlocuiește cu fetch real la API
  await simulateDelay();
  return Object.values(mockAlarms).flat();
}

export async function acknowledgeAlarm(alarmId) {
  // TODO: înlocuiește cu fetch real la API
  await simulateDelay();
  return { success: true };
}

export async function getThresholds(patientId) {
  // TODO: înlocuiește cu fetch real la API
  // return fetch(`${API_URL}/alarms/thresholds/${patientId}`, { headers: authHeaders() })
  await simulateDelay();
  return mockThresholds[patientId] || null;
}

export async function updateThresholds(patientId, thresholds) {
  // TODO: înlocuiește cu fetch real la API
  // return fetch(`${API_URL}/alarms/thresholds/${patientId}`, { method: 'PUT', body: JSON.stringify(thresholds), headers: authHeaders() })
  await simulateDelay();
  return { ...mockThresholds[patientId], ...thresholds, updatedAt: new Date().toISOString() };
}

export async function postAlarm(alarm) {
  // TODO: înlocuiește cu fetch real la API
  await simulateDelay();
  return { id: `al-new-${Date.now()}`, ...alarm, triggeredAt: new Date().toISOString(), acknowledged: false };
}

// ─── Recomandări ─────────────────────────────────────────────────────────────

export async function getRecommendations(patientId) {
  // TODO: înlocuiește cu fetch real la API
  // return fetch(`${API_URL}/recommendations?patientId=${patientId}`, { headers: authHeaders() })
  await simulateDelay();
  return mockRecommendations[patientId] || [];
}

export async function createRecommendation(recommendation) {
  // TODO: înlocuiește cu fetch real la API
  await simulateDelay();
  return {
    id: `rec-new-${Date.now()}`,
    ...recommendation,
    createdAt: new Date().toISOString(),
    read: false,
  };
}

export async function deleteRecommendation(recId) {
  // TODO: înlocuiește cu fetch real la API
  await simulateDelay();
  return { success: true };
}

export async function markRecommendationRead(recId) {
  // TODO: înlocuiește cu fetch real la API
  await simulateDelay();
  return { success: true };
}

// ─── Utilitar ────────────────────────────────────────────────────────────────

function authHeaders() {
  const token = localStorage.getItem('token');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

function simulateDelay(ms = 300) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
