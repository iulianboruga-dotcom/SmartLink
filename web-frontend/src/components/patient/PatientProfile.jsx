import React from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Divider, Toolbar, Avatar, Chip,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import DevicesIcon from '@mui/icons-material/Devices';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import PatientNavbar from './PatientNavbar';

export default function PatientProfile() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fields = [
    { label: 'Prenume', value: user.firstName },
    { label: 'Nume', value: user.lastName },
    { label: 'Email', value: user.email },
    { label: 'Vârstă', value: `${user.age} ani` },
    { label: 'Greutate', value: `${user.weight} kg` },
    { label: 'Înălțime', value: `${user.height} cm` },
    { label: 'Grupă sanguină', value: user.bloodType },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      <PatientNavbar />
      <Toolbar />
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>Profilul meu</Typography>

        <Grid container spacing={3}>
          {/* Date personale */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.main' }}><PersonIcon /></Avatar>
                  <Typography variant="h6">Date personale</Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                {fields.map((f) => (
                  <Box key={f.label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75 }}>
                    <Typography variant="body2" color="text.secondary">{f.label}</Typography>
                    <Typography variant="body2" fontWeight={500}>{f.value || '—'}</Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>

          {/* Medic asociat */}
          <Grid item xs={12} md={6}>
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'secondary.main' }}><MedicalServicesIcon /></Avatar>
                  <Typography variant="h6">Medic asociat</Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75 }}>
                  <Typography variant="body2" color="text.secondary">Medic</Typography>
                  <Typography variant="body2" fontWeight={500}>Dr. Alexandru Ionescu</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75 }}>
                  <Typography variant="body2" color="text.secondary">Specializare</Typography>
                  <Typography variant="body2" fontWeight={500}>Cardiologie</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75 }}>
                  <Typography variant="body2" color="text.secondary">Clinică</Typography>
                  <Typography variant="body2" fontWeight={500}>Spitalul Clinic UPT</Typography>
                </Box>
              </CardContent>
            </Card>

            {/* Dispozitiv */}
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <Avatar sx={{ bgcolor: '#7b1fa2' }}><DevicesIcon /></Avatar>
                  <Typography variant="h6">Dispozitiv wearable</Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75 }}>
                  <Typography variant="body2" color="text.secondary">ID Dispozitiv</Typography>
                  <Typography variant="body2" fontWeight={500} fontFamily="monospace">
                    {user.deviceId || 'Nedefinit'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75 }}>
                  <Typography variant="body2" color="text.secondary">Status</Typography>
                  <Chip label="Conectat" color="success" size="small" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
