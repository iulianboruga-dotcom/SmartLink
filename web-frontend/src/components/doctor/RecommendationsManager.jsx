import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  TextField,
  MenuItem,
  Button,
  Chip,
  Divider,
  CircularProgress,
  Alert,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import {
  getRecommendations,
  createRecommendation,
  deleteRecommendation,
} from "../../api";

const priorityColor = { high: "error", medium: "warning", low: "success" };
const priorityLabel = { high: "Ridicată", medium: "Medie", low: "Scăzută" };

export default function RecommendationsManager({ patientId }) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState("");

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    if (patientId) loadRecommendations();
  }, [patientId]);

  const loadRecommendations = async () => {
    setLoading(true);
    const data = await getRecommendations(patientId);
    setRecommendations(data);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newText.trim()) return;
    setAdding(true);
    const rec = await createRecommendation({
      patientId,
      doctorId: user.id,
      text: newText.trim(),
      priority: newPriority,
    });
    setRecommendations([rec, ...recommendations]);
    setNewText("");
    setMessage("Recomandare adăugată!");
    setTimeout(() => setMessage(""), 3000);
    setAdding(false);
  };

  const handleDelete = async (recId) => {
    await deleteRecommendation(recId);
    setRecommendations(recommendations.filter((r) => r.id !== recId));
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Recomandări
        </Typography>

        {/* Formular adăugare */}
        <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
          <TextField
            size="small"
            label="Recomandare nouă"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            multiline
            rows={2}
            sx={{ flex: 1, minWidth: 200 }}
          />
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <TextField
              select
              size="small"
              label="Prioritate"
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value)}
              sx={{ width: 140 }}
            >
              <MenuItem value="high">Ridicată</MenuItem>
              <MenuItem value="medium">Medie</MenuItem>
              <MenuItem value="low">Scăzută</MenuItem>
            </TextField>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAdd}
              disabled={adding || !newText.trim()}
              size="small"
            >
              Adaugă
            </Button>
          </Box>
        </Box>

        {message && (
          <Alert severity="success" sx={{ mb: 1 }}>
            {message}
          </Alert>
        )}
        <Divider sx={{ mb: 1 }} />

        {loading ? (
          <CircularProgress />
        ) : (
          <List dense>
            {recommendations.map((rec) => (
              <ListItem key={rec.id} alignItems="flex-start" sx={{ pr: 6 }}>
                <ListItemText
                  primary={rec.text}
                  secondary={
                    <Box
                      sx={{
                        display: "flex",
                        gap: 1,
                        alignItems: "center",
                        mt: 0.5,
                      }}
                    >
                      <Chip
                        label={priorityLabel[rec.priority]}
                        color={priorityColor[rec.priority]}
                        size="small"
                      />
                      <Typography variant="caption" color="text.secondary">
                        {new Date(rec.createdAt).toLocaleDateString("ro-RO")}
                      </Typography>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={() => handleDelete(rec.id)}
                    color="error"
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
            {recommendations.length === 0 && (
              <Typography
                color="text.secondary"
                sx={{ py: 2, textAlign: "center" }}
              >
                Nicio recomandare
              </Typography>
            )}
          </List>
        )}
      </CardContent>
    </Card>
  );
}
