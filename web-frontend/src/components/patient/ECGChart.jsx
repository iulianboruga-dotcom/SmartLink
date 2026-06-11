import React, { useState, useEffect, useRef } from 'react';
import { Box, Card, CardContent, Typography, CircularProgress, IconButton } from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { getECGData, getECGList } from '../../api';

function formatDate(iso) {
  return new Date(iso).toLocaleString('ro-RO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const BTN = {
  color: '#00ff41',
  border: '1px solid #00ff41',
  borderRadius: '4px',
  px: 1.5, py: 0.5,
  fontSize: '14px',
  fontFamily: 'monospace',
};

export default function ECGChart({ patientId }) {
  const [recordings, setRecordings]     = useState([]);   // [{id, recordedAt}, ...]
  const [recIndex, setRecIndex]         = useState(0);    // 0 = cea mai recentă
  const [allData, setAllData]           = useState([]);
  const [visibleCount, setVisibleCount] = useState(0);
  const [loading, setLoading]           = useState(true);
  const [playing, setPlaying]           = useState(false);
  const timerRef = useRef(null);

  // Încarcă lista de înregistrări la mount
  useEffect(() => {
    if (!patientId) return;
    getECGList(patientId).then((list) => {
      setRecordings(list);
      setRecIndex(0);
    });
  }, [patientId]);

  // Când se schimbă înregistrarea selectată, încarcă datele ei
  useEffect(() => {
    if (!patientId || recordings.length === 0) return;
    setPlaying(false);
    setLoading(true);
    const rec = recordings[recIndex];
    getECGData(patientId, rec.id).then((d) => {
      setAllData(d);
      setVisibleCount(d.length);
      setLoading(false);
    });
  }, [patientId, recIndex, recordings]);

  // Animație Play
  useEffect(() => {
    clearInterval(timerRef.current);
    if (!playing) return;
    timerRef.current = setInterval(() => {
      setVisibleCount((c) => (c >= allData.length ? 0 : c + 5));
    }, 40);
    return () => clearInterval(timerRef.current);
  }, [playing, allData.length]);

  const visibleData = allData.slice(0, visibleCount);
  const lastPt = visibleData[visibleData.length - 1];

  const togglePlay = () => {
    if (!playing && visibleCount >= allData.length) setVisibleCount(0);
    setPlaying((p) => !p);
  };

  const goBack = () => { setRecIndex((i) => Math.min(i + 1, recordings.length - 1)); };
  const goFwd  = () => { setRecIndex((i) => Math.max(i - 1, 0)); };

  const currentRec = recordings[recIndex];

  return (
    <Card sx={{ bgcolor: '#0a0a0a', color: '#00ff41' }}>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="h6" sx={{ color: '#00ff41', fontFamily: 'monospace' }}>
            ECG
          </Typography>

          {/* Navigator înregistrări */}
          {recordings.length > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <IconButton onClick={goBack} disabled={recIndex >= recordings.length - 1} size="small"
                sx={{ color: recIndex >= recordings.length - 1 ? '#333' : '#00ff41', p: 0.5 }}>
                <ArrowBackIosNewIcon fontSize="small" />
              </IconButton>
              <Typography variant="caption" sx={{ color: '#00cc33', fontFamily: 'monospace', minWidth: 160, textAlign: 'center' }}>
                {recIndex + 1}/{recordings.length} · {currentRec ? formatDate(currentRec.recordedAt) : ''}
              </Typography>
              <IconButton onClick={goFwd} disabled={recIndex <= 0} size="small"
                sx={{ color: recIndex <= 0 ? '#333' : '#00ff41', p: 0.5 }}>
                <ArrowForwardIosIcon fontSize="small" />
              </IconButton>
            </Box>
          )}

          <IconButton onClick={togglePlay} disabled={loading || allData.length === 0}
            sx={{ ...BTN, color: playing ? '#ffcc00' : '#00ff41', border: `1px solid ${playing ? '#ffcc00' : '#00ff41'}` }}>
            {playing ? '⏸ Pauză' : '▶ Play'}
          </IconButton>
        </Box>

        {/* Grafic */}
        {loading ? (
          <CircularProgress sx={{ color: '#00ff41' }} />
        ) : allData.length === 0 ? (
          <Typography sx={{ color: '#444', fontFamily: 'monospace', py: 3, textAlign: 'center' }}>
            Nu există date ECG.
          </Typography>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={visibleData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <XAxis dataKey="index" type="number" domain={[0, allData.length]} hide />
              <YAxis domain={['auto', 'auto']} hide />
              <Tooltip
                contentStyle={{ backgroundColor: '#111', border: '1px solid #00ff41', color: '#00ff41' }}
                formatter={(v) => [`${v}`, 'ECG ADC']}
                labelFormatter={(l) => `Punct ${l}`}
              />
              <Line type="monotone" dataKey="value" stroke="#00ff41" dot={false} strokeWidth={1.5} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        )}

        <Typography variant="caption" sx={{ color: '#00cc33', fontFamily: 'monospace' }}>
          {playing
            ? `▶ ${visibleCount}/${allData.length} pts · ECG: ${lastPt?.value ?? '--'}`
            : `Ritm sinusal normal · ${allData.length} puncte`}
        </Typography>
      </CardContent>
    </Card>
  );
}
