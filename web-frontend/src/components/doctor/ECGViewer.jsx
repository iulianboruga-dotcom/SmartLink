import React, { useEffect, useState, useRef } from 'react';
import { Box, Card, CardContent, Typography, CircularProgress, IconButton } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { getECGData } from '../../api';

export default function ECGViewer({ patientId }) {
  const [allData,      setAllData]      = useState([]);
  const [visibleCount, setVisibleCount] = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [playing,      setPlaying]      = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (patientId) loadECG();
  }, [patientId]);

  const loadECG = async () => {
    setLoading(true);
    const data = await getECGData(patientId);
    setAllData(data);
    setVisibleCount(data.length); // static complet la încărcare
    setLoading(false);
  };

  // Buclă animație
  useEffect(() => {
    clearInterval(timerRef.current);
    if (!playing) return;
    timerRef.current = setInterval(() => {
      setVisibleCount((c) => {
        if (c >= allData.length) return 0; // loop continuu
        return c + 5;
      });
    }, 40); // 40ms × 5 pts ≈ 125 pts/s
    return () => clearInterval(timerRef.current);
  }, [playing, allData.length]);

  const visibleData = allData.slice(0, visibleCount);
  const lastPt = visibleData[visibleData.length - 1];

  const togglePlay = () => {
    if (!playing && visibleCount >= allData.length) setVisibleCount(0);
    setPlaying((p) => !p);
  };

  return (
    <Card sx={{ bgcolor: '#0a0a0a', color: '#00ff41' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ color: '#00ff41', fontFamily: 'monospace' }}>
            ECG Monitor
          </Typography>
          <IconButton
            onClick={togglePlay}
            disabled={loading || allData.length === 0}
            sx={{
              color: playing ? '#ffcc00' : '#00ff41',
              border: `1px solid ${playing ? '#ffcc00' : '#00ff41'}`,
              borderRadius: '4px',
              px: 1.5, py: 0.5,
              fontSize: '14px',
              fontFamily: 'monospace',
            }}
          >
            {playing ? '⏸ Pauză' : '▶ Play'}
          </IconButton>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress sx={{ color: '#00ff41' }} />
          </Box>
        ) : allData.length === 0 ? (
          <Typography sx={{ color: '#444', fontFamily: 'monospace', py: 4, textAlign: 'center' }}>
            Nu există date ECG pentru acest pacient.
          </Typography>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={visibleData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <XAxis dataKey="index" type="number" domain={[0, allData.length]} hide />
              <YAxis domain={[380, 720]} hide />
              <Tooltip
                contentStyle={{ backgroundColor: '#111', border: '1px solid #00ff41', color: '#00ff41' }}
                formatter={(v) => [`${v}`, 'ECG ADC']}
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
          {playing
            ? `▶ ${visibleCount}/${allData.length} pts · ECG: ${lastPt?.value ?? '--'}`
            : `${allData.length} puncte · Ritm sinusal normal`}
        </Typography>
      </CardContent>
    </Card>
  );
}
