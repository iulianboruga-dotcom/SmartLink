import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, CircularProgress } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { getECGData } from '../../api';

export default function ECGViewer({ patientId }) {
  const [ecgData, setEcgData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (patientId) loadECG();
  }, [patientId]);

  const loadECG = async () => {
    setLoading(true);
    const data = await getECGData(patientId);
    setEcgData(data);
    setLoading(false);
  };

  return (
    <Card sx={{ bgcolor: '#0a0a0a', color: '#00ff41' }}>
      <CardContent>
        <Typography variant="h6" sx={{ color: '#00ff41', mb: 2, fontFamily: 'monospace' }}>
          ▶ ECG Monitor
        </Typography>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress sx={{ color: '#00ff41' }} />
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={ecgData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <XAxis dataKey="index" hide />
              <YAxis domain={[380, 720]} hide />
              <Tooltip
                contentStyle={{ backgroundColor: '#111', border: '1px solid #00ff41', color: '#00ff41' }}
                formatter={(v) => [`${v}`, 'ECG']}
                labelFormatter={(l) => `Punct ${l}`}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#00ff41"
                dot={false}
                strokeWidth={1.5}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
        <Typography variant="caption" sx={{ color: '#00cc33', fontFamily: 'monospace' }}>
          100 puncte · Ritm sinusal normal
        </Typography>
      </CardContent>
    </Card>
  );
}
