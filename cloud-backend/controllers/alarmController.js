const { getPool, sql } = require('../config/db');

// Raportare alarma noua (declanșata de aplicatia Android)
async function reportAlarm(req, res, next) {
  try {
    const { patientId, type, value, threshold } = req.body;

    if (!patientId || !type || value == null || threshold == null) {
      return res.status(400).json({ error: 'Date incomplete' });
    }

    const pool = await getPool();

    const patient = await pool.request()
        .input('patientId', sql.Int, patientId)
        .query('SELECT id FROM patients WHERE id=@patientId');

    if (!patient.recordset.length) {
      return res.status(404).json({ error:'Pacient negasit' });
    }

    const result = await pool.request()
        .input('patientId', sql.Int, patientId)
        .input('type', sql.NVarChar, type)
        .input('value', sql.Decimal(10,2), value)
        .input('threshold', sql.Decimal(10,2), threshold)
        .query(`
          INSERT INTO alarm_history (patient_id, alarm_type, measured_value, threshold_value)
            OUTPUT INSERTED.id, INSERTED.triggered_at
          VALUES (@patientId, @type, @value, @threshold)
        `);

    res.status(201).json({
      success: true,
      id: result.recordset[0].id
    });

  } catch (err) {
    next(err);
  }
}

// Obtine pragurile de alarma pentru un pacient
async function getThresholds(req, res, next) {
  try {
    const { patientId } = req.params;
    const pool = await getPool();

    const result = await pool.request()
      .input('patientId', sql.Int, patientId)
      .query('SELECT * FROM alarm_thresholds WHERE patient_id = @patientId');

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Praguri negăsite pentru acest pacient' });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    next(err);
  }
}

// Creare sau actualizare praguri (INSERT dacă nu exista, UPDATE dacă exista)
async function upsertThresholds(req, res, next) {
  try {
    const { patientId } = req.params;
    const { pulseMin, pulseMax, tempMin, tempMax, humMin, humMax } = req.body;
    const pool = await getPool();

    // MERGE (echivalent UPSERT în SQL Server)
    await pool.request()
      .input('patientId', sql.Int, patientId)
      .input('pulseMin', sql.Int, pulseMin)
      .input('pulseMax', sql.Int, pulseMax)
      .input('tempMin', sql.Decimal(5, 2), tempMin)
      .input('tempMax', sql.Decimal(5, 2), tempMax)
      .input('humMin', sql.Decimal(5, 2), humMin)
      .input('humMax', sql.Decimal(5, 2), humMax)
      .query(`
        MERGE alarm_thresholds AS target
        USING (SELECT @patientId AS patient_id) AS source ON target.patient_id = source.patient_id
        WHEN MATCHED THEN
          UPDATE SET pulse_min=@pulseMin, pulse_max=@pulseMax,
                     temp_min=@tempMin, temp_max=@tempMax,
                     hum_min=@humMin, hum_max=@humMax,
                     updated_at=GETDATE()
        WHEN NOT MATCHED THEN
          INSERT (patient_id, pulse_min, pulse_max, temp_min, temp_max, hum_min, hum_max)
          VALUES (@patientId, @pulseMin, @pulseMax, @tempMin, @tempMax, @humMin, @humMax);
      `);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// Istoricul alarmelor unui pacient
async function getHistory(req, res, next) {
  try {
    const { patientId } = req.query;

    if (!patientId) {
      return res.status(400).json({ error: 'patientId obligatoriu' });
    }

    const pool = await getPool();

    // verificam pacientul
    const patient = await pool.request()
        .input('patientId', sql.Int, patientId)
        .query(`
        SELECT id
        FROM patients
        WHERE id = @patientId
      `);

    if (!patient.recordset.length) {
      return res.status(404).json({ error: 'Pacient negasit' });
    }

    const result = await pool.request()
        .input('patientId', sql.Int, patientId)
        .query(`
          SELECT *
          FROM alarm_history
          WHERE patient_id = @patientId
          ORDER BY triggered_at DESC
        `);

    res.json(result.recordset);

  } catch (err) {
    next(err);
  }
}

// Marcheaza o alarma ca rezolvata
async function acknowledgeAlarm(req, res, next) {
  try {
    const { id } = req.params;
    const pool = await getPool();

    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('UPDATE alarm_history SET acknowledged = 1 WHERE id = @id');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Alarma negasita' });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { reportAlarm, getThresholds, upsertThresholds, getHistory, acknowledgeAlarm };
