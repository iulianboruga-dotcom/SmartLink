import React from 'react';
import { Navigate } from 'react-router-dom';

// Verifică autentificarea și rolul înainte de a permite accesul la o rută
export default function ProtectedRoute({ children, requiredRole }) {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (!token || !userStr) {
    return <Navigate to="/" replace />;
  }

  const user = JSON.parse(userStr);

  if (requiredRole && user.role !== requiredRole) {
    // Redirecționează la dashboard-ul corect
    if (user.role === 'doctor') return <Navigate to="/doctor" replace />;
    if (user.role === 'patient') return <Navigate to="/patient" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
}
