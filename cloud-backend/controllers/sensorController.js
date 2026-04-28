const { getPool, sql } = require('../config/db');
const { patientExists } = require('../utilities/utils');

// Primire date senzori de la aplicația Android (trimise de ESP32 via BLE)
async function receiveSensorData(req, res, next) {
  try {
    const { patientId, pulse, temperature, humidity } = req.body;

    if (!patientId || pulse == null || temperature == null || humidity == null) {
      return res.status(400).json({ error: 'Date incomplete' });
    }

    const pool = await getPool();

    if (!(await patientExists(pool, patientId))) {
      return res.status(404).json({ error: 'Pacient negasit' });
    }

    const result = await pool.request()
      .input('patientId', sql.Int, patientId)
      .input('pulse', sql.Int, pulse)
      .input('temperature', sql.Decimal(5, 2), temperature)
      .input('humidity', sql.Decimal(5, 2), humidity)
      .query(`
        INSERT INTO sensor_data (patient_id, pulse, temperature, humidity)
        OUTPUT INSERTED.id, INSERTED.recorded_at
        VALUES (@patientId, @pulse, @temperature, @humidity)
      `);

    res.status(201).json({ success: true, id: result.recordset[0].id });
  } catch (err) {
    next(err);
  }
}

// Primire date ECG (array de valori)
async function receiveECG(req, res, next) {
  try {
    const { patientId, values } = req.body;

    if (!patientId || !Array.isArray(values) || values.length === 0) {
      return res.status(400).json({ error: 'Date ECG invalide' });
    }

    const pool = await getPool();

    if (!(await patientExists(pool, patientId))) {
      return res.status(404).json({ error: 'Pacient negasit' });
    }

    await pool.request()
      .input('patientId', sql.Int, patientId)
      .input('values', sql.NVarChar(sql.MAX), JSON.stringify(values))
      .query(`
        INSERT INTO ecg_data (patient_id, ecg_values)
        VALUES (@patientId, @values)
      `);

    res.status(201).json({ success: true });
  } catch (err) {
    next(err);
  }
}

// Primire date accelerometru (array de valori)
async function receiveAccelerometer(req, res, next) {
  try {
    const { patientId, values } = req.body;

    if (!patientId || !Array.isArray(values) || values.length === 0) {
      return res.status(400).json({ error: 'Date accelerometru invalide' });
    }

    const pool = await getPool();

    if (!(await patientExists(pool, patientId))) {
      return res.status(404).json({ error: 'Pacient negasit' });
    }

    await pool.request()
      .input('patientId', sql.Int, patientId)
      .input('values', sql.NVarChar(sql.MAX), JSON.stringify(values))
      .query(`
        INSERT INTO accelerometer_data (patient_id, accel_values)
        VALUES (@patientId, @values)
      `);

    res.status(201).json({ success: true });
  } catch (err) {
    next(err);
  }
}

// Istoric senzori cu filtrare după dată
async function getHistory(req, res, next) {
  try {
    const { patientId, startDate, endDate } = req.query;

    if (!patientId) {
      return res.status(400).json({ error: 'patientId obligatoriu' });
    }

    const pool = await getPool();

    if (!(await patientExists(pool, patientId))) {
      return res.status(404).json({ error: 'Pacient negasit' });
    }

    const request = pool.request()
      .input('patientId', sql.Int, patientId);

    let query = `
      SELECT id, patient_id, pulse, temperature, humidity, recorded_at
      FROM sensor_data
      WHERE patient_id = @patientId
    `;

    if (startDate) {
      request.input('startDate', sql.DateTime, new Date(startDate));
      query += ' AND recorded_at >= @startDate';
    }
    if (endDate) {
      request.input('endDate', sql.DateTime, new Date(endDate));
      query += ' AND recorded_at <= @endDate';
    }

    query += ' ORDER BY recorded_at ASC';

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    next(err);
  }
}

module.exports = { receiveSensorData, receiveECG, receiveAccelerometer, getHistory };
