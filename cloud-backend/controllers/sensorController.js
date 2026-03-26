const { getPool, sql } = require('../config/db');

// Primire date senzori de la aplicația Android (trimise de ESP32 via BLE)
async function receiveSensorData(req, res, next) {
  try {
    const { patientId, pulse, temperature, humidity } = req.body;
    const pool = await getPool();

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
    const pool = await getPool();

    await pool.request()
      .input('patientId', sql.Int, patientId)
      .input('values', sql.NVarChar(sql.MAX), JSON.stringify(values))
      .query(`
        INSERT INTO ecg_data (patient_id, values)
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
    const pool = await getPool();

    await pool.request()
      .input('patientId', sql.Int, patientId)
      .input('values', sql.NVarChar(sql.MAX), JSON.stringify(values))
      .query(`
        INSERT INTO accelerometer_data (patient_id, values)
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
    const pool = await getPool();

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
