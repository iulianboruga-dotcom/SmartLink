const { getPool, sql } = require('../config/db');

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

module.exports = { getProfile, getAll };
