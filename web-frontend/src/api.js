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
} from "./mockData";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8080/api";

function toCamelCase(s) {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function snakeToCamel(obj) {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(snakeToCamel);
  if (typeof obj !== "object") return obj;
  if (obj instanceof Date) return obj;
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [toCamelCase(k), snakeToCamel(v)]),
  );
}

// Autentificare

export async function login(email, password) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Eroare server (${res.status})`);
  }

  return snakeToCamel(await res.json());
}

export async function logout() {
  // TODO: înlocuiește cu fetch real la API
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

// ─── Pacienți ────────────────────────────────────────────────────────────────

export async function getPatients() {
  // LEGACY: // return fetch(`${API_URL}/patients`, { headers: authHeaders() })
  const res = await fetch(`${API_URL}/patients`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Eroare ${res.status}`);
  return snakeToCamel(await res.json());
}

export async function getPatientById(patientId) {
  // LEGACY: // return fetch(`${API_URL}/patients/${patientId}`, { headers: authHeaders() })
  const res = await fetch(`${API_URL}/patients/${patientId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Eroare ${res.status}`);
  return snakeToCamel(await res.json());
}

export async function updatePatient(patientId, data) {
  // TODO: înlocuiește cu fetch real la API
  await simulateDelay();
  return { ...mockPatients.find((p) => p.id === patientId), ...data };
}

// ─── Date senzori ────────────────────────────────────────────────────────────

export async function getSensorHistory(patientId, startDate, endDate) {
  // LEGACY: // return fetch(`${API_URL}/sensors?patientId=...` (path greșit — backend folosește /sensors/history)
  const params = new URLSearchParams({ patientId });
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  const res = await fetch(`${API_URL}/sensors/history?${params}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Eroare ${res.status}`);
  return snakeToCamel(await res.json());
}

export async function getLatestSensorReading(patientId) {
  // TODO: înlocuiește cu fetch real la API
  await simulateDelay(100);
  const data = mockSensorData[patientId] || [];
  return data[data.length - 1] || null;
}

export async function getECGData(patientId) {
  const res = await fetch(`${API_URL}/sensors/ecg?patientId=${patientId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) return [];
  return snakeToCamel(await res.json());
}

// ─── Alarme ──────────────────────────────────────────────────────────────────

export async function getAlarms(patientId) {
  // LEGACY: // return fetch(`${API_URL}/alarms?patientId=...` (path greșit — backend folosește /alarms/history)
  const res = await fetch(`${API_URL}/alarms/history?patientId=${patientId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Eroare ${res.status}`);
  return snakeToCamel(await res.json());
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
  // LEGACY: // return fetch(`${API_URL}/alarms/thresholds/${patientId}`, { headers: authHeaders() })
  const res = await fetch(`${API_URL}/alarms/thresholds/${patientId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Eroare ${res.status}`);
  return snakeToCamel(await res.json());
}

export async function updateThresholds(patientId, thresholds) {
  // LEGACY: // return fetch(`${API_URL}/alarms/thresholds/${patientId}`, { method: 'PUT', ... })
  const res = await fetch(`${API_URL}/alarms/thresholds/${patientId}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(thresholds),
  });
  if (!res.ok) throw new Error(`Eroare ${res.status}`);
  return snakeToCamel(await res.json());
}

export async function postAlarm(alarm) {
  // TODO: înlocuiește cu fetch real la API
  await simulateDelay();
  return {
    id: `al-new-${Date.now()}`,
    ...alarm,
    triggeredAt: new Date().toISOString(),
    acknowledged: false,
  };
}

// ─── Recomandări ─────────────────────────────────────────────────────────────

export async function getRecommendations(patientId) {
  // LEGACY: // return fetch(`${API_URL}/recommendations?patientId=...` (path greșit — backend folosește /:patientId)
  const res = await fetch(`${API_URL}/recommendations/${patientId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Eroare ${res.status}`);
  return snakeToCamel(await res.json());
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
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function simulateDelay(ms = 300) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
