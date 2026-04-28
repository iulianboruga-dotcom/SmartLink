const { getPool, sql } = require('../config/db');
const { patientExists } = require('../utilities/utils');

// Creare recomandare nouă de la medic
async function create(req, res, next) {
  try {
    const { patientId, text, priority } = req.body;
    const doctorUserId = req.user.userId;

      if (!patientId || !text) {
          return res.status(400).json({ error: 'Date incomplete' });
      }

    const pool = await getPool();

      if (!(await patientExists(pool, patientId))) {
          return res.status(404).json({ error: 'Pacient negasit' });
      }

    // Obține doctor_id din user_id
    const doctorResult = await pool.request()
      .input('userId', sql.Int, doctorUserId)
      .query('SELECT id FROM doctors WHERE user_id = @userId');

    if (doctorResult.recordset.length === 0) {
      return res.status(403).json({ error: 'Nu ești înregistrat ca medic' });
    }

    const doctorId = doctorResult.recordset[0].id;

    const result = await pool.request()
      .input('patientId', sql.Int, patientId)
      .input('doctorId', sql.Int, doctorId)
      .input('text', sql.NVarChar(sql.MAX), text)
      .input('priority', sql.NVarChar, priority || 'medium')
      .query(`
        INSERT INTO recommendations (patient_id, doctor_id, reco_text, priority)
        OUTPUT INSERTED.id, INSERTED.created_at
        VALUES (@patientId, @doctorId, @text, @priority)
      `);

    res.status(201).json({ success: true, id: result.recordset[0].id });
  } catch (err) {
    next(err);
  }
}

// Recomandările unui pacient
async function getByPatient(req, res, next) {
  try {
    const { patientId } = req.params;
    const pool = await getPool();

      if (!(await patientExists(pool, patientId))) {
          return res.status(404).json({ error: 'Pacient negasit' });
      }
    const result = await pool.request()
      .input('patientId', sql.Int, patientId)
      .query(`
        SELECT r.id, r.reco_text, r.priority, r.created_at,
               u.first_name AS doctor_first_name, u.last_name AS doctor_last_name
        FROM recommendations r
        JOIN doctors d ON r.doctor_id = d.id
        JOIN users u ON d.user_id = u.id
        WHERE r.patient_id = @patientId
        ORDER BY r.created_at DESC
      `);

    res.json(result.recordset);
  } catch (err) {
    next(err);
  }
}

// Ștergere recomandare
async function deleteRecommendation(req, res, next) {
  try {
    const { id } = req.params;
    const pool = await getPool();

      const result = await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM recommendations WHERE id = @id');

      if (result.rowsAffected[0] === 0) {
          return res.status(404).json({ error: 'Recomandare negasita' });
      }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, getByPatient, deleteRecommendation };
