// One-time backfill: inserează praguri default pentru pacienții fără rând în alarm_thresholds.
// Rulează o singură dată: node scripts/backfill-thresholds.js
// Necesită variabilele de mediu DB_SERVER, DB_NAME, DB_USER, DB_PASSWORD (sau .env în root).

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { getPool, sql } = require('../config/db');

async function backfill() {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    // Pacienți fără praguri
    const missing = await new sql.Request(transaction).query(`
      SELECT p.id
      FROM patients p
      WHERE NOT EXISTS (
        SELECT 1 FROM alarm_thresholds at2 WHERE at2.patient_id = p.id
      )
    `);

    if (missing.recordset.length === 0) {
      console.log('Niciun pacient fără praguri. Nimic de făcut.');
      await transaction.rollback();
      return;
    }

    console.log(`Backfill pentru ${missing.recordset.length} pacient(i): ${missing.recordset.map((r) => r.id).join(', ')}`);

    for (const { id } of missing.recordset) {
      await new sql.Request(transaction)
        .input('patientId', sql.Int, id)
        .query(`
          INSERT INTO alarm_thresholds (patient_id, pulse_min, pulse_max, temp_min, temp_max, hum_min, hum_max)
          VALUES (@patientId, 50, 120, 35.5, 38.0, 30.0, 70.0)
        `);
      console.log(`  ✓ patient_id=${id}`);
    }

    await transaction.commit();
    console.log('Backfill finalizat.');
  } catch (err) {
    if (!transaction._aborted) await transaction.rollback();
    console.error('EROARE — rollback:', err.message);
    process.exit(1);
  } finally {
    await pool.close();
  }
}

backfill();
