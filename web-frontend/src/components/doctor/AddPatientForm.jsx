import React, { useState, useEffect } from "react";
import { Box, TextField, Grid, Button, Typography, Paper } from "@mui/material";
import { useNavigate } from "react-router-dom";
export default function AddPatientForm({ onSubmit }) {
  const [form, setForm] = useState({
    name: "",
    birthYear: "",
    age: "",
    height: "",
    street: "",
    city: "",
    county: "",
    phone: "",
    email: "",
  });

  const handleChange = (field, value) => {
    let updated = { ...form, [field]: value };

    // Calculează automat vârsta
    if (field === "birthYear" && value.length === 4) {
      const currentYear = new Date().getFullYear();
      updated.age = currentYear - Number(value);
    }

    setForm(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    await fetch("http://localhost:5000/api/patients", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, // dacă ai login
      },
      body: JSON.stringify(form),
    });
  };

  const navigate = useNavigate();

  return (
    <Paper sx={{ p: 5, maxWidth: 600, mx: "auto" }}>
      <Typography m={3} variant="h5" fontWeight={600} mb={4}>
        Adaugă pacient nou
      </Typography>

      <Box component="form" onSubmit={handleSubmit}>
        <Grid m={4} container spacing={3}>
          {/* NUME */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Nume complet"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
            />
          </Grid>

          {/* ANUL NAȘTERII + VÂRSTA */}
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Anul nașterii"
              type="number"
              value={form.birthYear}
              onChange={(e) => handleChange("birthYear", e.target.value)}
            />
          </Grid>

          <Grid item xs={6}>
            <TextField fullWidth label="Vârsta" value={form.age} disabled />
          </Grid>

          {/* ÎNĂLȚIME */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Înălțime (cm)"
              type="number"
              value={form.height}
              onChange={(e) => handleChange("height", e.target.value)}
            />
          </Grid>

          {/* ADRESĂ */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Strada"
              value={form.street}
              onChange={(e) => handleChange("street", e.target.value)}
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Oraș"
              value={form.city}
              onChange={(e) => handleChange("city", e.target.value)}
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Județ"
              value={form.county}
              onChange={(e) => handleChange("county", e.target.value)}
            />
          </Grid>

          {/* CONTACT */}
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Telefon"
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
            />
          </Grid>

          {/* SUBMIT */}
          <Grid mt={12} item xs={14}>
            <Button type="submit" variant="contained" fullWidth>
              Salvează pacient
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
}
