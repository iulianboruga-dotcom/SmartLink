import React, { useState } from 'react';
import {
  Box, Card, CardContent, TextField, Button, Typography,
  ToggleButton, ToggleButtonGroup, Alert, CircularProgress, MenuItem,
} from '@mui/material';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import PersonIcon from '@mui/icons-material/Person';
import { useNavigate, Link } from 'react-router-dom';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState('doctor');
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    specialization: '',
    clinicName: '',
    age: '',
    weight: '',
    height: '',
    bloodType: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
  };

  const validate = () => {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(form.email)) return 'Adresă email invalidă.';
    if (form.password.length < 6) return 'Parola trebuie să aibă cel puțin 6 caractere.';
    if (form.password !== form.confirmPassword) return 'Parolele nu coincid.';
    if (!form.firstName || !form.lastName) return 'Prenumele și numele sunt obligatorii.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const endpoint = role === 'doctor'
        ? `${API_URL}/doctors/register`
        : `${API_URL}/patients/register`;

      const body = role === 'doctor'
        ? {
            email: form.email,
            password: form.password,
            firstName: form.firstName,
            lastName: form.lastName,
            specialization: form.specialization,
            clinicName: form.clinicName,
          }
        : {
            email: form.email,
            password: form.password,
            firstName: form.firstName,
            lastName: form.lastName,
            age: Number(form.age),
            weight: parseFloat(form.weight),
            height: parseFloat(form.height),
            bloodType: form.bloodType,
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Eroare la înregistrare.');

      navigate('/', { state: { message: 'Cont creat. Te poți autentifica.' } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 40%, #42a5f5 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 480, borderRadius: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <LocalHospitalIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
            <Typography variant="h4" fontWeight={700} color="primary.main">
              SmartLink
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Creare cont nou
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
            <ToggleButtonGroup
              value={role}
              exclusive
              onChange={(_, v) => v && setRole(v)}
              size="small"
            >
              <ToggleButton value="doctor" sx={{ px: 3, gap: 0.5 }}>
                <MedicalServicesIcon fontSize="small" />
                Sunt medic
              </ToggleButton>
              <ToggleButton value="patient" sx={{ px: 3, gap: 0.5 }}>
                <PersonIcon fontSize="small" />
                Sunt pacient
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Box component="form" onSubmit={handleSubmit}>
            <TextField fullWidth label="Prenume" value={form.firstName}
              onChange={handleChange('firstName')} required sx={{ mb: 2 }} />
            <TextField fullWidth label="Nume" value={form.lastName}
              onChange={handleChange('lastName')} required sx={{ mb: 2 }} />
            <TextField fullWidth label="Email" type="email" value={form.email}
              onChange={handleChange('email')} required sx={{ mb: 2 }} autoComplete="email" />
            <TextField fullWidth label="Parolă" type="password" value={form.password}
              onChange={handleChange('password')} required sx={{ mb: 2 }} autoComplete="new-password" />
            <TextField fullWidth label="Confirmă parola" type="password" value={form.confirmPassword}
              onChange={handleChange('confirmPassword')} required sx={{ mb: 2 }} autoComplete="new-password" />

            {role === 'doctor' && (
              <>
                <TextField fullWidth label="Specializare" value={form.specialization}
                  onChange={handleChange('specialization')} sx={{ mb: 2 }} />
                <TextField fullWidth label="Nume clinică" value={form.clinicName}
                  onChange={handleChange('clinicName')} sx={{ mb: 2 }} />
              </>
            )}

            {role === 'patient' && (
              <>
                <TextField fullWidth label="Vârstă" type="number" value={form.age}
                  onChange={handleChange('age')} sx={{ mb: 2 }} inputProps={{ min: 0 }} />
                <TextField fullWidth label="Greutate (kg)" type="number" value={form.weight}
                  onChange={handleChange('weight')} sx={{ mb: 2 }} inputProps={{ step: '0.1', min: 0 }} />
                <TextField fullWidth label="Înălțime (cm)" type="number" value={form.height}
                  onChange={handleChange('height')} sx={{ mb: 2 }} inputProps={{ step: '0.1', min: 0 }} />
                <TextField fullWidth select label="Grupă sanguină" value={form.bloodType}
                  onChange={handleChange('bloodType')} sx={{ mb: 2 }}>
                  {BLOOD_TYPES.map((bt) => (
                    <MenuItem key={bt} value={bt}>{bt}</MenuItem>
                  ))}
                </TextField>
              </>
            )}

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Button type="submit" variant="contained" fullWidth size="large"
              disabled={loading} sx={{ mb: 2 }}>
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Creează cont'}
            </Button>
          </Box>

          <Typography variant="body2" textAlign="center" color="text.secondary">
            Am deja cont?{' '}
            <Link to="/" style={{ color: 'inherit', fontWeight: 600 }}>
              Autentifică-te
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
