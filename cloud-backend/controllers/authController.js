const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../config/db');

// Inregistrare utilizator nou (medic sau pacient)
async function register(req, res, next) {
  try {
    const { email, password, role, firstName, lastName, specialization, clinicName,
      age, weight, height, bloodType} = req.body;
    const pool = await getPool();

    // Verifica daca emailul exista deja
    const existing = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT id FROM users WHERE email = @email');

    if (existing.recordset.length > 0) {
      return res.status(409).json({ error: 'Emailul este deja inregistrat' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .input('passwordHash', sql.NVarChar, passwordHash)
      .input('role', sql.NVarChar, role)
      .input('firstName', sql.NVarChar, firstName)
      .input('lastName', sql.NVarChar, lastName)
      .query(`
        INSERT INTO users (email, password_hash, role, first_name, last_name)
        OUTPUT INSERTED.id, INSERTED.email, INSERTED.role, INSERTED.first_name, INSERTED.last_name, INSERTED.created_at
        VALUES (@email, @passwordHash, @role, @firstName, @lastName)
      `);

    const user = result.recordset[0];
    let doctor = null;
    let patient = null;

    if (role === 'doctor') {
      const doctorResult = await pool.request()
          .input('userId', sql.Int, user.id)
          .input('specialization', sql.NVarChar, specialization || 'General')
          .input('clinicName', sql.NVarChar, clinicName || '')
          .query(`
          INSERT INTO doctors (user_id, specialization, clinic_name)
          OUTPUT INSERTED.id, INSERTED.specialization, INSERTED.clinic_name
          VALUES (@userId, @specialization, @clinicName)
        `);

      doctor = doctorResult.recordset[0];
    }

    if (role === 'patient') {
      const patientResult = await pool.request()
          .input('userId', sql.Int, user.id)
          .input('age', sql.Int, age || null)
          .input('weight', sql.Decimal(5,2), weight || null)
          .input('height', sql.Decimal(5,2), height || null)
          .input('bloodType', sql.NVarChar, bloodType || null)
          .query(`
          INSERT INTO patients (user_id, age, weight, height, blood_type)
          OUTPUT INSERTED.id, INSERTED.age, INSERTED.weight, INSERTED.height, INSERTED.blood_type
          VALUES (@userId, @age, @weight, @height, @bloodType)
        `);

      patient = patientResult.recordset[0];
    }

    res.status(201).json({
      user,
      doctor,
      patient
    });
  } catch (err) {
    next(err);
  }
}

// Login — returneaza JWT + date utilizator
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const pool = await getPool();

    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT * FROM users WHERE email = @email');

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: 'Email sau parolă incorectă' });
    }

    const user = result.recordset[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Email sau parolă incorectă' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Returnează userul fara parola
    const { password_hash, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login };
