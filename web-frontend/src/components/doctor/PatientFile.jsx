import React, { useState, useEffect } from 'react';
import {
  Box, Typography, CircularProgress, Grid, Card, CardContent, Toolbar,
  Tabs, Tab, Chip, Avatar, Divider,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import { useParams, useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import IconButton from '@mui/material/IconButton';
import DoctorNavbar from './DoctorNavbar';
import SensorHistoryCharts from './SensorHistoryCharts';
import ECGViewer from './ECGViewer';
import AlarmThresholdForm from './AlarmThresholdForm';
import AlarmHistory from './AlarmHistory';
import RecommendationsManager from './RecommendationsManager';
import { getPatientById, getLatestSensorReading } from '../../api';
import { getPatientStatus } from '../../mockData';

const statusColor = { Normal: 'success', Atenție: 'warning', Critic: 'error' };

export default function PatientFile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [reading, setReading] = useState(null);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatient();
  }, [id]);

  const loadPatient = async () => {
    setLoading(true);
    const p = await getPatientById(id);
    const r = await getLatestSensorReading(id);
    setPatient(p);
    setReading(r);
    setLoading(false);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!patient) return <Typography sx={{ mt: 10, textAlign: 'center' }}>Pacient negăsit</Typography>;

  const status = getPatientStatus(id);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      <DoctorNavbar />
      <Toolbar />
      <Box sx={{ p: 3 }}>
        {/* Header pacient */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1 }}>
          <IconButton onClick={() => navigate('/doctor')} size="small">
            <ArrowBackIcon />
          </IconButton>
          <Avatar sx={{ bgcolor: 'primary.main', mr: 1 }}>
            <PersonIcon />
          </Avatar>
          <Box>
            <Typography variant="h5">
              {patient.firstName} {patient.lastName}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {patient.age} ani · {patient.bloodType} · {patient.weight} kg · {patient.height} cm
              </Typography>
              <Chip label={status} color={statusColor[status]} size="small" />
            </Box>
          </Box>
        </Box>

        {/* Citiri curente */}
        {reading && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              { label: 'Puls', value: `${reading.pulse} bpm`, color: '#e53935' },
              { label: 'Temperatură', value: `${reading.temperature}°C`, color: '#fb8c00' },
              { label: 'Umiditate', value: `${reading.humidity}%`, color: '#1976d2' },
            ].map((item) => (
              <Grid item xs={6} sm={4} md={2} key={item.label}>
                <Card>
                  <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                    <Typography variant="h6" sx={{ color: item.color, fontWeight: 700 }}>
                      {item.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Tabs */}
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label="Grafice senzori" />
          <Tab label="ECG" />
          <Tab label="Alarme" />
          <Tab label="Praguri" />
          <Tab label="Recomandări" />
        </Tabs>

        <Divider sx={{ mb: 2 }} />

        {tab === 0 && <SensorHistoryCharts patientId={id} />}
        {tab === 1 && <ECGViewer patientId={id} />}
        {tab === 2 && <AlarmHistory patientId={id} />}
        {tab === 3 && <AlarmThresholdForm patientId={id} />}
        {tab === 4 && <RecommendationsManager patientId={id} />}
      </Box>
    </Box>
  );
}
