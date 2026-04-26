const { sql } = require('../config/db');

//Helper verificare existenta pacient
async function patientExists(pool, patientId) {
    const result = await pool.request()
        .input('patientId', sql.Int, patientId)
        .query(`
      SELECT id
      FROM patients
      WHERE id = @patientId
    `);

    return result.recordset.length > 0;
}

module.exports = { patientExists };