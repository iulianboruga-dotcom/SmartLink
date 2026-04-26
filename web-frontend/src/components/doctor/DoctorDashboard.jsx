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
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import FavoriteIcon from "@mui/icons-material/Favorite";
import ThermostatIcon from "@mui/icons-material/Thermostat";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SettingsIcon from "@mui/icons-material/Settings";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import { useNavigate, useLocation } from "react-router-dom";
import {
  getPatients,
  getLatestSensorReading,
  getRecommendations,
} from "../../api";
import { getPatientStatus } from "../../mockData";

const C = {
  blue: "#4B6CF5",
  blueLight: "#EEF2FF",
  bg: "#9aa9ce",
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

function MiniBarChart({
  color = C.blue,
  values = [40, 55, 35, 70, 48, 80, 60],
}) {
  const max = Math.max(...values) || 1;
  return (
    <Box
      sx={{ display: "flex", alignItems: "flex-end", gap: "3px", height: 36 }}
    >
      {values.map((v, i) => (
        <Box
          key={i}
          sx={{
            width: 7,
            height: `${(v / max) * 100}%`,
            bgcolor: i === values.length - 1 ? color : `${color}55`,
            borderRadius: "2px",
          }}
        />
      ))}
    </Box>
  );
}

function StatCard({ icon, title, value, subtitle, color, chartValues }) {
  return (
    <Box
      sx={{
        bgcolor: C.white,
        borderRadius: "16px",
        p: "20px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        flex: 1,
        minWidth: 0,
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, mb: 1 }}>
            <Box sx={{ color, display: "flex" }}>{icon}</Box>
            <Typography sx={{ fontSize: 13, color: C.muted, fontWeight: 500 }}>
              {title}
            </Typography>
            <ChevronRightIcon sx={{ fontSize: 15, color: C.muted }} />
          </Box>
          <Typography
            sx={{ fontSize: 28, fontWeight: 700, color: C.text, lineHeight: 1 }}
          >
            {value}
          </Typography>
          <Typography sx={{ fontSize: 11, color: C.muted, mt: 0.5 }}>
            {subtitle}
          </Typography>
        </Box>
        <MiniBarChart color={color} values={chartValues} />
      </Box>
    </Box>
  );
}

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
        whiteSpace: "nowrap",
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
            maxWidth: 170,
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

function NavItem({ icon, label, active, onClick }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        px: 2,
        py: 1,
        mx: 1,
        borderRadius: "10px",
        cursor: "pointer",
        bgcolor: active ? C.blueLight : "transparent",
        color: active ? C.blue : C.muted,
        fontWeight: active ? 600 : 400,
        transition: "all 0.15s",
        "&:hover": { bgcolor: C.bg, color: C.text },
      }}
    >
      <Box
        sx={{ display: "flex", color: "inherit", "& svg": { fontSize: 18 } }}
      >
        {icon}
      </Box>
      <Typography
        sx={{ fontSize: 13, fontWeight: "inherit", color: "inherit" }}
      >
        {label}
      </Typography>
    </Box>
  );
}

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const [patients, setPatients] = useState([]);
  const [readings, setReadings] = useState({});
  const [recs, setRecs] = useState({});
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const pats = await getPatients();
    setPatients(pats);
    const readingsMap = {};
    const recsMap = {};
    await Promise.all(
      pats.map(async (p) => {
        readingsMap[p.id] = await getLatestSensorReading(p.id);
        recsMap[p.id] = await getRecommendations(p.id);
      }),
    );
    setReadings(readingsMap);
    setRecs(recsMap);
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

  const totalPatients = patients.length;
  const normalCount = patients.filter(
    (p) => getPatientStatus(p.id) === "Normal",
  ).length;
  const criticalCount = patients.filter(
    (p) => getPatientStatus(p.id) === "Critic",
  ).length;

  const navItems = [
    { label: 'Alarme', path: '/doctor/alarms-list', icon: <NotificationsActiveIcon /> },

    {
      label: "Programări",
      path: "/doctor/schedule",
      icon: <CalendarMonthIcon />,
    },
    { label: "Pacienți", path: "/doctor/patients", icon: <PeopleAltIcon /> },
    {
      label: "Alarme",
      path: "/doctor/alarms",
      icon: <NotificationsActiveIcon />,
    },
    { label: "Profil", path: "/doctor/profile", icon: <AccountCircleIcon /> },
  ];

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <Box
      sx={{
        display: "flex",
        height: "100vh",
        bgcolor: C.bg,
        overflow: "hidden",
        fontFamily: "'DM Sans','Roboto',sans-serif",
      }}
    >
      <Box
        sx={{
          width: 240,
          bgcolor: C.white,
          display: "flex",
          flexDirection: "column",
          borderRight: `1px solid ${C.border}`,
          flexShrink: 0,
          py: 3,
          overflowY: "auto",
        }}
      >
        {/* Logo */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2.5,
            pb: 3,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: "10px",
                background: `linear-gradient(135deg, ${C.blue}, #818cf8)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <LocalHospitalIcon sx={{ color: "#fff", fontSize: 18 }} />
            </Box>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: 16,
                color: C.text,
                letterSpacing: "-0.3px",
              }}
            >
              SmartLink™
            </Typography>
          </Box>
          <ChevronLeftIcon
            sx={{ fontSize: 18, color: C.muted, cursor: "pointer" }}
          />
        </Box>

        <Box sx={{ px: 2, pb: 2 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              bgcolor: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: "10px",
              px: 1.5,
              py: 1,
            }}
          >
            <SearchIcon sx={{ fontSize: 16, color: C.muted }} />
            <Typography sx={{ fontSize: 13, color: C.muted }}>
              Caută...
            </Typography>
          </Box>
        </Box>

        <Typography
          sx={{
            fontSize: 10,
            fontWeight: 700,
            color: "#b0b5c3",
            px: 3,
            pt: 0.5,
            pb: 1,
            letterSpacing: "0.08em",
          }}
        >
          PRINCIPAL
        </Typography>

        {/* Nav items */}

        {navItems.map((item) => (
          <NavItem
            key={item.path}
            icon={item.icon}
            label={item.label}
            active={location.pathname === item.path}
            onClick={() => navigate(item.path)}
          />
        ))}

        <Box sx={{ flex: 1 }} />

        {/* User block */}
        <Box sx={{ mx: 2, p: 1.5, bgcolor: C.bg, borderRadius: "10px" }}>
          <Typography sx={{ fontSize: 11, color: C.muted, mb: 0.5 }}>
            Conectat ca
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                bgcolor: C.blueLight,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: C.blue }}>
                {user.firstName?.[0] || "D"}
                {user.lastName?.[0] || "R"}
              </Typography>
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: C.text,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                Dr. {user.firstName || ""} {user.lastName || ""}
              </Typography>
              <Typography
                onClick={handleLogout}
                sx={{
                  fontSize: 10,
                  color: C.red,
                  cursor: "pointer",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                Ieșire
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Top header */}

        <Box
          sx={{
            px: 3,
            py: 2.5,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box>
            <Typography
              sx={{
                fontSize: 20,
                fontWeight: 700,
                color: C.text,
                lineHeight: 1.2,
              }}
            >
              Bună ziua, Dr. {user.firstName || ""} {user.lastName || "Andreas"}
              !
            </Typography>
            <Typography sx={{ fontSize: 13, color: C.muted, mt: 0.3 }}>
              Ai {totalPatients} pacienți înregistrați
              {criticalCount > 0 ? `, ${criticalCount} în stare critică.` : "."}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            {[<SettingsIcon />, <NotificationsIcon />].map((ic, i) => (
              <Box
                key={i}
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: C.white,
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  border: `1px solid ${C.border}`,
                  "& svg": { fontSize: 18, color: C.muted },
                }}
              >
                {ic}
              </Box>
            ))}
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${C.blue}, #818cf8)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography sx={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>
                {user.firstName?.[0] || "D"}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Scrollable area */}
        <Box sx={{ flex: 1, overflowY: "auto", px: 3, pb: 3 }}>
          <Box sx={{ display: "flex", gap: 2, mb: 2.5 }}>
            <StatCard
              icon={<PeopleAltIcon sx={{ fontSize: 18 }} />}
              title="Pacienți"
              color={C.blue}
              value={loading ? "—" : totalPatients}
              subtitle="Total pacienți înregistrați"
              chartValues={[30, 45, 38, 55, 48, 62, totalPatients || 1]}
            />
            <StatCard
              icon={<FavoriteIcon sx={{ fontSize: 18 }} />}
              title="Status Normal"
              color={C.green}
              value={loading ? "—" : normalCount}
              subtitle="Pacienți în parametri normali"
              chartValues={[20, 28, 22, 35, 30, 40, normalCount || 1]}
            />
            <StatCard
              icon={<NotificationsActiveIcon sx={{ fontSize: 18 }} />}
              title="Stare Critică"
              color={C.red}
              value={loading ? "—" : criticalCount}
              subtitle="Necesită atenție imediată"
              chartValues={[5, 3, 6, 2, 4, 3, criticalCount || 1]}
            />
          </Box>

          {/* Patient Table*/}
          <Box
            sx={{
              bgcolor: C.white,
              borderRadius: "16px",
              p: 2.5,
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              mb: 2.5,
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                mb: 2,
              }}
            >
              <Box>
                <Typography
                  sx={{ fontWeight: 700, fontSize: 15, color: C.text }}
                >
                  Pacienți
                </Typography>
                <Typography sx={{ fontSize: 12, color: C.muted, mt: 0.3 }}>
                  Lista recentă de pacienți
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                {/* Search */}
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
                  }}
                >
                  <SearchIcon sx={{ fontSize: 14, color: C.muted }} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Caută pacient..."
                    style={{
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      fontSize: 12,
                      color: C.text,
                      width: 130,
                    }}
                  />
                </Box>

                {/* Sort */}

                <TextField
                  select
                  size="small"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      fontSize: 12,
                      borderRadius: "8px",
                      height: 32,
                    },
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: C.border,
                    },
                  }}
                >
                  <MenuItem value="name" sx={{ fontSize: 12 }}>
                    Sortare: A–Z
                  </MenuItem>
                  <MenuItem value="status" sx={{ fontSize: 12 }}>
                    Sortare: Status
                  </MenuItem>
                </TextField>
                <Typography
                  onClick={() => navigate("/doctor/patients")}
                  sx={{
                    fontSize: 12,
                    color: C.blue,
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    "&:hover": { textDecoration: "underline" },
                  }}
                >
                  Vezi tot
                </Typography>
              </Box>
            </Box>

            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
                <CircularProgress size={28} sx={{ color: C.blue }} />
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {[
                        "Nume",
                        "ID",
                        "Puls",
                        "Temperatură",
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
                          onClick={() =>
                            navigate(`/doctor/patient/${patient.id}`)
                          }
                          sx={{
                            cursor: "pointer",
                            "&:hover": { bgcolor: "#F8F9FF" },
                            "& td": { borderBottom: `1px solid ${C.border}` },
                          }}
                        >
                          {/* Nume */}
                          <TableCell sx={{ py: 1.4, px: 1.2 }}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
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
                              <Box>
                                <Typography
                                  sx={{
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: C.text,
                                  }}
                                >
                                  {patient.firstName} {patient.lastName}
                                </Typography>
                                <Typography
                                  sx={{ fontSize: 11, color: C.muted }}
                                >
                                  {patient.age} ani
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>

                          {/* ID */}
                          <TableCell sx={{ py: 1.4, px: 1.2 }}>
                            <Typography sx={{ fontSize: 11, color: C.muted }}>
                              #{String(patient.id).padStart(6, "0")}
                            </Typography>
                          </TableCell>

                          {/* Puls */}
                          <TableCell sx={{ py: 1.4, px: 1.2 }}>
                            {r ? (
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.5,
                                }}
                              >
                                <FavoriteIcon
                                  sx={{ fontSize: 13, color: C.red }}
                                />
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

                          {/* Temperatură */}
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

                          {/* Recomandări */}
                          <TableCell sx={{ py: 1.4, px: 1.2, maxWidth: 200 }}>
                            <RecBadge recs={patRecs} />
                          </TableCell>

                          {/* Status */}
                          <TableCell sx={{ py: 1.4, px: 1.2 }}>
                            <StatusBadge status={status} />
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
                          Niciun pacient găsit
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>

          {/* Monitorizare timp real */}

          <Box
            sx={{
              bgcolor: C.white,
              borderRadius: "16px",
              p: 2.5,
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}
          >
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 15, color: C.text }}>
                Monitorizare în timp real
              </Typography>
              <Typography sx={{ fontSize: 12, color: C.muted, mt: 0.3 }}>
                Ultimele citiri ale senzorilor
              </Typography>
            </Box>

            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                <CircularProgress size={24} sx={{ color: C.blue }} />
              </Box>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {filtered.slice(0, 5).map((patient) => {
                  const r = readings[patient.id];
                  const status = getPatientStatus(patient.id);
                  const accent =
                    { Normal: C.green, Atenție: C.amber, Critic: C.red }[
                      status
                    ] || C.muted;
                  return (
                    <Box
                      key={patient.id}
                      onClick={() => navigate(`/doctor/patient/${patient.id}`)}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        p: 1.5,
                        borderRadius: "10px",
                        cursor: "pointer",
                        border: `1px solid ${C.border}`,
                        transition: "background 0.15s",
                        "&:hover": { bgcolor: C.bg },
                      }}
                    >
                      <Box
                        sx={{
                          width: 4,
                          height: 36,
                          bgcolor: accent,
                          borderRadius: "4px",
                          flexShrink: 0,
                        }}
                      />
                      <Box sx={{ width: 150, flexShrink: 0 }}>
                        <Typography
                          sx={{ fontSize: 13, fontWeight: 600, color: C.text }}
                        >
                          {patient.firstName} {patient.lastName}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: C.muted }}>
                          {patient.age} ani
                        </Typography>
                      </Box>
                      {r && (
                        <Box sx={{ display: "flex", gap: 1.5, flex: 1 }}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.8,
                              bgcolor: C.redBg,
                              borderRadius: "8px",
                              px: 1.5,
                              py: 0.8,
                            }}
                          >
                            <FavoriteIcon sx={{ fontSize: 13, color: C.red }} />
                            <Typography
                              sx={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: C.red,
                              }}
                            >
                              {r.pulse} bpm
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.8,
                              bgcolor: C.amberBg,
                              borderRadius: "8px",
                              px: 1.5,
                              py: 0.8,
                            }}
                          >
                            <ThermostatIcon
                              sx={{ fontSize: 13, color: C.amber }}
                            />
                            <Typography
                              sx={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: C.amber,
                              }}
                            >
                              {r.temperature}°C
                            </Typography>
                          </Box>
                          {r.humidity !== undefined && (
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.8,
                                bgcolor: C.blueLight,
                                borderRadius: "8px",
                                px: 1.5,
                                py: 0.8,
                              }}
                            >
                              <Typography
                                sx={{
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: C.blue,
                                }}
                              >
                                {r.humidity}% um.
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      )}
                      <Box sx={{ ml: "auto", flexShrink: 0 }}>
                        <StatusBadge status={status} />
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
