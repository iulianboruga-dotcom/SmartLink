import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  TextField,
  CircularProgress,
  Alert,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import PersonIcon from "@mui/icons-material/Person";
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
};

const STORAGE_KEY = "smartlink_doctor_profile";

function loadProfile(user) {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      firstName: saved.firstName || user.firstName || "",
      lastName: saved.lastName || user.lastName || "",
      email: saved.email || user.email || "",
      phone: saved.phone || "",
      address: saved.address || "",
      specialization: saved.specialization || "",
      clinic: saved.clinic || "",
      photo: saved.photo || "",
    };
  } catch {
    return {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      specialization: "",
      clinic: "",
      photo: "",
    };
  }
}

// ── Câmp individual editabil la click ────────────────────────────────────────
function Field({
  icon,
  label,
  value,
  onChange,
  type = "text",
  multiline = false,
}) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef();

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  return (
    <Box
      onClick={() => !editing && setEditing(true)}
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 1.5,
        py: 1.8,
        borderBottom: `1px solid ${C.border}`,
        cursor: editing ? "default" : "pointer",
        "&:hover .edit-hint": { opacity: 1 },
        "&:hover": { bgcolor: editing ? "transparent" : "#fafbff" },
        borderRadius: editing ? 0 : "4px",
        transition: "background 0.15s",
      }}
    >
      {/* Icon */}
      <Box sx={{ mt: 0.4, color: C.blue, display: "flex", flexShrink: 0 }}>
        {icon}
      </Box>

      {/* Continut */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: 11,
            color: C.muted,
            fontWeight: 600,
            mb: 0.4,
            letterSpacing: "0.03em",
          }}
        >
          {label}
        </Typography>

        {editing ? (
          <TextField
            inputRef={inputRef}
            fullWidth
            size="small"
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            multiline={multiline}
            rows={multiline ? 2 : 1}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !multiline) setEditing(false);
            }}
            sx={{
              "& .MuiOutlinedInput-root": { borderRadius: "8px", fontSize: 13 },
              "& .MuiOutlinedInput-notchedOutline": { borderColor: C.blue },
              "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                { borderColor: C.blue },
            }}
          />
        ) : (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
            <Typography
              sx={{
                fontSize: 14,
                color: value ? C.text : C.muted,
                fontStyle: value ? "normal" : "italic",
              }}
            >
              {value || "Apasă pentru a completa..."}
            </Typography>
            <EditIcon
              className="edit-hint"
              sx={{
                fontSize: 13,
                color: C.muted,
                opacity: 0,
                transition: "opacity 0.15s",
              }}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
}

// ── Componenta principală ────────────────────────────────────────────────────
export default function DoctorProfile() {
  const navigate = useNavigate();
  const fileRef = useRef();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [profile, setProfile] = useState(() => loadProfile(user));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const update = (field) => (val) =>
    setProfile((p) => ({ ...p, [field]: val }));

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) =>
      setProfile((p) => ({ ...p, photo: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      const updatedUser = {
        ...user,
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
      };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 500);
  };

  const initials = `${profile.firstName?.[0] || "D"}${profile.lastName?.[0] || "R"}`;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: C.bg,
        fontFamily: "'DM Sans','Roboto',sans-serif",
      }}
    >
      {/* ── Header albastru ── */}
      <Box sx={{ bgcolor: C.blue, pt: 3, pb: 7, px: 3 }}>
        <Box
          onClick={() => navigate(-1)}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
            cursor: "pointer",
            color: "rgba(255,255,255,0.75)",
            mb: 2,
            "&:hover": { color: "#fff" },
          }}
        >
          <ChevronLeftIcon sx={{ fontSize: 20 }} />
          <Typography sx={{ fontSize: 13 }}>Înapoi</Typography>
        </Box>
        <Typography sx={{ color: "#fff", fontSize: 20, fontWeight: 700 }}>
          Profilul meu
        </Typography>
        <Typography
          sx={{ color: "rgba(255,255,255,0.65)", fontSize: 13, mt: 0.3 }}
        >
          Click pe orice câmp pentru a-l modifica
        </Typography>
      </Box>

      {/* ── Card suprapus ── */}
      <Box sx={{ px: 3, mt: "-44px", pb: 5 }}>
        <Box
          sx={{
            bgcolor: C.white,
            borderRadius: "20px",
            boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
            overflow: "hidden",
          }}
        >
          {/* Avatar + nume + buton salvează */}
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-end",
              gap: 2.5,
              px: 3,
              pt: 3,
              pb: 2.5,
              borderBottom: `1px solid ${C.border}`,
              flexWrap: "wrap",
            }}
          >
            {/* Poza */}
            <Box sx={{ position: "relative", flexShrink: 0 }}>
              <Box
                sx={{
                  width: 88,
                  height: 88,
                  borderRadius: "50%",
                  bgcolor: C.blueLight,
                  border: `3px solid ${C.white}`,
                  boxShadow: "0 2px 16px rgba(75,108,245,0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                {profile.photo ? (
                  <img
                    src={profile.photo}
                    alt="profil"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <Typography
                    sx={{ fontSize: 28, fontWeight: 700, color: C.blue }}
                  >
                    {initials}
                  </Typography>
                )}
              </Box>

              {/* Buton cameră */}
              <Box
                onClick={() => fileRef.current.click()}
                sx={{
                  position: "absolute",
                  bottom: 2,
                  right: 2,
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  bgcolor: C.blue,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  border: "2px solid #fff",
                  "&:hover": { bgcolor: "#3b5ce4" },
                }}
              >
                <CameraAltIcon sx={{ fontSize: 13, color: "#fff" }} />
              </Box>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handlePhotoChange}
              />
            </Box>

            {/* Nume + specializare */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 18, fontWeight: 700, color: C.text }}>
                Dr. {profile.firstName} {profile.lastName}
              </Typography>
              <Typography sx={{ fontSize: 13, color: C.muted }}>
                {profile.specialization || "Specializare necompletată"}
              </Typography>
              <Typography sx={{ fontSize: 12, color: C.muted }}>
                {profile.clinic || "Clinică necompletată"}
              </Typography>
            </Box>

            {/* Buton Salvează */}
            <Box
              onClick={handleSave}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.8,
                px: 2.5,
                py: 1,
                borderRadius: "10px",
                bgcolor: C.blue,
                color: "#fff",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                boxShadow: "0 4px 14px rgba(75,108,245,0.35)",
                "&:hover": { bgcolor: "#3b5ce4" },
                transition: "all 0.15s",
                flexShrink: 0,
              }}
            >
              {saving ? (
                <CircularProgress size={14} sx={{ color: "#fff" }} />
              ) : (
                <SaveIcon sx={{ fontSize: 16 }} />
              )}
              Salvează
            </Box>
          </Box>

          {/* Mesaj succes */}
          {saved && (
            <Box sx={{ px: 3, pt: 2 }}>
              <Alert
                severity="success"
                sx={{ borderRadius: "10px", fontSize: 13 }}
              >
                Profilul a fost salvat cu succes!
              </Alert>
            </Box>
          )}

          {/* ── Date personale ── */}
          <Box sx={{ px: 3, pb: 1 }}>
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 700,
                color: C.muted,
                letterSpacing: "0.08em",
                pt: 2.5,
                pb: 0.5,
              }}
            >
              DATE PERSONALE
            </Typography>

            <Field
              icon={<PersonIcon sx={{ fontSize: 18 }} />}
              label="Prenume"
              value={profile.firstName}
              onChange={update("firstName")}
            />
            <Field
              icon={<PersonIcon sx={{ fontSize: 18 }} />}
              label="Nume"
              value={profile.lastName}
              onChange={update("lastName")}
            />
            <Field
              icon={<EmailIcon sx={{ fontSize: 18 }} />}
              label="Email"
              value={profile.email}
              onChange={update("email")}
              type="email"
            />
            <Field
              icon={<PhoneIcon sx={{ fontSize: 18 }} />}
              label="Număr de telefon"
              value={profile.phone}
              onChange={update("phone")}
              type="tel"
            />
            <Field
              icon={<LocationOnIcon sx={{ fontSize: 18 }} />}
              label="Adresă"
              value={profile.address}
              onChange={update("address")}
              multiline
            />

            {/* ── Date profesionale ── */}
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 700,
                color: C.muted,
                letterSpacing: "0.08em",
                pt: 3,
                pb: 0.5,
              }}
            >
              DATE PROFESIONALE
            </Typography>

            <Field
              icon={<MedicalServicesIcon sx={{ fontSize: 18 }} />}
              label="Specializare"
              value={profile.specialization}
              onChange={update("specialization")}
            />
            <Field
              icon={<LocalHospitalIcon sx={{ fontSize: 18 }} />}
              label="Clinică / Spital"
              value={profile.clinic}
              onChange={update("clinic")}
            />
          </Box>

          {/* Footer hint */}
          <Box
            sx={{
              px: 3,
              py: 2,
              bgcolor: C.bg,
              borderTop: `1px solid ${C.border}`,
            }}
          >
            <Typography
              sx={{ fontSize: 11, color: C.muted, textAlign: "center" }}
            >
              Click pe orice câmp pentru a-l edita · Apasă Enter sau click în
              afară pentru a confirma · Apasă Salvează pentru a păstra
              modificările
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
