import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Box, Card, CardContent, Typography, CircularProgress, IconButton, Tooltip as MuiTooltip } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';
import { getECGData } from '../../api';

const SAMPLE_RATE   = 100;   // Hz — potrivit pentru v3 firmware
const DEFAULT_WIN   = 300;   // ~3s vizibil implicit
const MIN_WIN       = 50;    // zoom in maxim (~0.5s)
const SCROLL_STEP   = 0.25;  // scroll cu 25% din fereastră la click ◀▶
const PLAY_STEP     = 5;     // puncte avansate per tick animație
const PLAY_TICK_MS  = 40;    // 40ms × 5pts ≈ 125pts/s (≈ viteză reală)

const btnSx = (active, disabled) => ({
  color: disabled ? '#333' : (active ? '#ffcc00' : '#00ff41'),
  border: `1px solid ${disabled ? '#222' : (active ? '#ffcc00' : '#00ff41')}`,
  borderRadius: '4px',
  px: 1, py: 0.3,
  fontSize: '13px',
  fontFamily: 'monospace',
  minWidth: 0,
  mx: 0.3,
});

export default function ECGViewer({ patientId }) {
  const [allData,     setAllData]     = useState([]);
  const [winStart,    setWinStart]    = useState(0);
  const [winSize,     setWinSize]     = useState(DEFAULT_WIN);
  const [playing,     setPlaying]     = useState(false);
  const [yDomain,     setYDomain]     = useState([0, 4096]);
  const [loading,     setLoading]     = useState(true);
  const timerRef = useRef(null);

  useEffect(() => { if (patientId) loadECG(); }, [patientId]);

  const loadECG = async () => {
    setLoading(true);
    const data = await getECGData(patientId);
    if (data.length > 0) {
      const vals = data.map(d => d.value);
      const mn = Math.min(...vals);
      const mx = Math.max(...vals);
      const pad = Math.round((mx - mn) * 0.08);
      setYDomain([mn - pad, mx + pad]);
      setWinSize(Math.min(DEFAULT_WIN, data.length));
      setWinStart(0);
    }
    setAllData(data);
    setLoading(false);
  };

  // Animație Play — avansează fereastra
  useEffect(() => {
    clearInterval(timerRef.current);
    if (!playing) return;
    timerRef.current = setInterval(() => {
      setWinStart(s => {
        const next = s + PLAY_STEP;
        if (next + winSize >= allData.length) {
          setPlaying(false);
          return allData.length - winSize;
        }
        return next;
      });
    }, PLAY_TICK_MS);
    return () => clearInterval(timerRef.current);
  }, [playing, winSize, allData.length]);

  const clampStart = useCallback((s) =>
    Math.max(0, Math.min(s, allData.length - winSize)), [allData.length, winSize]);

  const scrollLeft  = () => { setPlaying(false); setWinStart(s => clampStart(s - Math.round(winSize * SCROLL_STEP))); };
  const scrollRight = () => { setPlaying(false); setWinStart(s => clampStart(s + Math.round(winSize * SCROLL_STEP))); };

  const zoomIn  = () => {
    const nw = Math.max(MIN_WIN, Math.round(winSize / 1.5));
    const center = winStart + winSize / 2;
    setWinSize(nw);
    setWinStart(clampStart(Math.round(center - nw / 2)));
  };
  const zoomOut = () => {
    const nw = Math.min(allData.length, Math.round(winSize * 1.5));
    const center = winStart + winSize / 2;
    setWinSize(nw);
    setWinStart(clampStart(Math.round(center - nw / 2)));
  };

  const togglePlay = () => {
    if (!playing && winStart + winSize >= allData.length) setWinStart(0);
    setPlaying(p => !p);
  };

  // Scroll cu rotița mouse-ului pe grafic
  const onWheel = (e) => {
    e.preventDefault();
    if (e.deltaY < 0) scrollLeft(); else scrollRight();
  };

  const visibleData = allData.slice(winStart, winStart + winSize);
  const atStart = winStart === 0;
  const atEnd   = winStart + winSize >= allData.length;
  const noData  = allData.length === 0;

  // Ticker X: afișează secunde de la start
  const xTickFormatter = (idx) => `${(idx / SAMPLE_RATE).toFixed(1)}s`;

  // Progres scroll (%)
  const scrollPct = allData.length > winSize
    ? Math.round((winStart / (allData.length - winSize)) * 100)
    : 0;

  return (
    <Card sx={{ bgcolor: '#0a0a0a', color: '#00ff41' }}>
      <CardContent sx={{ pb: '12px !important' }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography variant="h6" sx={{ color: '#00ff41', fontFamily: 'monospace', fontSize: '15px' }}>
            ECG Monitor
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {/* Zoom */}
            <MuiTooltip title="Zoom out">
              <span><IconButton onClick={zoomOut} disabled={noData || winSize >= allData.length} sx={btnSx(false, noData || winSize >= allData.length)}>−</IconButton></span>
            </MuiTooltip>
            <Typography sx={{ color: '#555', fontFamily: 'monospace', fontSize: '11px', mx: 0.5 }}>
              {(winSize / SAMPLE_RATE).toFixed(1)}s
            </Typography>
            <MuiTooltip title="Zoom in">
              <span><IconButton onClick={zoomIn} disabled={noData || winSize <= MIN_WIN} sx={btnSx(false, noData || winSize <= MIN_WIN)}>+</IconButton></span>
            </MuiTooltip>

            <Box sx={{ mx: 1, width: '1px', height: '20px', bgcolor: '#222' }} />

            {/* Scroll */}
            <MuiTooltip title="Scroll stânga">
              <span><IconButton onClick={scrollLeft} disabled={noData || atStart} sx={btnSx(false, noData || atStart)}>◀</IconButton></span>
            </MuiTooltip>
            {/* Play/Pause */}
            <IconButton onClick={togglePlay} disabled={noData} sx={btnSx(playing, noData)}>
              {playing ? '⏸' : '▶'}
            </IconButton>
            <MuiTooltip title="Scroll dreapta">
              <span><IconButton onClick={scrollRight} disabled={noData || atEnd} sx={btnSx(false, noData || atEnd)}>▶▶</IconButton></span>
            </MuiTooltip>
          </Box>
        </Box>

        {/* Grafic */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress sx={{ color: '#00ff41' }} />
          </Box>
        ) : noData ? (
          <Typography sx={{ color: '#444', fontFamily: 'monospace', py: 4, textAlign: 'center' }}>
            Nu există date ECG pentru acest pacient.
          </Typography>
        ) : (
          <Box onWheel={onWheel} sx={{ userSelect: 'none' }}>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={visibleData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <XAxis
                  dataKey="index"
                  type="number"
                  domain={[winStart, winStart + winSize]}
                  tickFormatter={xTickFormatter}
                  tick={{ fill: '#444', fontSize: 10, fontFamily: 'monospace' }}
                  tickCount={6}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={yDomain}
                  hide
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111', border: '1px solid #00ff41', color: '#00ff41', fontSize: '12px' }}
                  formatter={(v) => [`${v}`, 'ADC']}
                  labelFormatter={(l) => `${(l / SAMPLE_RATE).toFixed(2)}s`}
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

            {/* Bara de progres scroll */}
            <Box sx={{ mt: 0.5, mx: 0.5, height: '3px', bgcolor: '#1a1a1a', borderRadius: '2px', position: 'relative' }}>
              <Box sx={{
                position: 'absolute',
                left: `${scrollPct}%`,
                width: `${Math.round((winSize / allData.length) * 100)}%`,
                height: '100%',
                bgcolor: '#00ff41',
                borderRadius: '2px',
                opacity: 0.6,
                transition: 'left 0.1s',
              }} />
            </Box>
          </Box>
        )}

        {/* Footer info */}
        <Typography variant="caption" sx={{ color: '#444', fontFamily: 'monospace', mt: 0.5, display: 'block' }}>
          {noData ? '' :
            `${allData.length} pts · fereastră ${(winSize/SAMPLE_RATE).toFixed(1)}s · scroll ${scrollPct}% · Y fix [${yDomain[0]}–${yDomain[1]}]`
          }
        </Typography>

      </CardContent>
    </Card>
  );
}
