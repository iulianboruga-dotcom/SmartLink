-- Date de test SmartLink
-- Parola pentru toți: test123
-- Hash bcrypt generat cu saltRounds=12

-- 1. Utilizatori
INSERT INTO users (email, password_hash, role, first_name, last_name) VALUES
('medic@test.com',     '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4oY.GiWQoS', 'doctor',  'Alexandru', 'Ionescu'),
('pacient1@test.com',  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4oY.GiWQoS', 'patient', 'Maria',     'Popescu'),
('pacient2@test.com',  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4oY.GiWQoS', 'patient', 'Ion',       'Dumitrescu'),
('pacient3@test.com',  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4oY.GiWQoS', 'patient', 'Elena',     'Constantin');

-- 2. Medic
INSERT INTO doctors (user_id, specialization, clinic_name)
SELECT id, 'Cardiologie', 'Spitalul Clinic UPT' FROM users WHERE email = 'medic@test.com';

-- 3. Pacienți
INSERT INTO patients (user_id, age, weight, height, blood_type)
SELECT id, 45, 68.0, 165.0, 'A+' FROM users WHERE email = 'pacient1@test.com';

INSERT INTO patients (user_id, age, weight, height, blood_type)
SELECT id, 62, 85.0, 178.0, 'O-' FROM users WHERE email = 'pacient2@test.com';

INSERT INTO patients (user_id, age, weight, height, blood_type)
SELECT id, 38, 58.0, 162.0, 'B+' FROM users WHERE email = 'pacient3@test.com';

-- 4. Asocieri medic-pacient
INSERT INTO patient_doctor (patient_id, doctor_id)
SELECT p.id, d.id FROM patients p
JOIN users up ON p.user_id = up.id
CROSS JOIN doctors d
JOIN users ud ON d.user_id = ud.id
WHERE ud.email = 'medic@test.com'
  AND up.email IN ('pacient1@test.com', 'pacient2@test.com', 'pacient3@test.com');

-- 5. Dispozitive ESP32
INSERT INTO device_associations (patient_id, device_id)
SELECT p.id, 'ESP32-A1B2C3' FROM patients p JOIN users u ON p.user_id = u.id WHERE u.email = 'pacient1@test.com';

INSERT INTO device_associations (patient_id, device_id)
SELECT p.id, 'ESP32-D4E5F6' FROM patients p JOIN users u ON p.user_id = u.id WHERE u.email = 'pacient2@test.com';

INSERT INTO device_associations (patient_id, device_id)
SELECT p.id, 'ESP32-G7H8I9' FROM patients p JOIN users u ON p.user_id = u.id WHERE u.email = 'pacient3@test.com';

-- 6. Praguri alarme default
INSERT INTO alarm_thresholds (patient_id, pulse_min, pulse_max, temp_min, temp_max, hum_min, hum_max)
SELECT p.id, 50, 120, 35.5, 38.0, 30.0, 70.0
FROM patients p JOIN users u ON p.user_id = u.id
WHERE u.email IN ('pacient1@test.com', 'pacient2@test.com', 'pacient3@test.com');

-- 7. Citiri senzori — 48 per pacient (ultimele 24h, la fiecare 30 minute)
-- Pacient 1 (Maria Popescu) — puls ~78 bpm, temp ~36.8°C
DECLARE @i INT = 0;
DECLARE @p1 INT = (SELECT p.id FROM patients p JOIN users u ON p.user_id = u.id WHERE u.email = 'pacient1@test.com');
DECLARE @p2 INT = (SELECT p.id FROM patients p JOIN users u ON p.user_id = u.id WHERE u.email = 'pacient2@test.com');
DECLARE @p3 INT = (SELECT p.id FROM patients p JOIN users u ON p.user_id = u.id WHERE u.email = 'pacient3@test.com');

WHILE @i < 48
BEGIN
    INSERT INTO sensor_data (patient_id, pulse, temperature, humidity, recorded_at) VALUES
    (@p1, 75 + (@i % 10) - 5,  36.5 + ((@i % 5) * 0.1),  48 + (@i % 15), DATEADD(MINUTE, -1440 + (@i * 30), GETDATE())),
    (@p2, 92 + (@i % 12) - 6,  37.2 + ((@i % 4) * 0.2),  52 + (@i % 12), DATEADD(MINUTE, -1440 + (@i * 30), GETDATE())),
    (@p3, 63 + (@i % 8)  - 4,  36.3 + ((@i % 6) * 0.1),  45 + (@i % 18), DATEADD(MINUTE, -1440 + (@i * 30), GETDATE()));
    SET @i = @i + 1;
END;

-- 8. Alarme (5 per pacient)
INSERT INTO alarm_history (patient_id, alarm_type, measured_value, threshold_value, triggered_at, acknowledged) VALUES
(@p1, 'PULSE_HIGH', 128, 120, DATEADD(HOUR, -2,  GETDATE()), 0),
(@p1, 'TEMP_HIGH',  38.4, 38.0, DATEADD(HOUR, -6, GETDATE()), 1),
(@p1, 'PULSE_LOW',  46,  50,   DATEADD(HOUR, -12, GETDATE()), 1),
(@p1, 'PULSE_HIGH', 135, 120,  DATEADD(HOUR, -18, GETDATE()), 1),
(@p1, 'HUM_LOW',    24,  30,   DATEADD(HOUR, -23, GETDATE()), 1),

(@p2, 'PULSE_HIGH', 138, 120,  DATEADD(HOUR, -1,  GETDATE()), 0),
(@p2, 'TEMP_HIGH',  38.7, 38.0, DATEADD(HOUR, -3, GETDATE()), 0),
(@p2, 'PULSE_HIGH', 142, 120,  DATEADD(HOUR, -8,  GETDATE()), 1),
(@p2, 'TEMP_HIGH',  39.1, 38.0, DATEADD(HOUR, -15,GETDATE()), 1),
(@p2, 'HUM_HIGH',   76,  70,   DATEADD(HOUR, -20, GETDATE()), 1),

(@p3, 'PULSE_LOW',  44,  50,   DATEADD(HOUR, -4,  GETDATE()), 0),
(@p3, 'TEMP_LOW',   35.2, 35.5, DATEADD(HOUR,-9,  GETDATE()), 1),
(@p3, 'PULSE_HIGH', 124, 120,  DATEADD(HOUR, -14, GETDATE()), 1),
(@p3, 'HUM_LOW',    27,  30,   DATEADD(HOUR, -19, GETDATE()), 1),
(@p3, 'TEMP_HIGH',  38.2, 38.0, DATEADD(HOUR,-22, GETDATE()), 1);

-- 9. Recomandări (3 per pacient)
INSERT INTO recommendations (patient_id, doctor_id, reco_text, priority, created_at)
SELECT @p1, d.id, 'Reduceți consumul de sare și grăsimi saturate. Dieta DASH recomandată.', 'high',   DATEADD(DAY, -5, GETDATE())
FROM doctors d JOIN users u ON d.user_id = u.id WHERE u.email = 'medic@test.com';

INSERT INTO recommendations (patient_id, doctor_id, reco_text, priority, created_at)
SELECT @p1, d.id, 'Exerciții fizice moderate: 30 minute de mers pe jos zilnic.', 'medium', DATEADD(DAY, -3, GETDATE())
FROM doctors d JOIN users u ON d.user_id = u.id WHERE u.email = 'medic@test.com';

INSERT INTO recommendations (patient_id, doctor_id, reco_text, priority, created_at)
SELECT @p1, d.id, 'Consultație de control programată pentru săptămâna viitoare.', 'low',    DATEADD(DAY, -1, GETDATE())
FROM doctors d JOIN users u ON d.user_id = u.id WHERE u.email = 'medic@test.com';

INSERT INTO recommendations (patient_id, doctor_id, reco_text, priority, created_at)
SELECT @p2, d.id, 'Medicație antihipertensivă: Amlodipina 5mg/zi dimineața.', 'high',    DATEADD(DAY, -7, GETDATE())
FROM doctors d JOIN users u ON d.user_id = u.id WHERE u.email = 'medic@test.com';

INSERT INTO recommendations (patient_id, doctor_id, reco_text, priority, created_at)
SELECT @p2, d.id, 'Monitorizare tensiune arterială de 2 ori pe zi.', 'high',             DATEADD(DAY, -4, GETDATE())
FROM doctors d JOIN users u ON d.user_id = u.id WHERE u.email = 'medic@test.com';

INSERT INTO recommendations (patient_id, doctor_id, reco_text, priority, created_at)
SELECT @p2, d.id, 'Reducerea stresului: tehnici de respirație și meditație.', 'medium',  DATEADD(DAY, -2, GETDATE())
FROM doctors d JOIN users u ON d.user_id = u.id WHERE u.email = 'medic@test.com';

INSERT INTO recommendations (patient_id, doctor_id, reco_text, priority, created_at)
SELECT @p3, d.id, 'Hidratare corespunzătoare: minim 2 litri de apă pe zi.', 'medium',   DATEADD(DAY, -6, GETDATE())
FROM doctors d JOIN users u ON d.user_id = u.id WHERE u.email = 'medic@test.com';

INSERT INTO recommendations (patient_id, doctor_id, reco_text, priority, created_at)
SELECT @p3, d.id, 'Somn regulat: 7-8 ore pe noapte, program fix.', 'low',               DATEADD(DAY, -3, GETDATE())
FROM doctors d JOIN users u ON d.user_id = u.id WHERE u.email = 'medic@test.com';

INSERT INTO recommendations (patient_id, doctor_id, reco_text, priority, created_at)
SELECT @p3, d.id, 'Evitați efortul fizic intens în perioadele de temperaturi extreme.', 'medium', DATEADD(DAY, -1, GETDATE())
FROM doctors d JOIN users u ON d.user_id = u.id WHERE u.email = 'medic@test.com';
