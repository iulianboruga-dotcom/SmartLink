import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Chip, CircularProgress, Toolbar,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import PatientNavbar from './PatientNavbar';
import PulseChart from './PulseChart';
import TemperatureChart from './TemperatureChart';
import HumidityChart from './HumidityChart';
import ECGChart from './ECGChart';
import { getLatestSensorReading } from '../../api';
import { getPatientStatus } from '../../mockData';

const statusColor = { Normal: 'success', Atenție: 'warning', Critic: 'error' };

export default function PatientDashboard() {
  const [reading, setReading] = useState(null);
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const patientId = user.id;

  useEffect(() => {
    if (patientId) {
      getLatestSensorReading(patientId).then((r) => {
        setReading(r);
        setLoading(false);
      });
    }
  }, [patientId]);

  const status = getPatientStatus(patientId);

  const metricCards = reading
    ? [
        { label: 'Puls', value: `${reading.pulse}`, unit: 'bpm', icon: <FavoriteIcon fontSize="large" />, color: '#e53935', bg: '#fff5f5' },
        { label: 'Temperatură', value: `${reading.temperature}`, unit: '°C', icon: <ThermostatIcon fontSize="large" />, color: '#fb8c00', bg: '#fff8e1' },
        { label: 'Umiditate', value: `${reading.humidity}`, unit: '%', icon: <WaterDropIcon fontSize="large" />, color: '#1976d2', bg: '#e3f2fd' },
        { label: 'ECG', value: 'Normal', unit: '', icon: <MonitorHeartIcon fontSize="large" />, color: '#43a047', bg: '#f1f8e9' },
      ]
    : [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      <PatientNavbar />
      <Toolbar />
      <Box sx={{ p: 3, flex: 1 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Box>
            <Typography variant="h5">
              Bună, {user.firstName}!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Monitorizare în timp real
            </Typography>
          </Box>
          <Chip
            label={`Status: ${status}`}
            color={statusColor[status]}
            sx={{ ml: 'auto', fontWeight: 600 }}
          />
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Card-uri valori curente */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {metricCards.map((card) => (
                <Grid item xs={6} sm={3} key={card.label}>
                  <Card sx={{ bgcolor: card.bg, border: `1px solid ${card.color}20` }}>
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <Box sx={{ color: card.color, mb: 0.5 }}>{card.icon}</Box>
                      <Typography variant="h4" fontWeight={700} sx={{ color: card.color }}>
                        {card.value}
                        <Typography component="span" variant="body1" fontWeight={400} color="text.secondary">
                          {' '}{card.unit}
                        </Typography>
                      </Typography>
                      <Typography variant="body2" color="text.secondary">{card.label}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* Grafice */}
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <PulseChart patientId={patientId} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TemperatureChart patientId={patientId} />
              </Grid>
              <Grid item xs={12} md={6}>
                <HumidityChart patientId={patientId} />
              </Grid>
              <Grid item xs={12} md={6}>
                <ECGChart patientId={patientId} />
              </Grid>
            </Grid>
          </>
        )}
      </Box>
    </Box>
  );
}
