/* Dashboardul Pacientilor */

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  MenuItem,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FavoriteIcon from "@mui/icons-material/Favorite";
import ThermostatIcon from "@mui/icons-material/Thermostat";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import { useNavigate } from "react-router-dom";
import {
  getPatients,
  getLatestSensorReading,
  getRecommendations,
} from "../../api";
import { getPatientStatus } from "../../mockData";

const C = {
  blue: "#4B6CF5",
  blueLight: "#EEF2FF",
  bg: "#E8EBF5",
  white: "#FFFFFF",
  text: "#1a1d2e",
  muted: "#6b7280",
  border: "#f1f3f9",
  green: "#22C55E",
  greenBg: "#F0FDF4",
  red: "#E11D48",
  redBg: "#FFF1F2",
  amber: "#F59E0B",
  amberBg: "#FFFBEB",
};

function StatusBadge({ status }) {
  const map = {
    Normal: { bg: C.greenBg, color: C.green, label: "Normal" },
    Atenție: { bg: C.amberBg, color: C.amber, label: "Atenție" },
    Critic: { bg: C.redBg, color: C.red, label: "Critic" },
  };
  const s = map[status] || map.Normal;
  return (
    <Box
      sx={{
        display: "inline-block",
        bgcolor: s.bg,
        color: s.color,
        borderRadius: "20px",
        px: 1.5,
        py: "3px",
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {s.label}
    </Box>
  );
}

function RecBadge({ recs }) {
  if (!recs || recs.length === 0)
    return <Typography sx={{ fontSize: 11, color: C.muted }}>—</Typography>;
  const latest = recs[0];
  const dotColor =
    { high: C.red, medium: C.amber, low: C.green }[latest.priority] || C.muted;
  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <Box
          sx={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            bgcolor: dotColor,
            flexShrink: 0,
          }}
        />
        <Typography
          sx={{
            fontSize: 11,
            color: C.text,
            maxWidth: 180,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {latest.text}
        </Typography>
      </Box>
      {recs.length > 1 && (
        <Typography sx={{ fontSize: 10, color: C.muted, ml: 1.4 }}>
          +{recs.length - 1} mai multe
        </Typography>
      )}
    </Box>
  );
}

export default function PatientsPage() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [readings, setReadings] = useState({});
  const [recs, setRecs] = useState({});
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const pats = await getPatients();
    setPatients(pats);
    const rm = {},
      recsM = {};
    await Promise.all(
      pats.map(async (p) => {
        rm[p.id] = await getLatestSensorReading(p.id);
        recsM[p.id] = await getRecommendations(p.id);
      }),
    );
    setReadings(rm);
    setRecs(recsM);
    setLoading(false);
  };

  const filtered = patients
    .filter((p) =>
      `${p.firstName} ${p.lastName}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    )
    .sort((a, b) => {
      if (sortBy === "name") return a.lastName.localeCompare(b.lastName);
      const order = { Critic: 0, Atenție: 1, Normal: 2 };
      return order[getPatientStatus(a.id)] - order[getPatientStatus(b.id)];
    });

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: C.bg,
        p: 3,
        fontFamily: "'DM Sans','Roboto',sans-serif",
      }}
    >
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
        <Box
          onClick={() => navigate("/doctor")}
          sx={{
            display: "flex",
            alignItems: "center",
            cursor: "pointer",
            color: C.muted,
            "&:hover": { color: C.blue },
          }}
        >
          <ChevronLeftIcon sx={{ fontSize: 20 }} />
        </Box>
        <Box>
          <Typography sx={{ fontSize: 20, fontWeight: 700, color: C.text }}>
            Pacienți
          </Typography>
          <Typography sx={{ fontSize: 12, color: C.muted }}>
            {loading ? "..." : `${filtered.length} pacienți`}
          </Typography>
        </Box>
      </Box>

      {/* Tabel */}
      <Box
        sx={{
          bgcolor: C.white,
          borderRadius: "16px",
          p: 2.5,
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        }}
      >
        {/* Controale */}
        <Box sx={{ display: "flex", gap: 1.5, mb: 2, flexWrap: "wrap" }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.8,
              bgcolor: C.bg,
              borderRadius: "8px",
              px: 1.2,
              py: 0.7,
              border: `1px solid ${C.border}`,
              flex: 1,
              minWidth: 200,
            }}
          >
            <SearchIcon sx={{ fontSize: 14, color: C.muted }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Caută după nume..."
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: 13,
                color: C.text,
                width: "100%",
              }}
            />
          </Box>
          <TextField
            select
            size="small"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            sx={{
              "& .MuiOutlinedInput-root": {
                fontSize: 13,
                borderRadius: "8px",
                height: 36,
              },
              "& .MuiOutlinedInput-notchedOutline": { borderColor: C.border },
            }}
          >
            <MenuItem value="name" sx={{ fontSize: 13 }}>
              Sortare: A–Z
            </MenuItem>
            <MenuItem value="status" sx={{ fontSize: 13 }}>
              Sortare: Status
            </MenuItem>
          </TextField>
        </Box>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress sx={{ color: C.blue }} />
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {[
                    "Nume",
                    "Vârstă",
                    "ID",
                    "Puls",
                    "Temperatură",
                    "Umiditate",
                    "Recomandări",
                    "Status",
                  ].map((h) => (
                    <TableCell
                      key={h}
                      sx={{
                        fontSize: 11,
                        color: C.muted,
                        fontWeight: 600,
                        borderBottom: `1px solid ${C.border}`,
                        py: 1,
                        px: 1.2,
                      }}
                    >
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((patient) => {
                  const r = readings[patient.id];
                  const status = getPatientStatus(patient.id);
                  const patRecs = recs[patient.id] || [];
                  return (
                    <TableRow
                      key={patient.id}
                      onClick={() => navigate(`/doctor/patient/${patient.id}`)}
                      sx={{
                        cursor: "pointer",
                        "&:hover": { bgcolor: "#F8F9FF" },
                        "& td": { borderBottom: `1px solid ${C.border}` },
                      }}
                    >
                      <TableCell sx={{ py: 1.4, px: 1.2 }}>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Box
                            sx={{
                              width: 32,
                              height: 32,
                              borderRadius: "50%",
                              bgcolor: C.blueLight,
                              flexShrink: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 11,
                              fontWeight: 700,
                              color: C.blue,
                            }}
                          >
                            {patient.firstName?.[0]}
                            {patient.lastName?.[0]}
                          </Box>
                          <Typography
                            sx={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: C.text,
                            }}
                          >
                            {patient.firstName} {patient.lastName}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: 1.4, px: 1.2 }}>
                        <Typography sx={{ fontSize: 12, color: C.text }}>
                          {patient.age} ani
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.4, px: 1.2 }}>
                        <Typography sx={{ fontSize: 11, color: C.muted }}>
                          #{String(patient.id).padStart(6, "0")}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.4, px: 1.2 }}>
                        {r ? (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                            }}
                          >
                            <FavoriteIcon sx={{ fontSize: 13, color: C.red }} />
                            <Typography
                              sx={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: C.text,
                              }}
                            >
                              {r.pulse} bpm
                            </Typography>
                          </Box>
                        ) : (
                          <Typography sx={{ fontSize: 11, color: C.muted }}>
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ py: 1.4, px: 1.2 }}>
                        {r ? (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                            }}
                          >
                            <ThermostatIcon
                              sx={{ fontSize: 13, color: C.amber }}
                            />
                            <Typography
                              sx={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: C.text,
                              }}
                            >
                              {r.temperature}°C
                            </Typography>
                          </Box>
                        ) : (
                          <Typography sx={{ fontSize: 11, color: C.muted }}>
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ py: 1.4, px: 1.2 }}>
                        {r?.humidity !== undefined ? (
                          <Typography
                            sx={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: C.blue,
                            }}
                          >
                            {r.humidity}%
                          </Typography>
                        ) : (
                          <Typography sx={{ fontSize: 11, color: C.muted }}>
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ py: 1.4, px: 1.2, maxWidth: 200 }}>
                        <RecBadge recs={patRecs} />
                      </TableCell>
                      <TableCell sx={{ py: 1.4, px: 1.2 }}>
                        <StatusBadge status={status} />
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      align="center"
                      sx={{ py: 5, color: C.muted, fontSize: 13 }}
                    >
                      Niciun pacient găsit
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Box>
  );
}
