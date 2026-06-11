import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, CircularProgress } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Brush } from 'recharts';
import { getSensorHistory } from '../../api';

function formatTime(iso) {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

const WINDOW = 60;

export default function HumidityChart({ patientId }) {
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
        <Typography variant="h6" gutterBottom>
          Umiditate — istoric complet ({data.length} înregistrări)
        </Typography>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="recordedAt" tickFormatter={formatTime} tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" width={45} />
            <Tooltip formatter={(v) => [`${v}%`, 'Umiditate']} labelFormatter={(l) => new Date(l).toLocaleString('ro-RO')} />
            <ReferenceLine y={70} stroke="#1976d2" strokeDasharray="4 4" label={{ value: 'Max 70%', fill: '#1976d2', fontSize: 11 }} />
            <ReferenceLine y={30} stroke="#1976d2" strokeDasharray="4 4" label={{ value: 'Min 30%', fill: '#1976d2', fontSize: 11 }} />
            <Line type="monotone" dataKey="humidity" stroke="#1976d2" dot={false} strokeWidth={2} name="Umiditate" />
            <Brush dataKey="recordedAt" height={24} stroke="#1976d2" tickFormatter={formatTime} startIndex={Math.max(0, data.length - WINDOW)} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
