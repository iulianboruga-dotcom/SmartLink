const { getPool, sql } = require('../config/db');

// Toti pacientii asociati medicului logat
async function getAll(req, res, next) {
  try {
    const doctorUserId = req.user.userId;
    const pool = await getPool();

    const result = await pool.request()
      .input('doctorUserId', sql.Int, doctorUserId)
      .query(`
        SELECT p.id, u.email, u.first_name, u.last_name,
               p.age, p.weight, p.height, p.blood_type,
               -- Ultima citire senzor
               (SELECT TOP 1 pulse FROM sensor_data sd WHERE sd.patient_id = p.id ORDER BY recorded_at DESC) AS last_pulse,
               (SELECT TOP 1 temperature FROM sensor_data sd WHERE sd.patient_id = p.id ORDER BY recorded_at DESC) AS last_temperature,
               (SELECT TOP 1 recorded_at FROM sensor_data sd WHERE sd.patient_id = p.id ORDER BY recorded_at DESC) AS last_recorded_at
        FROM patients p
        JOIN users u ON p.user_id = u.id
        JOIN patient_doctor pd ON pd.patient_id = p.id
        JOIN doctors d ON pd.doctor_id = d.id
        WHERE d.user_id = @doctorUserId
      `);

    res.json(result.recordset);
  } catch (err) {
    next(err);
  }
}

// Detalii pacient după ID
async function getById(req, res, next) {
  try {
    const { id } = req.params;
    const pool = await getPool();

    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT p.id, u.email, u.first_name, u.last_name,
               p.age, p.weight, p.height, p.blood_type,
               da.device_id
        FROM patients p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN device_associations da ON da.patient_id = p.id
        WHERE p.id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Pacient negăsit' });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    next(err);
  }
}

// Actualizare date pacient
async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { age, weight, height, bloodType } = req.body;
    const pool = await getPool();

    await pool.request()
      .input('id', sql.Int, id)
      .input('age', sql.Int, age)
      .input('weight', sql.Decimal(5, 2), weight)
      .input('height', sql.Decimal(5, 2), height)
      .input('bloodType', sql.NVarChar, bloodType)
      .query(`
        UPDATE patients
        SET age=@age, weight=@weight, height=@height, blood_type=@bloodType
        WHERE id=@id
      `);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function assignDoctor(req, res, next) {
  try {
    const { patientId, doctorId } = req.body;
    const pool = await getPool();

    // verifica daca exista deja asocierea
    const existing = await pool.request()
        .input('patientId', sql.Int, patientId)
        .input('doctorId', sql.Int, doctorId)
        .query(`
        SELECT id
        FROM patient_doctor
        WHERE patient_id = @patientId
          AND doctor_id = @doctorId
      `);

    if (existing.recordset.length > 0) {
      return res.status(409).json({
        error: 'Pacientul este deja asociat acestui medic'
      });
    }

    // inserare asociere
    await pool.request()
        .input('patientId', sql.Int, patientId)
        .input('doctorId', sql.Int, doctorId)
        .query(`
        INSERT INTO patient_doctor (patient_id, doctor_id)
        VALUES (@patientId, @doctorId)
      `);

    res.json({
      success: true,
      message: 'Pacient asociat cu medicul'
    });

  } catch (err) {
    next(err);
  }
}

async function unassignDoctor(req, res, next) {
  try {
    const { patientId, doctorId } = req.body;
    const pool = await getPool();

    const result = await pool.request()
        .input('patientId', sql.Int, patientId)
        .input('doctorId', sql.Int, doctorId)
        .query(`
        DELETE FROM patient_doctor
        WHERE patient_id = @patientId
          AND doctor_id = @doctorId
      `);

    res.json({
      success: true,
      message: 'Pacient disociat de medic'
    });

  } catch (err) {
    next(err);
  }
}
module.exports = { getAll, getById, update, assignDoctor, unassignDoctor };
