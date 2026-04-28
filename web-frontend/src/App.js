import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import theme from "./theme";
import ProtectedRoute from "./components/ProtectedRoute";

// Pagini
import LoginPage from "./components/LoginPage";

// Medic
import DoctorDashboard from "./components/doctor/DoctorDashboard";
import PatientFile from "./components/doctor/PatientFile";
import AlarmsConfigPage from "./components/doctor/AlarmsConfigPage";

// Pacient
import PatientDashboard from "./components/patient/PatientDashboard";
import PatientRecommendations from "./components/patient/PatientRecommendations";
import PatientAlarms from "./components/patient/PatientAlarms";
import PatientProfile from "./components/patient/PatientProfile";

//Pagina cu Pacienti
import PatientsPage from "./components/doctor/PatientsPage";

//Pagina Alerte

import AlarmsPage from "./components/doctor/AlarmsPage";

//Formular pentru adaugat pacienti

import AddPatientForm from "./components/doctor/AddPatientForm";

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LoginPage />} />

          {/* Medic */}
          <Route
            path="/doctor"
            element={
              <ProtectedRoute requiredRole="doctor">
                <DoctorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/patient/:id"
            element={
              <ProtectedRoute requiredRole="doctor">
                <PatientFile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/alarms"
            element={
              <ProtectedRoute requiredRole="doctor">
                <AlarmsConfigPage />
              </ProtectedRoute>
            }
          />

          {/* Pacient */}
          <Route
            path="/patient"
            element={
              <ProtectedRoute requiredRole="patient">
                <PatientDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/recommendations"
            element={
              <ProtectedRoute requiredRole="patient">
                <PatientRecommendations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/alarms"
            element={
              <ProtectedRoute requiredRole="patient">
                <PatientAlarms />
              </ProtectedRoute>
            }
          />

          <Route
            path="/doctor/patients"
            element={
              <ProtectedRoute requiredRole="doctor">
                <PatientsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/alarms-list"
            element={
              <ProtectedRoute requiredRole="doctor">
                <AlarmsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/patient/profile"
            element={
              <ProtectedRoute requiredRole="patient">
                <PatientProfile />
              </ProtectedRoute>
            }
          />
          <Route path="/add-patient" element={<AddPatientForm />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
