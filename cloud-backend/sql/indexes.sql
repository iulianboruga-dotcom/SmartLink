-- Indexuri pentru performanță SmartLink

-- sensor_data: interogări frecvente după pacient + interval de timp
CREATE INDEX idx_sensor_data_patient_time
    ON sensor_data (patient_id, recorded_at DESC);

-- ecg_data: interogări frecvente după pacient + timp
CREATE INDEX idx_ecg_data_patient_time
    ON ecg_data (patient_id, recorded_at DESC);

-- accelerometer_data: interogări frecvente după pacient + timp
CREATE INDEX idx_accel_data_patient_time
    ON accelerometer_data (patient_id, recorded_at DESC);

-- alarm_history: interogări frecvente după pacient + timp
CREATE INDEX idx_alarm_history_patient_time
    ON alarm_history (patient_id, triggered_at DESC);

-- alarm_history: filtrare după acknowledged
CREATE INDEX idx_alarm_history_acknowledged
    ON alarm_history (acknowledged, triggered_at DESC);

-- users: unique pe email (deja creat prin UNIQUE constraint, dar explicit pentru claritate)
CREATE UNIQUE INDEX idx_users_email
    ON users (email);

-- patient_doctor: căutare pacienți după medic
CREATE INDEX idx_patient_doctor_doctor
    ON patient_doctor (doctor_id);
