import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, ToggleButton, ToggleButtonGroup,
  TextField, CircularProgress,
} from '@mui/material';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts';
import { getSensorHistory } from '../../api';

const sensorConfig = {
  pulse: { label: 'Puls', unit: 'bpm', color: '#e53935', min: 50, max: 120, domain: [30, 160] },
  temperature: { label: 'Temperatură', unit: '°C', color: '#fb8c00', min: 35.5, max: 38.0, domain: [34, 41] },
  humidity: { label: 'Umiditate', unit: '%', color: '#1976d2', min: 30, max: 70, domain: [0, 100] },
};

function formatTime(iso) {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export default function SensorHistoryCharts({ patientId }) {
  const [sensor, setSensor] = useState('pulse');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (patientId) loadData();
  }, [patientId, startDate, endDate]);

  const loadData = async () => {
    setLoading(true);
    const readings = await getSensorHistory(patientId, startDate || undefined, endDate || undefined);
    setData(readings);
    setLoading(false);
  };

  const cfg = sensorConfig[sensor];

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="h6">Istoric senzori</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <ToggleButtonGroup
              value={sensor}
              exclusive
              onChange={(_, v) => v && setSensor(v)}
              size="small"
            >
              <ToggleButton value="pulse">Puls</ToggleButton>
              <ToggleButton value="temperature">Temp.</ToggleButton>
              <ToggleButton value="humidity">Umiditate</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>

        {/* Selector interval */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <TextField
            label="De la"
            type="datetime-local"
            size="small"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Până la"
            type="datetime-local"
            size="small"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="recordedAt"
                tickFormatter={formatTime}
                tick={{ fontSize: 11 }}
                interval={Math.floor(data.length / 8)}
              />
              <YAxis domain={cfg.domain} tick={{ fontSize: 11 }} unit={` ${cfg.unit}`} width={60} />
              <Tooltip
                formatter={(v) => [`${v} ${cfg.unit}`, cfg.label]}
                labelFormatter={(l) => new Date(l).toLocaleString('ro-RO')}
              />
              <Legend />
              {/* Praguri de alarmă */}
              <ReferenceLine y={cfg.max} stroke={cfg.color} strokeDasharray="4 4" label={{ value: `Max: ${cfg.max}`, fill: cfg.color, fontSize: 11 }} />
              <ReferenceLine y={cfg.min} stroke={cfg.color} strokeDasharray="4 4" label={{ value: `Min: ${cfg.min}`, fill: cfg.color, fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey={sensor}
                stroke={cfg.color}
                dot={false}
                strokeWidth={2}
                name={cfg.label}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
