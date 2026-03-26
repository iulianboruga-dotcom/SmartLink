import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, List, ListItem, ListItemText,
  Chip, Divider, CircularProgress, Toolbar, Badge,
} from '@mui/material';
import FiberNewIcon from '@mui/icons-material/FiberNew';
import PatientNavbar from './PatientNavbar';
import { getRecommendations, markRecommendationRead } from '../../api';

const priorityColor = { high: 'error', medium: 'warning', low: 'success' };
const priorityLabel = { high: 'Urgentă', medium: 'Medie', low: 'Informativă' };

export default function PatientRecommendations() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const patientId = user.id;

  useEffect(() => {
    if (patientId) {
      getRecommendations(patientId).then((data) => {
        setRecommendations(data);
        setLoading(false);
        // Marchează toate ca citite
        data.filter((r) => !r.read).forEach((r) => markRecommendationRead(r.id));
      });
    }
  }, [patientId]);

  const unreadCount = recommendations.filter((r) => !r.read).length;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      <PatientNavbar />
      <Toolbar />
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <Typography variant="h5">Recomandările medicului</Typography>
          {unreadCount > 0 && (
            <Chip label={`${unreadCount} noi`} color="primary" size="small" icon={<FiberNewIcon />} />
          )}
        </Box>

        {loading ? (
          <CircularProgress />
        ) : (
          <Card>
            <List>
              {recommendations.map((rec, idx) => (
                <React.Fragment key={rec.id}>
                  <ListItem alignItems="flex-start" sx={{ bgcolor: !rec.read ? '#e3f2fd' : 'transparent' }}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant="body1" fontWeight={!rec.read ? 600 : 400}>
                            {rec.text}
                          </Typography>
                          {!rec.read && <FiberNewIcon color="primary" fontSize="small" />}
                        </Box>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
                          <Chip
                            label={priorityLabel[rec.priority]}
                            color={priorityColor[rec.priority]}
                            size="small"
                          />
                          <Typography variant="caption" color="text.secondary">
                            {new Date(rec.createdAt).toLocaleDateString('ro-RO', {
                              day: '2-digit', month: 'long', year: 'numeric',
                            })}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  {idx < recommendations.length - 1 && <Divider component="li" />}
                </React.Fragment>
              ))}
              {recommendations.length === 0 && (
                <ListItem>
                  <ListItemText primary="Nicio recomandare primită" sx={{ textAlign: 'center', color: 'text.secondary' }} />
                </ListItem>
              )}
            </List>
          </Card>
        )}
      </Box>
    </Box>
  );
}
