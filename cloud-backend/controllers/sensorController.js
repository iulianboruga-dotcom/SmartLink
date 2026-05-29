const { getPool, sql } = require('../config/db');
const { patientExists } = require('../utilities/utils');

// Primire date senzori de la aplicația Android (trimise de ESP32 via BLE)
async function receiveSensorData(req, res, next) {
  try {
    // Extragem datele trimise in body
    const { patientId, pulse, temperature, humidity } = req.body;
    // Verificam daca toate campurile obligatorii exista
    if (!patientId || pulse == null || temperature == null || humidity == null) {
      return res.status(400).json({ error: 'Date incomplete' });
    }
    // Obtinem conexiunea catre baza de date
    const pool = await getPool();

    // Obtinem conexiunea catre baza de date
    if (!(await patientExists(pool, patientId))) {
      return res.status(404).json({ error: 'Pacient negasit' });
    }

    // Salvam datele senzorilor in tabelul sensor_data
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

    // Verificare automata praguri si generare alarmA
    const thresholds = await pool.request()
        .input('patientId', sql.Int, patientId)
        .query('SELECT * FROM alarm_thresholds WHERE patient_id = @patientId');

    // Daca pacientul are praguri definite
    if (thresholds.recordset.length > 0) {
      const t = thresholds.recordset[0];

      // Array in care salvam alarmele generate
      const alarms = [];

      // Verificare puls
      if (pulse < t.pulse_min)       alarms.push({ type: 'pulse_low',  value: pulse,       threshold: t.pulse_min });
      if (pulse > t.pulse_max)       alarms.push({ type: 'pulse_high', value: pulse,       threshold: t.pulse_max });
      // Verificare temperatura
      if (temperature < t.temp_min)  alarms.push({ type: 'temp_low',   value: temperature, threshold: t.temp_min });
      if (temperature > t.temp_max)  alarms.push({ type: 'temp_high',  value: temperature, threshold: t.temp_max });
      // Verificare umiditate
      if (humidity < t.hum_min)      alarms.push({ type: 'hum_low',    value: humidity,    threshold: t.hum_min });
      if (humidity > t.hum_max)      alarms.push({ type: 'hum_high',   value: humidity,    threshold: t.hum_max });

      // Salvam toate alarmele generate in tabelul alarm_history
      for (const alarm of alarms) {
        await pool.request()
            .input('patientId', sql.Int, patientId)
            .input('type',      sql.NVarChar,       alarm.type)
            .input('value',     sql.Decimal(10, 2), alarm.value)
            .input('threshold', sql.Decimal(10, 2), alarm.threshold)
            .query(`
            INSERT INTO alarm_history (patient_id, alarm_type, measured_value, threshold_value)
            VALUES (@patientId, @type, @value, @threshold)
          `);
      }
    }

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
    // Verificam existenta pacientului
    if (!(await patientExists(pool, patientId))) {
      return res.status(404).json({ error: 'Pacient negasit' });
    }

    // Salvam valorile ECG ca JSON
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

// Citire istoric ECG pentru un pacient
async function getECGHistory(req, res, next) {
  try {
    const { patientId } = req.query;
    if (!patientId) return res.status(400).json({ error: 'patientId obligatoriu' });

    const pool = await getPool();
    if (!(await patientExists(pool, patientId))) {
      return res.status(404).json({ error: 'Pacient negasit' });
    }

    const result = await pool.request()
      .input('patientId', sql.Int, patientId)
      .query(`
        SELECT TOP 1 ecg_values, recorded_at
        FROM ecg_data
        WHERE patient_id = @patientId
        ORDER BY recorded_at DESC
      `);

    if (result.recordset.length === 0) return res.json([]);

    const values = JSON.parse(result.recordset[0].ecg_values);
    res.json(values.map((v, i) => ({ index: i, value: v })));
  } catch (err) {
    next(err);
  }
}

// Primire date accelerometru (array de valori)
async function receiveAccelerometer(req, res, next) {
  try {
    const { patientId, values } = req.body;

    // Validam datele accelerometrului
    if (!patientId || !Array.isArray(values) || values.length === 0) {
      return res.status(400).json({ error: 'Date accelerometru invalide' });
    }

    const pool = await getPool();

    // Verificam daca pacientul exista
    if (!(await patientExists(pool, patientId))) {
      return res.status(404).json({ error: 'Pacient negasit' });
    }

    // Salvam valorile accelerometrului ca JSON
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

// Istoric senzori cu filtrare dupa data
async function getHistory(req, res, next) {
  try {
    // Extragem parametrii din query
    const { patientId, startDate, endDate } = req.query;

    // patientId este obligatoriu
    if (!patientId) {
      return res.status(400).json({ error: 'patientId obligatoriu' });
    }

    const pool = await getPool();

    // Verificam daca pacientul exista
    if (!(await patientExists(pool, patientId))) {
      return res.status(404).json({ error: 'Pacient negasit' });
    }

    // Construim request-ul SQL
    const request = pool.request()
      .input('patientId', sql.Int, patientId);

    // Query de baza
    let query = `
      SELECT id, patient_id, pulse, temperature, humidity, recorded_at
      FROM sensor_data
      WHERE patient_id = @patientId
    `;

    // Adaugam filtrare dupa data de inceput
    if (startDate) {
      request.input('startDate', sql.DateTime, new Date(startDate));
      query += ' AND recorded_at >= @startDate';
    }

    // Adaugam filtrare dupa data de sfarsit
    if (endDate) {
      request.input('endDate', sql.DateTime, new Date(endDate));
      query += ' AND recorded_at <= @endDate';
    }

    // Sortam rezultatele crescator dupa data
    query += ' ORDER BY recorded_at ASC';

    const result = await request.query(query);
    // Returnam istoricul
    res.json(result.recordset);
  } catch (err) {
    next(err);
  }
}

module.exports = { receiveSensorData, receiveECG, receiveAccelerometer, getHistory, getECGHistory };
