const { getPool, sql } = require('../config/db');
const bcrypt = require('bcrypt');

async function registerDoctor(req, res, next) {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      specialization,
      clinicName
    } = req.body;

    const pool = await getPool();

    const existing = await pool.request()
        .input('email', sql.NVarChar, email)
        .query('SELECT id FROM users WHERE email = @email');

    if (existing.recordset.length > 0) {
      return res.status(409).json({
        error: 'Email deja folosit'
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const userResult = await pool.request()
        .input('email', sql.NVarChar, email)
        .input('passwordHash', sql.NVarChar, passwordHash)
        .input('firstName', sql.NVarChar, firstName)
        .input('lastName', sql.NVarChar, lastName)
        .query(`
        INSERT INTO users ( email, password_hash,  role, first_name, last_name
        )
        OUTPUT INSERTED.id, INSERTED.email, INSERTED.first_name, INSERTED.last_name
        VALUES (@email, @passwordHash, 'doctor', @firstName, @lastName )`);

    const user = userResult.recordset[0];

    const doctorResult = await pool.request()
        .input('userId', sql.Int, user.id)
        .input('specialization', sql.NVarChar, specialization)
        .input('clinicName', sql.NVarChar, clinicName)
        .query(`
        INSERT INTO doctors (
          user_id, specialization, clinic_name
        )
        OUTPUT INSERTED.id, INSERTED.specialization, INSERTED.clinic_name
        VALUES (@userId, @specialization, @clinicName)`);

    res.status(201).json({
      user,
      doctor: doctorResult.recordset[0]
    });

  } catch (err) {
    next(err);
  }
}

// Profilul medicului logat
async function getProfile(req, res, next) {
  try {
    const userId = req.user.userId;
    const pool = await getPool();

    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT d.id, u.email, u.first_name, u.last_name,
               d.specialization, d.clinic_name
        FROM doctors d
        JOIN users u ON d.user_id = u.id
        WHERE d.user_id = @userId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Medic negăsit' });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    next(err);
  }
}

// Toti medicii (util pentru asocierea pacient-medic)
async function getAll(req, res, next) {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT d.id, u.first_name, u.last_name, d.specialization, d.clinic_name
      FROM doctors d
      JOIN users u ON d.user_id = u.id
    `);

    res.json(result.recordset);
  } catch (err) {
    next(err);
  }
}

module.exports = { getProfile, getAll, registerDoctor };
