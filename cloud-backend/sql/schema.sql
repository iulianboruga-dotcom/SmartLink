-- Schema baza de date SmartLink
-- Azure SQL Database (SQL Server)

-- 1. Utilizatori (medici și pacienți)
CREATE TABLE users (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    email         NVARCHAR(255) NOT NULL UNIQUE,
    password_hash NVARCHAR(255) NOT NULL,
    role          NVARCHAR(10)  NOT NULL CHECK (role IN ('doctor', 'patient')),
    first_name    NVARCHAR(100) NOT NULL,
    last_name     NVARCHAR(100) NOT NULL,
    created_at    DATETIME2     DEFAULT GETDATE()
);

-- 2. Medici (extinde users)
CREATE TABLE doctors (
    id             INT IDENTITY(1,1) PRIMARY KEY,
    user_id        INT           NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    specialization NVARCHAR(100),
    clinic_name    NVARCHAR(200),
    created_at    DATETIME2     DEFAULT GETDATE()
);

-- 3. Pacienți (extinde users)
CREATE TABLE patients (
    id         INT IDENTITY(1,1) PRIMARY KEY,
    user_id    INT           NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    age        INT,
    weight     DECIMAL(5,2),
    height     DECIMAL(5,2),
    blood_type NVARCHAR(5),
    created_at    DATETIME2     DEFAULT GETDATE()
);

-- 4. Asociere pacient-medic
CREATE TABLE patient_doctor (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    patient_id  INT       NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id   INT       NOT NULL REFERENCES doctors(id),
    assigned_at DATETIME2 DEFAULT GETDATE(),
    UNIQUE (patient_id, doctor_id),
    created_at    DATETIME2     DEFAULT GETDATE()
);

-- 5. Asociere pacient-dispozitiv ESP32
CREATE TABLE device_associations (
    id         INT IDENTITY(1,1) PRIMARY KEY,
    patient_id INT           NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    device_id  NVARCHAR(50)  NOT NULL,
    paired_at  DATETIME2     DEFAULT GETDATE(),
    created_at    DATETIME2     DEFAULT GETDATE()
);

-- 6. Date senzori (puls, temperatură, umiditate)
CREATE TABLE sensor_data (
    id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    patient_id  INT            NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    pulse       INT            NOT NULL,
    temperature DECIMAL(5,2)   NOT NULL,
    humidity    DECIMAL(5,2)   NOT NULL,
    recorded_at DATETIME2      DEFAULT GETDATE(),
    created_at    DATETIME2     DEFAULT GETDATE()
);

-- 7. Date ECG (array JSON)
CREATE TABLE ecg_data (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    patient_id  INT           NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    ecg_values      NVARCHAR(MAX) NOT NULL,  -- JSON array de valori
    recorded_at DATETIME2     DEFAULT GETDATE(),
    created_at    DATETIME2     DEFAULT GETDATE()
);

-- 8. Date accelerometru (array JSON)
CREATE TABLE accelerometer_data (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    patient_id  INT           NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    accel_values      NVARCHAR(MAX) NOT NULL,  -- JSON array de valori
    recorded_at DATETIME2     DEFAULT GETDATE(),
    created_at    DATETIME2     DEFAULT GETDATE()
);

-- 9. Praguri alarme per pacient (un singur rând per pacient)
CREATE TABLE alarm_thresholds (
    id         INT IDENTITY(1,1) PRIMARY KEY,
    patient_id INT          NOT NULL UNIQUE REFERENCES patients(id) ON DELETE CASCADE,
    pulse_min  INT          NOT NULL DEFAULT 50,
    pulse_max  INT          NOT NULL DEFAULT 120,
    temp_min   DECIMAL(5,2) NOT NULL DEFAULT 35.5,
    temp_max   DECIMAL(5,2) NOT NULL DEFAULT 38.0,
    hum_min    DECIMAL(5,2) NOT NULL DEFAULT 30.0,
    hum_max    DECIMAL(5,2) NOT NULL DEFAULT 70.0,
    updated_at DATETIME2    DEFAULT GETDATE(),
    created_at    DATETIME2     DEFAULT GETDATE()
);

-- 10. Istoricul alarmelor
CREATE TABLE alarm_history (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    patient_id      INT          NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    alarm_type      NVARCHAR(20) NOT NULL,  -- PULSE_HIGH, TEMP_LOW, 'HUM_HIGH' etc.
    measured_value  DECIMAL(10,2) NOT NULL,
    threshold_value DECIMAL(10,2) NOT NULL,
    triggered_at    DATETIME2    DEFAULT GETDATE(),
    acknowledged    BIT          NOT NULL DEFAULT 0,
    created_at    DATETIME2     DEFAULT GETDATE()
);

-- 11. Recomandări de la medic
CREATE TABLE recommendations (
    id         INT IDENTITY(1,1) PRIMARY KEY,
    patient_id INT           NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id  INT           NOT NULL REFERENCES doctors(id),
    reco_text       NVARCHAR(MAX) NOT NULL,
    priority   NVARCHAR(10)  NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    created_at DATETIME2     DEFAULT GETDATE()
);
