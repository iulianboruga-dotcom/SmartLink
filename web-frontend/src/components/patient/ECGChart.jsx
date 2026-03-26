import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, CircularProgress } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { getECGData } from '../../api';

export default function ECGChart({ patientId }) {
  const [ecgData, setEcgData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (patientId) {
      getECGData(patientId).then((d) => { setEcgData(d); setLoading(false); });
    }
  }, [patientId]);

  return (
    <Card sx={{ bgcolor: '#0a0a0a', color: '#00ff41' }}>
      <CardContent>
        <Typography variant="h6" sx={{ color: '#00ff41', mb: 2, fontFamily: 'monospace' }}>
          ▶ ECG
        </Typography>
        {loading ? (
          <CircularProgress sx={{ color: '#00ff41' }} />
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={ecgData}>
              <XAxis dataKey="index" hide />
              <YAxis domain={[380, 720]} hide />
              <Tooltip
                contentStyle={{ backgroundColor: '#111', border: '1px solid #00ff41', color: '#00ff41' }}
                formatter={(v) => [`${v}`, 'ECG']}
              />
              <Line type="monotone" dataKey="value" stroke="#00ff41" dot={false} strokeWidth={1.5} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
        <Typography variant="caption" sx={{ color: '#00cc33', fontFamily: 'monospace' }}>
          Ritm sinusal normal
        </Typography>
      </CardContent>
    </Card>
  );
}
