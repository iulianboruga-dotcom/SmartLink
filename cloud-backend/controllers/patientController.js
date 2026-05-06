const { getPool, sql } = require('../config/db');
const bcrypt = require('bcrypt');

//POST /api/pacients/register
async function registerPatient(req, res, next) {

  // Creare conexiune si tranzactie SQL
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    // Pornire tranzactie
    await transaction.begin();

    const { email, password, firstName, lastName, age, weight, height, bloodType} = req.body;

    // Verificare daca emailul exista deja
    const existing = await new sql.Request(transaction)
        .input('email', sql.NVarChar, email)
        .query(` SELECT id FROM users WHERE email = @email `);

    // Daca emailul exista, se face rollback
    if (existing.recordset.length > 0) {

      await transaction.rollback();

      return res.status(409).json({
        error: 'Email deja folosit'
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Inserare user in tabela users
    const userResult = await new sql.Request(transaction)
        .input('email', sql.NVarChar, email)
        .input('passwordHash', sql.NVarChar, passwordHash)
        .input('firstName', sql.NVarChar, firstName)
        .input('lastName', sql.NVarChar, lastName)
        .query(`
        INSERT INTO users (email, password_hash, role, first_name, last_name)
        OUTPUT INSERTED.id, INSERTED.email, INSERTED.first_name, INSERTED.last_name
        VALUES ( @email, @passwordHash, 'patient',  @firstName,  @lastName
        )
      `);

    const user = userResult.recordset[0];
    // Inserare pacient in tabela patients
    const patientResult = await new sql.Request(transaction)
        .input('userId', sql.Int, user.id)
        .input('age', sql.Int, age)
        .input('weight', sql.Decimal(5, 2), weight)
        .input('height', sql.Decimal(5, 2), height)
        .input('bloodType', sql.NVarChar, bloodType)
        .query(`
        INSERT INTO patients ( user_id, age, weight, height, blood_type )
        OUTPUT INSERTED.id, INSERTED.age, INSERTED.weight, INSERTED.height, INSERTED.blood_type
        VALUES ( @userId, @age, @weight, @height, @bloodType ) `);

    // Confirmare tranzactie
    await transaction.commit();

    // Returnare date create
    res.status(201).json({
      user,
      patient: patientResult.recordset[0]
    });

  } catch (err) {
    // Rollback in caz de eroare
    if (!transaction._aborted) {
      await transaction.rollback();
    }

    next(err);
  }
}

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

// Verificare daca asocierea exista deja
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

// Eliminare asociere pacient-doctor
async function unassignDoctor(req, res, next) {
  try {
    const { patientId, doctorId } = req.body;
    const pool = await getPool();

    // Stergere asociere
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
module.exports = { registerPatient, getAll, getById, update, assignDoctor, unassignDoctor };
