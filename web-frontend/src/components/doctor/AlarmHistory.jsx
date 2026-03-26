import React, { useState, useEffect } from 'react';
import {
  Card, CardContent, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, MenuItem, TextField, Box, CircularProgress, TableSortLabel,
} from '@mui/material';
import { getAlarms } from '../../api';

const alarmTypeLabel = {
  PULSE_HIGH: 'Puls ridicat',
  PULSE_LOW: 'Puls scăzut',
  TEMP_HIGH: 'Temperatură ridicată',
  TEMP_LOW: 'Temperatură scăzută',
  HUM_HIGH: 'Umiditate ridicată',
  HUM_LOW: 'Umiditate scăzută',
};

const alarmUnit = {
  PULSE_HIGH: 'bpm', PULSE_LOW: 'bpm',
  TEMP_HIGH: '°C', TEMP_LOW: '°C',
  HUM_HIGH: '%', HUM_LOW: '%',
};

export default function AlarmHistory({ patientId }) {
  const [alarms, setAlarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    if (patientId) loadAlarms();
  }, [patientId]);

  const loadAlarms = async () => {
    setLoading(true);
    const data = await getAlarms(patientId);
    setAlarms(data);
    setLoading(false);
  };

  const filtered = alarms
    .filter((a) => filterType === 'ALL' || a.type === filterType)
    .sort((a, b) => {
      const diff = new Date(a.triggeredAt) - new Date(b.triggeredAt);
      return sortOrder === 'asc' ? diff : -diff;
    });

  const alarmTypes = [...new Set(alarms.map((a) => a.type))];

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="h6">Istoric alarme</Typography>
          <TextField
            select
            size="small"
            label="Tip alarmă"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="ALL">Toate</MenuItem>
            {alarmTypes.map((t) => (
              <MenuItem key={t} value={t}>{alarmTypeLabel[t] || t}</MenuItem>
            ))}
          </TextField>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
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
                {filtered.map((alarm) => (
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
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ color: 'text.secondary', py: 3 }}>
                      Nicio alarmă
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
}
