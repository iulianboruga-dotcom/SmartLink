-- Date de test SmartLink
-- Parola pentru toți: test123
-- Hash bcrypt generat cu saltRounds=12

-- ═══════════════════════════════════════════════════════════════════
-- UTILIZATORI PENTRU TESTELE DE ACCEPTANȚĂ
-- Parola: 123456 | hash bcrypt saltRounds=12
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO users (email, password_hash, role, first_name, last_name) VALUES
('doctor@smartlink.ro',  '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'doctor',  'Gheorghe', 'Ionescu'),
('pacient@smartlink.ro', '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'patient', 'Ana',      'Moldovan');

INSERT INTO doctors (user_id, specialization, clinic_name)
SELECT id, 'Cardiologie', 'Clinica Sanatatea Noastra'
FROM users WHERE email = 'doctor@smartlink.ro';

INSERT INTO patients (user_id, age, weight, height, blood_type)
SELECT id, 35, 65.0, 168.0, 'A+'
FROM users WHERE email = 'pacient@smartlink.ro';

-- Asociere doctor de test cu pacientul
INSERT INTO patient_doctor (patient_id, doctor_id)
SELECT p.id, d.id
FROM patients p
JOIN users up ON p.user_id = up.id
CROSS JOIN doctors d
JOIN users ud ON d.user_id = ud.id
WHERE ud.email = 'doctor@smartlink.ro'
  AND up.email = 'pacient@smartlink.ro';

-- Praguri default pentru pacient
INSERT INTO alarm_thresholds (patient_id, pulse_min, pulse_max, temp_min, temp_max, hum_min, hum_max)
SELECT p.id, 50, 120, 35.5, 38.0, 30.0, 70.0
FROM patients p JOIN users u ON p.user_id = u.id
WHERE u.email = 'pacient@smartlink.ro';

-- ═══════════════════════════════════════════════════════════════════

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

-- ═══════════════════════════════════════════════════════════════════
-- DATE ECG — ritm sinusal Ana Moldovan (patient_id=10)
-- 100 valori ADC 12-bit simulate la 100Hz (~1 secundă de semnal)
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO ecg_data (patient_id, ecg_values, recorded_at)
SELECT p.id,
  '[511,508,512,506,507,514,507,511,506,514,509,506,507,512,512,507,509,507,514,512,506,507,509,506,512,506,509,506,514,508,509,514,516,523,522,529,530,534,537,537,533,531,534,532,530,523,521,515,515,512,507,506,509,513,514,512,511,513,513,511,490,475,465,480,590,655,680,685,680,655,590,470,458,465,480,495,510,509,508,509,507,510,514,513,511,513,510,507,507,514,512,508,519,521,525,532,537,539,548,546,555,554,556,558,558,552,551,551,545,543,537,533,530,522,513,513,507,510,513,507,506,510,513,510,512,511,506,513,511,508,507,513,506,509,510,508,509,512,512,513,507,508,513,512,514,510,508,512,514,510,512,511,512,509,508,507,508,508,509,509,506,510,517,519,520,524,527,528,531,534,536,534,535,534,530,526,527,525,519,515,512,506,513,514,512,512,512,512,507,513,512,490,475,465,480,590,655,680,685,680,655,590,470,458,465,480,495,506,509,507,509,513,508,507,511,506,507,506,508,514,507,511,511,513,519,530,530,538,542,544,551,551,552,556,554,555,550,549,552,546,542,537,532,526,519,514,507,511,510,513,508,514,506,509,514,511,508,514,506,514,510,507,510,514,511,508,511,509,514,514,514,511,509,509,509,512,509,509,514,513,511,506,506,510,513,510,509,511,513,511,511,507,508,511,516,522,523,527,529,533,535,536,538,531,533,533,527,528,524,515,517,512,507,512,509,513,508,512,511,507,512,513,490,475,465,480,590,655,680,685,680,655,590,470,458,465,480,495,512,507,508,508,508,506,508,513,508,513,511,508,514,514,508,507,513,525,529,534,534,543,548,547,552,556,553,558,558,551,549,548,544,541,538,530,530,523,515,509,514,512,508,506,511,513,514,512,514,508,514,508,514,514,506,513,508,506,508,508,508,513,507,514,506,511,514,514,514,513,507,514,506,509,509,510,506,507,514,513,514,506,507,513,511,511,515,519,523,523,530,530,533,535,536,538,534,534,529,530,526,521,519,512,513,513,508,512,507,512,513,511,507,509,512,490,475,465,480,590,655,680,685,680,655,590,470,458,465,480,495,507,509,510,507,508,511,508,510,508,513,509,507,512,513,508,512,519,520,525,534,537,543,546,548,552,551,554,554,552,555,551,546,545,543,537,532,529,519,516,509,514,510,514,507,507,509,507,507,510,510,506,508,510,508,512,510,512,508,514,514,513,511,507,510,506,508,512,507,510,506,507,510,507,509,507,510,507,513,506,511,514,512,510,508,506,511,516,516,519,523,527,528,531,532,534,537,533,534,534,526,524,522,519,516,508,510,511,506,510,506,506,506,514,514,509,490,475,465,480,590,655,680,685,680,655,590,470,458,465,480,495,514,513,509,513,507,512,513,514,512,514,510,509,509,511,509,513,518,524,529,530,537,541,543,552,550,550,552,557,557,552,552,547,543,539,539,535,527,525,517,512,510,509,510,506,513,508,508,510,513,506,510,511,511,514,511]',
  DATEADD(HOUR, -1, GETDATE())
FROM patients p JOIN users u ON p.user_id = u.id WHERE u.email = 'pacient@smartlink.ro';
