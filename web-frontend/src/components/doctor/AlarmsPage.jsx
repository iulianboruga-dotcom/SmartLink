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
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import FavoriteIcon from "@mui/icons-material/Favorite";
import ThermostatIcon from "@mui/icons-material/Thermostat";
import OpacityIcon from "@mui/icons-material/Opacity";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useNavigate } from "react-router-dom";
import { getPatients, getAlarms } from "../../api";

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
  orange: "#F97316",
  orangeBg: "#FFF7ED",
};

const alarmTypeLabel = {
  PULSE_HIGH: "Puls ridicat",
  PULSE_LOW: "Puls scăzut",
  TEMP_HIGH: "Temperatură ridicată",
  TEMP_LOW: "Temperatură scăzută",
  HUM_HIGH: "Umiditate ridicată",
  HUM_LOW: "Umiditate scăzută",
};

const alarmUnit = {
  PULSE_HIGH: "bpm",
  PULSE_LOW: "bpm",
  TEMP_HIGH: "°C",
  TEMP_LOW: "°C",
  HUM_HIGH: "%",
  HUM_LOW: "%",
};

// Calculează severitatea în funcție de cât depășește pragul

function getSeverity(alarm) {
  if (alarm.acknowledged) return "rezolvat";
  const diff = Math.abs(alarm.measuredValue - alarm.thresholdValue);
  const type = alarm.type;

  if (type === "PULSE_HIGH" || type === "PULSE_LOW") {
    if (diff >= 30) return "critic";
    if (diff >= 15) return "ridicat";
    return "moderat";
  }
  if (type === "TEMP_HIGH" || type === "TEMP_LOW") {
    if (diff >= 2) return "critic";
    if (diff >= 1) return "ridicat";
    return "moderat";
  }
  if (type === "HUM_HIGH" || type === "HUM_LOW") {
    if (diff >= 30) return "critic";
    if (diff >= 15) return "ridicat";
    return "moderat";
  }
  return "moderat";
}

const severityConfig = {
  critic: {
    bg: C.redBg,
    color: C.red,
    border: "#fca5a5",
    label: "Critic",
    order: 0,
    icon: <WarningAmberIcon sx={{ fontSize: 14 }} />,
  },
  ridicat: {
    bg: C.orangeBg,
    color: C.orange,
    border: "#fdba74",
    label: "Ridicat",
    order: 1,
    icon: <WarningAmberIcon sx={{ fontSize: 14 }} />,
  },
  moderat: {
    bg: C.amberBg,
    color: C.amber,
    border: "#fcd34d",
    label: "Moderat",
    order: 2,
    icon: <WarningAmberIcon sx={{ fontSize: 14 }} />,
  },
  rezolvat: {
    bg: C.greenBg,
    color: C.green,
    border: "#86efac",
    label: "Rezolvat",
    order: 3,
    icon: <CheckCircleIcon sx={{ fontSize: 14 }} />,
  },
};

function SeverityBadge({ severity }) {
  const s = severityConfig[severity] || severityConfig.moderat;
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        bgcolor: s.bg,
        color: s.color,
        borderRadius: "20px",
        px: 1.2,
        py: "3px",
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {s.icon}
      {s.label}
    </Box>
  );
}

function TypeIcon({ type }) {
  if (type?.startsWith("PULSE"))
    return <FavoriteIcon sx={{ fontSize: 15, color: C.red }} />;
  if (type?.startsWith("TEMP"))
    return <ThermostatIcon sx={{ fontSize: 15, color: C.amber }} />;
  return <OpacityIcon sx={{ fontSize: 15, color: C.blue }} />;
}

// Bara vizuală care arată cât de departe e valoarea de prag

function DeviationBar({ alarm }) {
  const diff = alarm.measuredValue - alarm.thresholdValue;
  const isHigh = alarm.type?.includes("HIGH");
  const pct = Math.min(
    (Math.abs(diff) / (alarm.thresholdValue * 0.3)) * 100,
    100,
  );
  const color = pct > 66 ? C.red : pct > 33 ? C.orange : C.amber;

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Typography
        sx={{ fontSize: 12, fontWeight: 600, color: C.text, minWidth: 60 }}
      >
        {alarm.measuredValue} {alarmUnit[alarm.type]}
      </Typography>
      <Box
        sx={{
          flex: 1,
          height: 4,
          bgcolor: "#e5e7eb",
          borderRadius: "4px",
          overflow: "hidden",
          minWidth: 60,
        }}
      >
        <Box
          sx={{
            width: `${pct}%`,
            height: "100%",
            bgcolor: color,
            borderRadius: "4px",
            transition: "width 0.3s",
          }}
        />
      </Box>
      <Typography sx={{ fontSize: 10, color: C.muted, minWidth: 50 }}>
        prag: {alarm.thresholdValue}
      </Typography>
    </Box>
  );
}

export default function AlarmsPage() {
  const navigate = useNavigate();
  const [allAlarms, setAllAlarms] = useState([]);
  const [patientMap, setPatientMap] = useState({});
  const [filterType, setFilterType] = useState("ALL");
  const [filterSev, setFilterSev] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const pats = await getPatients();
    const pm = {};
    pats.forEach((p) => {
      pm[p.id] = p;
    });
    setPatientMap(pm);

    // Ia alarmele pentru toți pacienții

    const alarmArrays = await Promise.all(pats.map((p) => getAlarms(p.id)));
    const merged = alarmArrays.flatMap((arr, i) =>
      arr.map((a) => ({ ...a, patientId: pats[i].id })),
    );
    setAllAlarms(merged);
    setLoading(false);
  };

  // Adaugă severitate și sortează

  const enriched = allAlarms.map((a) => ({ ...a, severity: getSeverity(a) }));

  const filtered = enriched
    .filter((a) => filterType === "ALL" || a.type === filterType)
    .filter((a) => filterSev === "ALL" || a.severity === filterSev)
    .filter((a) => {
      if (!search) return true;
      const p = patientMap[a.patientId];
      return (
        p &&
        `${p.firstName} ${p.lastName}`
          .toLowerCase()
          .includes(search.toLowerCase())
      );
    })
    .sort((a, b) => {
      const sOrd =
        severityConfig[a.severity]?.order - severityConfig[b.severity]?.order;
      if (sOrd !== 0) return sOrd;
      return new Date(b.triggeredAt) - new Date(a.triggeredAt);
    });

  const uniqueTypes = [...new Set(allAlarms.map((a) => a.type))];

  // Contoare pe severitate
  const counts = { critic: 0, ridicat: 0, moderat: 0, rezolvat: 0 };
  enriched.forEach((a) => {
    if (counts[a.severity] !== undefined) counts[a.severity]++;
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
            Alarme
          </Typography>
          <Typography sx={{ fontSize: 12, color: C.muted }}>
            {loading ? "..." : `${filtered.length} alarme afișate`}
          </Typography>
        </Box>
      </Box>

      {/* Summary cards */}

      {!loading && (
        <Box sx={{ display: "flex", gap: 2, mb: 2.5 }}>
          {[
            { key: "critic", label: "Critic", color: C.red, bg: C.redBg },
            {
              key: "ridicat",
              label: "Ridicat",
              color: C.orange,
              bg: C.orangeBg,
            },
            { key: "moderat", label: "Moderat", color: C.amber, bg: C.amberBg },
            {
              key: "rezolvat",
              label: "Rezolvate",
              color: C.green,
              bg: C.greenBg,
            },
          ].map((s) => (
            <Box
              key={s.key}
              onClick={() => setFilterSev(filterSev === s.key ? "ALL" : s.key)}
              sx={{
                flex: 1,
                bgcolor: filterSev === s.key ? s.bg : C.white,
                border: `2px solid ${filterSev === s.key ? s.color : C.border}`,
                borderRadius: "12px",
                p: 2,
                cursor: "pointer",
                transition: "all 0.15s",
                "&:hover": { borderColor: s.color },
              }}
            >
              <Typography
                sx={{ fontSize: 26, fontWeight: 700, color: s.color }}
              >
                {counts[s.key]}
              </Typography>
              <Typography sx={{ fontSize: 12, color: C.muted }}>
                {s.label}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* Tabel */}

      <Box
        sx={{
          bgcolor: C.white,
          borderRadius: "16px",
          p: 2.5,
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        }}
      >
        {/* Filtre */}
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
              minWidth: 180,
            }}
          >
            <SearchIcon sx={{ fontSize: 14, color: C.muted }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Caută după pacient..."
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
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            label="Tip alarmă"
            sx={{
              "& .MuiOutlinedInput-root": {
                fontSize: 12,
                borderRadius: "8px",
                height: 36,
              },
              "& .MuiOutlinedInput-notchedOutline": { borderColor: C.border },
              minWidth: 170,
            }}
          >
            <MenuItem value="ALL" sx={{ fontSize: 12 }}>
              Toate tipurile
            </MenuItem>
            {uniqueTypes.map((t) => (
              <MenuItem key={t} value={t} sx={{ fontSize: 12 }}>
                {alarmTypeLabel[t] || t}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            value={filterSev}
            onChange={(e) => setFilterSev(e.target.value)}
            label="Severitate"
            sx={{
              "& .MuiOutlinedInput-root": {
                fontSize: 12,
                borderRadius: "8px",
                height: 36,
              },
              "& .MuiOutlinedInput-notchedOutline": { borderColor: C.border },
              minWidth: 140,
            }}
          >
            <MenuItem value="ALL" sx={{ fontSize: 12 }}>
              Toate
            </MenuItem>
            <MenuItem value="critic" sx={{ fontSize: 12, color: C.red }}>
              Critic
            </MenuItem>
            <MenuItem value="ridicat" sx={{ fontSize: 12, color: C.orange }}>
              Ridicat
            </MenuItem>
            <MenuItem value="moderat" sx={{ fontSize: 12, color: C.amber }}>
              Moderat
            </MenuItem>
            <MenuItem value="rezolvat" sx={{ fontSize: 12, color: C.green }}>
              Rezolvat
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
                    "Severitate",
                    "Pacient",
                    "Tip alarmă",
                    "Valoare / Prag",
                    "Data și ora",
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
                {filtered.map((alarm, idx) => {
                  const patient = patientMap[alarm.patientId];
                  const sevCfg =
                    severityConfig[alarm.severity] || severityConfig.moderat;
                  return (
                    <TableRow
                      key={alarm.id || idx}
                      onClick={() =>
                        patient && navigate(`/doctor/patient/${patient.id}`)
                      }
                      sx={{
                        cursor: "pointer",
                        bgcolor:
                          alarm.severity === "critic"
                            ? "#FFF8F8"
                            : "transparent",
                        "&:hover": { bgcolor: "#F8F9FF" },
                        "& td": { borderBottom: `1px solid ${C.border}` },
                        borderLeft: `3px solid ${sevCfg.color}`,
                      }}
                    >
                      {/* Severitate */}
                      <TableCell sx={{ py: 1.4, px: 1.2 }}>
                        <SeverityBadge severity={alarm.severity} />
                      </TableCell>

                      {/* Pacient */}
                      <TableCell sx={{ py: 1.4, px: 1.2 }}>
                        {patient ? (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Box
                              sx={{
                                width: 28,
                                height: 28,
                                borderRadius: "50%",
                                bgcolor: C.blueLight,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 10,
                                fontWeight: 700,
                                color: C.blue,
                                flexShrink: 0,
                              }}
                            >
                              {patient.firstName?.[0]}
                              {patient.lastName?.[0]}
                            </Box>
                            <Typography
                              sx={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: C.text,
                              }}
                            >
                              {patient.firstName} {patient.lastName}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography sx={{ fontSize: 11, color: C.muted }}>
                            —
                          </Typography>
                        )}
                      </TableCell>

                      {/* Tip alarmă */}
                      <TableCell sx={{ py: 1.4, px: 1.2 }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.6,
                          }}
                        >
                          <TypeIcon type={alarm.type} />
                          <Typography sx={{ fontSize: 12, color: C.text }}>
                            {alarmTypeLabel[alarm.type] || alarm.type}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* Valoare / Prag cu bara vizuală */}
                      <TableCell sx={{ py: 1.4, px: 1.2, minWidth: 200 }}>
                        <DeviationBar alarm={alarm} />
                      </TableCell>

                      {/* Data */}
                      <TableCell
                        sx={{ py: 1.4, px: 1.2, whiteSpace: "nowrap" }}
                      >
                        <Typography sx={{ fontSize: 11, color: C.text }}>
                          {new Date(alarm.triggeredAt).toLocaleString("ro-RO")}
                        </Typography>
                      </TableCell>

                      {/* Status */}
                      <TableCell sx={{ py: 1.4, px: 1.2 }}>
                        <Box
                          sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 0.5,
                            bgcolor: alarm.acknowledged ? C.greenBg : C.redBg,
                            color: alarm.acknowledged ? C.green : C.red,
                            borderRadius: "20px",
                            px: 1.2,
                            py: "3px",
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          {alarm.acknowledged ? (
                            <CheckCircleIcon sx={{ fontSize: 13 }} />
                          ) : (
                            <WarningAmberIcon sx={{ fontSize: 13 }} />
                          )}
                          {alarm.acknowledged ? "Rezolvată" : "Activă"}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      align="center"
                      sx={{ py: 5, color: C.muted, fontSize: 13 }}
                    >
                      Nicio alarmă găsită
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
