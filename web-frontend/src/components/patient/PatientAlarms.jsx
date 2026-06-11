import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, CircularProgress, Toolbar, TableSortLabel,
} from '@mui/material';
import PatientNavbar from './PatientNavbar';
import { getAlarms } from '../../api';

const alarmTypeLabel = {
  pulse_high: 'Puls ridicat', pulse_low: 'Puls scăzut',
  temp_high: 'Temperatură ridicată', temp_low: 'Temperatură scăzută',
  hum_high: 'Umiditate ridicată', hum_low: 'Umiditate scăzută',
};
const alarmUnit = {
  pulse_high: 'bpm', pulse_low: 'bpm',
  temp_high: '°C', temp_low: '°C',
  hum_high: '%', hum_low: '%',
};

export default function PatientAlarms() {
  const [alarms, setAlarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState('desc');

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const patientId = user.patientId;

  useEffect(() => {
    if (patientId) {
      getAlarms(patientId).then((data) => { setAlarms(data); setLoading(false); });
    }
  }, [patientId]);

  const sorted = [...alarms].sort((a, b) => {
    const diff = new Date(a.triggeredAt) - new Date(b.triggeredAt);
    return sortOrder === 'asc' ? diff : -diff;
  });

  const activeCount = alarms.filter((a) => !a.acknowledged).length;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      <PatientNavbar />
      <Toolbar />
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Typography variant="h5">Istoricul alarmelor mele</Typography>
          {activeCount > 0 && (
            <Chip label={`${activeCount} active`} color="error" size="small" />
          )}
        </Box>

        {loading ? (
          <CircularProgress />
        ) : (
          <Card>
            <CardContent>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <TableSortLabel
                          active
                          direction={sortOrder}
                          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        >
                          Data/Ora
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>Tip alarmă</TableCell>
                      <TableCell align="right">Valoare</TableCell>
                      <TableCell align="right">Prag</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sorted.map((alarm) => (
                      <TableRow key={alarm.id} hover>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          {new Date(alarm.triggeredAt).toLocaleString('ro-RO')}
                        </TableCell>
                        <TableCell>{alarmTypeLabel[alarm.type] || alarm.type}</TableCell>
                        <TableCell align="right">
                          {alarm.measuredValue} {alarmUnit[alarm.type]}
                        </TableCell>
                        <TableCell align="right">
                          {alarm.thresholdValue} {alarmUnit[alarm.type]}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={alarm.acknowledged ? 'Rezolvată' : 'Activă'}
                            color={alarm.acknowledged ? 'default' : 'error'}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {sorted.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ color: 'text.secondary', py: 3 }}>
                          Nicio alarmă
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}
      </Box>
    </Box>
  );
}
