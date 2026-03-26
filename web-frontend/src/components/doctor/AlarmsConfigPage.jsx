import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Toolbar, Grid, MenuItem, TextField, CircularProgress,
} from '@mui/material';
import DoctorNavbar from './DoctorNavbar';
import AlarmHistory from './AlarmHistory';
import AlarmThresholdForm from './AlarmThresholdForm';
import { getPatients } from '../../api';

export default function AlarmsConfigPage() {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPatients().then((list) => {
      setPatients(list);
      if (list.length > 0) setSelectedPatient(list[0].id);
      setLoading(false);
    });
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      <DoctorNavbar />
      <Toolbar />
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>Gestionare alarme</Typography>

        {loading ? (
          <CircularProgress />
        ) : (
          <>
            <TextField
              select
              label="Selectează pacient"
              value={selectedPatient}
              onChange={(e) => setSelectedPatient(e.target.value)}
              size="small"
              sx={{ mb: 3, minWidth: 240 }}
            >
              {patients.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.firstName} {p.lastName}
                </MenuItem>
              ))}
            </TextField>

            {selectedPatient && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <AlarmThresholdForm patientId={selectedPatient} />
                </Grid>
                <Grid item xs={12}>
                  <AlarmHistory patientId={selectedPatient} />
                </Grid>
              </Grid>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}
