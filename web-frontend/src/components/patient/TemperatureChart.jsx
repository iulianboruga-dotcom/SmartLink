import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, CircularProgress } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Brush } from 'recharts';
import { getSensorHistory } from '../../api';

function formatTime(iso) {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function formatLabel(iso) {
  return new Date(iso).toLocaleString('ro-RO');
}

const WINDOW = 60;

export default function TemperatureChart({ patientId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (patientId) {
      getSensorHistory(patientId).then((d) => { setData(d); setLoading(false); });
    }
  }, [patientId]);

  if (loading) return <CircularProgress />;

  const startIndex = Math.max(0, data.length - WINDOW);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Temperatură — istoric complet ({data.length} înregistrări)
        </Typography>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="recordedAt" tickFormatter={formatTime} tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis domain={[34, 41]} tick={{ fontSize: 11 }} unit="°C" width={55} />
            <Tooltip formatter={(v) => [`${v}°C`, 'Temperatură']} labelFormatter={formatLabel} />
            <ReferenceLine y={38.0} stroke="#fb8c00" strokeDasharray="4 4" label={{ value: 'Max 38°C', fill: '#fb8c00', fontSize: 11 }} />
            <ReferenceLine y={35.5} stroke="#fb8c00" strokeDasharray="4 4" label={{ value: 'Min 35.5°C', fill: '#fb8c00', fontSize: 11 }} />
            <Line type="monotone" dataKey="temperature" stroke="#fb8c00" dot={false} strokeWidth={2} name="Temperatură" />
            <Brush dataKey="recordedAt" height={24} stroke="#fb8c00" tickFormatter={formatTime} startIndex={startIndex} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
