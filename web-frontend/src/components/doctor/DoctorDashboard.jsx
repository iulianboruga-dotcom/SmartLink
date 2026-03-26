import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, CardActionArea, Typography, TextField, MenuItem,
  Chip, Avatar, InputAdornment, CircularProgress, Toolbar,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import PersonIcon from '@mui/icons-material/Person';
import { useNavigate } from 'react-router-dom';
import DoctorNavbar from './DoctorNavbar';
import { getPatients, getLatestSensorReading } from '../../api';
import { getPatientStatus } from '../../mockData';

const statusColor = { Normal: 'success', Atenție: 'warning', Critic: 'error' };

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [latestReadings, setLatestReadings] = useState({});
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const pats = await getPatients();
    setPatients(pats);
    // Încarcă ultima citire pentru fiecare pacient
    const readings = {};
    await Promise.all(
      pats.map(async (p) => {
        readings[p.id] = await getLatestSensorReading(p.id);
      })
    );
    setLatestReadings(readings);
    setLoading(false);
  };

  const filtered = patients
    .filter((p) => `${p.firstName} ${p.lastName}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name') return a.lastName.localeCompare(b.lastName);
      // Sortare după status: Critic > Atenție > Normal
      const order = { Critic: 0, Atenție: 1, Normal: 2 };
      return order[getPatientStatus(a.id)] - order[getPatientStatus(b.id)];
    });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      <DoctorNavbar />
      <Toolbar />
      <Box sx={{ p: 3, flex: 1 }}>
        <Typography variant="h5" gutterBottom>
          Pacienții mei
        </Typography>

        {/* Filtre */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Caută după nume..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 240 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
          />
          <TextField
            select
            size="small"
            label="Sortare"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="name">După nume</MenuItem>
            <MenuItem value="status">După status</MenuItem>
          </TextField>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={2}>
            {filtered.map((patient) => {
              const reading = latestReadings[patient.id];
              const status = getPatientStatus(patient.id);
              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={patient.id}>
                  <Card>
                    <CardActionArea onClick={() => navigate(`/doctor/patient/${patient.id}`)}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                          <Avatar sx={{ bgcolor: 'primary.light', mr: 1.5 }}>
                            <PersonIcon />
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle1">
                              {patient.firstName} {patient.lastName}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {patient.age} ani
                            </Typography>
                          </Box>
                          <Box sx={{ ml: 'auto' }}>
                            <Chip
                              label={status}
                              color={statusColor[status]}
                              size="small"
                              sx={{ fontWeight: 600 }}
                            />
                          </Box>
                        </Box>

                        {reading && (
                          <Box sx={{ display: 'flex', gap: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <FavoriteIcon fontSize="small" color="error" />
                              <Typography variant="body2" fontWeight={600}>
                                {reading.pulse} bpm
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <ThermostatIcon fontSize="small" color="warning" />
                              <Typography variant="body2" fontWeight={600}>
                                {reading.temperature}°C
                              </Typography>
                            </Box>
                          </Box>
                        )}
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>
    </Box>
  );
}
