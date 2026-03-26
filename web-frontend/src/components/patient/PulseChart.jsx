import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, CircularProgress } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { getSensorHistory } from '../../api';

function formatTime(iso) {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export default function PulseChart({ patientId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (patientId) {
      getSensorHistory(patientId).then((d) => { setData(d); setLoading(false); });
    }
  }, [patientId]);

  if (loading) return <CircularProgress />;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Puls — ultimele 24h</Typography>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="recordedAt" tickFormatter={formatTime} tick={{ fontSize: 11 }} interval={Math.floor(data.length / 6)} />
            <YAxis domain={[30, 160]} tick={{ fontSize: 11 }} unit=" bpm" width={60} />
            <Tooltip formatter={(v) => [`${v} bpm`, 'Puls']} labelFormatter={(l) => new Date(l).toLocaleString('ro-RO')} />
            <ReferenceLine y={120} stroke="#e53935" strokeDasharray="4 4" label={{ value: 'Max 120', fill: '#e53935', fontSize: 11 }} />
            <ReferenceLine y={50} stroke="#e53935" strokeDasharray="4 4" label={{ value: 'Min 50', fill: '#e53935', fontSize: 11 }} />
            <Line type="monotone" dataKey="pulse" stroke="#e53935" dot={false} strokeWidth={2} name="Puls" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
