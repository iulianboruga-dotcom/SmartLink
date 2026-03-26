import React, { useState, useEffect } from 'react';
import {
  Card, CardContent, Typography, Box, Slider, Button, Grid, Alert, CircularProgress,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { getThresholds, updateThresholds } from '../../api';

export default function AlarmThresholdForm({ patientId }) {
  const [thresholds, setThresholds] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (patientId) loadThresholds();
  }, [patientId]);

  const loadThresholds = async () => {
    setLoading(true);
    const t = await getThresholds(patientId);
    setThresholds(t);
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await updateThresholds(patientId, thresholds);
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) return <CircularProgress />;
  if (!thresholds) return null;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Praguri alarme</Typography>
        <Grid container spacing={3}>
          {/* Puls */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              Puls: {thresholds.pulseMin} – {thresholds.pulseMax} bpm
            </Typography>
            <Slider
              value={[thresholds.pulseMin, thresholds.pulseMax]}
              onChange={(_, v) => setThresholds({ ...thresholds, pulseMin: v[0], pulseMax: v[1] })}
              min={30} max={200} step={1}
              marks={[{ value: 30, label: '30' }, { value: 200, label: '200' }]}
              valueLabelDisplay="auto"
              color="error"
            />
          </Grid>
          {/* Temperatură */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              Temperatură: {thresholds.tempMin}°C – {thresholds.tempMax}°C
            </Typography>
            <Slider
              value={[thresholds.tempMin, thresholds.tempMax]}
              onChange={(_, v) => setThresholds({ ...thresholds, tempMin: v[0], tempMax: v[1] })}
              min={34} max={42} step={0.1}
              marks={[{ value: 34, label: '34°C' }, { value: 42, label: '42°C' }]}
              valueLabelDisplay="auto"
              color="warning"
            />
          </Grid>
          {/* Umiditate */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              Umiditate: {thresholds.humMin}% – {thresholds.humMax}%
            </Typography>
            <Slider
              value={[thresholds.humMin, thresholds.humMax]}
              onChange={(_, v) => setThresholds({ ...thresholds, humMin: v[0], humMax: v[1] })}
              min={0} max={100} step={1}
              marks={[{ value: 0, label: '0%' }, { value: 100, label: '100%' }]}
              valueLabelDisplay="auto"
              color="primary"
            />
          </Grid>
        </Grid>

        {saved && <Alert severity="success" sx={{ mt: 2 }}>Praguri salvate cu succes!</Alert>}

        <Box sx={{ mt: 2 }}>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Se salvează...' : 'Salvează praguri'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
