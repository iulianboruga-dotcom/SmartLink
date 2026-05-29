const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../config/db');

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

    // Include patient_id sau doctor_id în răspuns pentru mobile app
    let profileId = null;
    if (user.role === 'patient') {
      const pr = await pool.request()
        .input('uid', sql.Int, user.id)
        .query('SELECT id FROM patients WHERE user_id = @uid');
      if (pr.recordset.length > 0) profileId = pr.recordset[0].id;
    } else if (user.role === 'doctor') {
      const dr = await pool.request()
        .input('uid', sql.Int, user.id)
        .query('SELECT id FROM doctors WHERE user_id = @uid');
      if (dr.recordset.length > 0) profileId = dr.recordset[0].id;
    }

    const { password_hash, ...userWithoutPassword } = user;
    const profileKey = user.role === 'patient' ? 'patient_id' : user.role === 'doctor' ? 'doctor_id' : null;
    res.json({
      token,
      user: { ...userWithoutPassword, ...(profileKey ? { [profileKey]: profileId } : {}) }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { login };
