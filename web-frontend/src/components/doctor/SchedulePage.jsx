import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import AddIcon from "@mui/icons-material/Add";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PersonIcon from "@mui/icons-material/Person";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { useNavigate } from "react-router-dom";

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

const STORAGE_KEY = "smartlink_appointments";
const emptyForm = { name: "", age: "", problem: "", date: "", time: "" };

function loadAppointments() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}
function saveAppointments(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("ro-RO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
function groupByDate(appointments) {
  const groups = {};
  appointments.forEach((a) => {
    const key = a.date || "Fără dată";
    if (!groups[key]) groups[key] = [];
    groups[key].push(a);
  });
  return groups;
}

// ── Formular (add + edit) ─────────────────────────────────────────────────────
function AppointmentForm({ open, onClose, onSave, initial }) {
  const [form, setForm] = useState(initial || emptyForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setForm(initial || emptyForm);
    setErrors({});
  }, [initial, open]);

  const handleChange = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Numele este obligatoriu";
    if (!form.age || form.age < 0 || form.age > 120) e.age = "Vârstă invalidă";
    if (!form.problem.trim()) e.problem = "Problema este obligatorie";
    if (!form.date) e.date = "Data este obligatorie";
    if (!form.time) e.time = "Ora este obligatorie";
    return e;
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    onSave(form);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: "16px", p: 1 } }}
    >
      <DialogTitle sx={{ fontWeight: 700, fontSize: 17, color: C.text, pb: 0 }}>
        {initial?.id ? "Editează programarea" : "Programare nouă"}
      </DialogTitle>

      <DialogContent
        sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}
      >
        {/* Nume */}
        <Box>
          <Typography
            sx={{ fontSize: 12, fontWeight: 600, color: C.text, mb: 0.5 }}
          >
            Nume pacient *
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="ex. Ion Popescu"
            value={form.name}
            onChange={handleChange("name")}
            error={!!errors.name}
            helperText={errors.name}
            sx={{
              "& .MuiOutlinedInput-root": { borderRadius: "8px", fontSize: 13 },
            }}
          />
        </Box>

        {/* Vârstă */}
        <Box>
          <Typography
            sx={{ fontSize: 12, fontWeight: 600, color: C.text, mb: 0.5 }}
          >
            Vârstă *
          </Typography>
          <TextField
            fullWidth
            size="small"
            type="number"
            placeholder="ex. 45"
            value={form.age}
            onChange={handleChange("age")}
            error={!!errors.age}
            helperText={errors.age}
            inputProps={{ min: 0, max: 120 }}
            sx={{
              "& .MuiOutlinedInput-root": { borderRadius: "8px", fontSize: 13 },
            }}
          />
        </Box>

        {/* Problemă */}
        <Box>
          <Typography
            sx={{ fontSize: 12, fontWeight: 600, color: C.text, mb: 0.5 }}
          >
            Problemă raportată *
          </Typography>
          <TextField
            fullWidth
            size="small"
            multiline
            rows={2}
            placeholder="ex. Dureri de cap, febră..."
            value={form.problem}
            onChange={handleChange("problem")}
            error={!!errors.problem}
            helperText={errors.problem}
            sx={{
              "& .MuiOutlinedInput-root": { borderRadius: "8px", fontSize: 13 },
            }}
          />
        </Box>

        {/* Data + Ora */}
        <Box sx={{ display: "flex", gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography
              sx={{ fontSize: 12, fontWeight: 600, color: C.text, mb: 0.5 }}
            >
              Data *
            </Typography>
            <TextField
              fullWidth
              size="small"
              type="date"
              value={form.date}
              onChange={handleChange("date")}
              error={!!errors.date}
              helperText={errors.date}
              InputLabelProps={{ shrink: true }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "8px",
                  fontSize: 13,
                },
              }}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography
              sx={{ fontSize: 12, fontWeight: 600, color: C.text, mb: 0.5 }}
            >
              Ora *
            </Typography>
            <TextField
              fullWidth
              size="small"
              type="time"
              value={form.time}
              onChange={handleChange("time")}
              error={!!errors.time}
              helperText={errors.time}
              InputLabelProps={{ shrink: true }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "8px",
                  fontSize: 13,
                },
              }}
            />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button
          onClick={onClose}
          sx={{
            borderRadius: "8px",
            color: C.muted,
            fontSize: 13,
            textTransform: "none",
          }}
        >
          Anulează
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          sx={{
            borderRadius: "8px",
            bgcolor: C.blue,
            fontSize: 13,
            textTransform: "none",
            px: 3,
            boxShadow: "none",
            "&:hover": { bgcolor: "#3b5ce4" },
          }}
        >
          Salvează
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Card programare ───────────────────────────────────────────────────────────
function AppointmentCard({ appt, onDelete, onEdit }) {
  const isPast =
    appt.date && new Date(`${appt.date}T${appt.time}`) < new Date();

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 2,
        p: 2,
        borderRadius: "12px",
        border: `1px solid ${C.border}`,
        bgcolor: isPast ? "#fafafa" : C.white,
        opacity: isPast ? 0.75 : 1,
        transition: "box-shadow 0.15s",
        "&:hover": { boxShadow: "0 2px 12px rgba(0,0,0,0.08)" },
      }}
    >
      {/* Ora */}
      <Box sx={{ width: 56, flexShrink: 0, textAlign: "center", pt: 0.3 }}>
        <Typography sx={{ fontSize: 15, fontWeight: 700, color: C.blue }}>
          {appt.time}
        </Typography>
        <Typography sx={{ fontSize: 10, color: C.muted }}>ora</Typography>
      </Box>

      {/* Linie verticală */}
      <Box
        sx={{
          width: 2,
          bgcolor: isPast ? C.border : C.blue,
          borderRadius: "2px",
          minHeight: 56,
          flexShrink: 0,
          mt: 0.5,
        }}
      />

      {/* Info */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              bgcolor: C.blueLight,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <PersonIcon sx={{ fontSize: 16, color: C.blue }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: C.text }}>
              {appt.name}
            </Typography>
            <Typography sx={{ fontSize: 11, color: C.muted }}>
              {appt.age} ani
            </Typography>
          </Box>
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.6,
            mt: 1,
            bgcolor: C.amberBg,
            borderRadius: "8px",
            px: 1.2,
            py: 0.6,
            width: "fit-content",
          }}
        >
          <MedicalServicesIcon sx={{ fontSize: 13, color: C.amber }} />
          <Typography sx={{ fontSize: 12, color: C.amber, fontWeight: 500 }}>
            {appt.problem}
          </Typography>
        </Box>
      </Box>

      {/* Actiuni */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 1,
          flexShrink: 0,
        }}
      >
        {/* Badge */}
        <Box
          sx={{
            bgcolor: isPast ? C.border : C.blueLight,
            color: isPast ? C.muted : C.blue,
            borderRadius: "20px",
            px: 1.2,
            py: "3px",
            fontSize: 10,
            fontWeight: 600,
          }}
        >
          {isPast ? "Trecut" : "Programat"}
        </Box>

        {/* Butoane Edit + Delete */}
        <Box sx={{ display: "flex", gap: 1 }}>
          <Box
            onClick={(e) => {
              e.stopPropagation();
              onEdit(appt);
            }}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.4,
              cursor: "pointer",
              color: C.blue,
              bgcolor: C.blueLight,
              borderRadius: "6px",
              px: 1,
              py: 0.4,
              fontSize: 11,
              fontWeight: 600,
              "&:hover": { bgcolor: "#dde5ff" },
            }}
          >
            <EditIcon sx={{ fontSize: 13 }} />
            Edit
          </Box>
          <Box
            onClick={(e) => {
              e.stopPropagation();
              onDelete(appt.id);
            }}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.4,
              cursor: "pointer",
              color: C.red,
              bgcolor: C.redBg,
              borderRadius: "6px",
              px: 1,
              py: 0.4,
              fontSize: 11,
              fontWeight: 600,
              "&:hover": { bgcolor: "#fecdd3" },
            }}
          >
            <DeleteIcon sx={{ fontSize: 13 }} />
            Șterge
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// ── Pagina principală ─────────────────────────────────────────────────────────
export default function SchedulePage() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [openForm, setOpenForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // programarea editată
  const [filterDate, setFilterDate] = useState("upcoming");

  useEffect(() => {
    setAppointments(loadAppointments());
  }, []);

  // ── Adaugă ──
  const handleAdd = (form) => {
    const newAppt = { ...form, id: Date.now().toString() };
    const updated = [...appointments, newAppt].sort(
      (a, b) =>
        new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`),
    );
    setAppointments(updated);
    saveAppointments(updated);
    setOpenForm(false);
  };

  // ── Editează ──
  const handleEdit = (form) => {
    const updated = appointments
      .map((a) => (a.id === editTarget.id ? { ...form, id: a.id } : a))
      .sort(
        (a, b) =>
          new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`),
      );
    setAppointments(updated);
    saveAppointments(updated);
    setEditTarget(null);
  };

  // ── Șterge ──
  const handleDelete = (id) => {
    const updated = appointments.filter((a) => a.id !== id);
    setAppointments(updated);
    saveAppointments(updated);
  };

  // ── Filtrare ──
  const now = new Date();
  const filtered = appointments.filter((a) => {
    if (!a.date) return filterDate === "all";
    const d = new Date(`${a.date}T${a.time || "00:00"}`);
    if (filterDate === "upcoming") return d >= now;
    if (filterDate === "past") return d < now;
    return true;
  });

  const grouped = groupByDate(filtered);
  const sortedDates = Object.keys(grouped).sort(
    (a, b) => new Date(a) - new Date(b),
  );

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
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 3,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            onClick={() => navigate(-1)}
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
              Programări
            </Typography>
            <Typography sx={{ fontSize: 12, color: C.muted }}>
              {filtered.length} programări{" "}
              {filterDate === "upcoming"
                ? "viitoare"
                : filterDate === "past"
                  ? "trecute"
                  : "total"}
            </Typography>
          </Box>
        </Box>

        <Box
          onClick={() => setOpenForm(true)}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            bgcolor: C.blue,
            color: "#fff",
            borderRadius: "10px",
            px: 2,
            py: 1,
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13,
            boxShadow: "0 4px 14px rgba(75,108,245,0.35)",
            "&:hover": { bgcolor: "#3b5ce4" },
            transition: "all 0.15s",
          }}
        >
          <AddIcon sx={{ fontSize: 18 }} />
          Adaugă programare
        </Box>
      </Box>

      {/* Filtre */}
      <Box sx={{ display: "flex", gap: 1, mb: 3 }}>
        {[
          { key: "upcoming", label: "Viitoare" },
          { key: "all", label: "Toate" },
          { key: "past", label: "Trecute" },
        ].map((f) => (
          <Box
            key={f.key}
            onClick={() => setFilterDate(f.key)}
            sx={{
              px: 2,
              py: 0.8,
              borderRadius: "20px",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              bgcolor: filterDate === f.key ? C.blue : C.white,
              color: filterDate === f.key ? "#fff" : C.muted,
              border: `1px solid ${filterDate === f.key ? C.blue : C.border}`,
              transition: "all 0.15s",
            }}
          >
            {f.label}
          </Box>
        ))}
      </Box>

      {/* Lista */}
      {filtered.length === 0 ? (
        <Box
          sx={{
            bgcolor: C.white,
            borderRadius: "16px",
            p: 6,
            textAlign: "center",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          }}
        >
          <CalendarMonthIcon sx={{ fontSize: 48, color: C.border, mb: 2 }} />
          <Typography sx={{ fontSize: 15, fontWeight: 600, color: C.muted }}>
            Nicio programare{" "}
            {filterDate === "upcoming"
              ? "viitoare"
              : filterDate === "past"
                ? "trecută"
                : ""}
          </Typography>
          <Typography sx={{ fontSize: 12, color: C.muted, mt: 0.5 }}>
            Apasă „Adaugă programare" pentru a crea una
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {sortedDates.map((date) => (
            <Box key={date}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  mb: 1.5,
                }}
              >
                <CalendarMonthIcon sx={{ fontSize: 16, color: C.blue }} />
                <Typography
                  sx={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: C.blue,
                    textTransform: "capitalize",
                  }}
                >
                  {formatDate(date)}
                </Typography>
                <Box sx={{ flex: 1, height: 1, bgcolor: C.border }} />
                <Typography sx={{ fontSize: 11, color: C.muted }}>
                  {grouped[date].length} pacient
                  {grouped[date].length !== 1 ? "i" : ""}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {grouped[date].map((appt) => (
                  <AppointmentCard
                    key={appt.id}
                    appt={appt}
                    onDelete={handleDelete}
                    onEdit={(a) => setEditTarget(a)}
                  />
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {/* Dialog adaugă */}
      <AppointmentForm
        open={openForm}
        onClose={() => setOpenForm(false)}
        onSave={handleAdd}
        initial={null}
      />

      {/* Dialog editează */}
      <AppointmentForm
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSave={handleEdit}
        initial={editTarget}
      />
    </Box>
  );
}
