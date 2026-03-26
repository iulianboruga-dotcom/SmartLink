# SmartLink — Instrucțiuni pentru Claude în VS Code
# Copiază acest fișier în conversația cu Claude din VS Code

---

## CONTEXT PROIECT

Lucrez la **SmartLink** — un sistem wearable de monitorizare a sănătății, proiect universitar (Inginerie Software, UPT).

**Repo GitHub:** https://github.com/iulianboruga-dotcom/SmartLink
**Branch:** main
**Deploy frontend:** Vercel (auto-deploy la push pe main, root directory: `web-frontend/`)
**Deploy backend API:** Azure App Service (auto-deploy la push pe main via GitHub Actions)
**Baza de date:** Azure SQL Database

### Arhitectura sistemului:
```
ESP32 (senzori) → BLE → Android App → HTTP → Azure API (Node.js/Express) → Azure SQL DB
                                                    ↑
                                        Web Dashboard (React) ← Vercel
```

### Structura repo-ului pe main:
```
SmartLink/
├── .github/workflows/main_smartlink-api.yml   ← GitHub Actions pentru Azure (EXISTĂ DEJA)
├── web-frontend/          ← Frontend React (deploy pe Vercel)
│   ├── public/
│   │   └── index.html     ← EXISTĂ DEJA
│   ├── src/
│   │   ├── index.js       ← EXISTĂ DEJA
│   │   └── App.js         ← EXISTĂ DEJA (placeholder)
│   └── package.json       ← EXISTĂ DEJA
└── cloud-backend/         ← Backend Node.js (deploy pe Azure) — TREBUIE CREAT
```

---

## TASK 1: FRONTEND REACT COMPLET (web-frontend/)

### Ce trebuie să faci:
Creează un dashboard medical complet în `web-frontend/` cu React + Material UI + Recharts.
NU modifica nimic din `cloud-backend/` sau `.github/` în acest task.

### Dependențe de instalat:
```bash
cd web-frontend
npm install @mui/material @mui/icons-material @emotion/react @emotion/styled
npm install react-router-dom
npm install recharts
npm install axios
```

### Funcționalități cerute:

**1. Sistem de Login (LoginPage.jsx)**
- Pagină de login cu email + parolă
- Toggle între "Medic" și "Pacient"
- Deocamdată folosește mock authentication (fără backend real):
  - medic@test.com / test123 → intră ca medic
  - pacient@test.com / test123 → intră ca pacient
- Salvează token-ul și rolul în localStorage
- Redirecționează la dashboard-ul corect după login

**2. Dashboard Medic (componente în src/components/doctor/)**
- **DoctorDashboard.jsx** — Pagina principală a medicului:
  - Lista de pacienți sub formă de card-uri
  - Fiecare card arată: nume, vârstă, ultimul puls, ultima temperatură, status (Normal/Atenție/Critic)
  - Search bar pentru filtrare după nume
  - Sort după nume/status
  - Click pe card → deschide fișa pacientului
  
- **PatientFile.jsx** — Fișa detaliată a unui pacient:
  - Date personale (nume, vârstă, greutate, înălțime)
  - Grafice senzori (ultimele 24h)
  - Vizualizare ECG
  - Alarme active
  - Recomandări

- **SensorHistoryCharts.jsx** — Grafice cu Recharts:
  - LineChart pentru puls (ultimele 24h, o citire la 30s)
  - LineChart pentru temperatură
  - LineChart pentru umiditate
  - Fiecare grafic are ReferenceLine pentru pragurile de alarmă
  - Toggle între tipuri de senzori
  - DatePicker pentru selectare interval

- **ECGViewer.jsx** — Vizualizare ECG:
  - Fundal negru/închis
  - Linie verde (ca pe un monitor medical real)
  - Grafic LineChart cu date ECG (100 puncte)
  - Animație de scrolling (opțional)

- **AlarmThresholdForm.jsx** — Setare praguri alarme:
  - Slider pentru: puls minim, puls maxim, temperatură minimă, temperatură maximă, umiditate
  - Buton salvare
  - Afișare valori curente

- **AlarmHistory.jsx** — Tabel cu istoricul alarmelor:
  - Coloane: data/ora, tip alarmă, valoare măsurată, prag depășit, status
  - Sortare după dată
  - Filtru după tip

- **RecommendationsManager.jsx** — Gestionare recomandări:
  - Lista recomandărilor existente
  - Formular pentru adăugare recomandare nouă (text + prioritate)
  - Buton ștergere

- **DoctorNavbar.jsx** — Navbar:
  - Logo SmartLink
  - Link-uri: Dashboard, Alarme, Profil
  - Buton Logout

**3. Dashboard Pacient (componente în src/components/patient/)**
- **PatientDashboard.jsx** — Pagina principală pacient:
  - 4 card-uri mari cu valorile curente: Puls, Temperatură, Umiditate, ECG status
  - Fiecare card are culoare diferită și icon
  - Sub card-uri: grafice mici (sparkline) cu trendul ultimelor ore
  - Indicator status general (Normal/Atenție)

- **PulseChart.jsx** — Grafic puls detaliat (Recharts LineChart)
- **TemperatureChart.jsx** — Grafic temperatură detaliat
- **HumidityChart.jsx** — Grafic umiditate detaliat
- **ECGChart.jsx** — Grafic ECG (fundal închis, linie verde)

- **PatientProfile.jsx** — Profilul pacientului:
  - Date personale (readonly)
  - Medicul asociat
  - Dispozitivul asociat (ESP32 ID)

- **PatientRecommendations.jsx** — Recomandările primite de la medic:
  - Lista de recomandări cu data și prioritate
  - Status: citită/necitită

- **PatientAlarms.jsx** — Istoricul alarmelor pacientului:
  - Tabel similar cu cel al medicului dar filtrat doar pentru acest pacient

- **PatientNavbar.jsx** — Navbar pacient:
  - Logo SmartLink
  - Link-uri: Dashboard, Recomandări, Alarme, Profil
  - Buton Logout

**4. Routing (App.js)**
```
/ → LoginPage
/doctor → DoctorDashboard (protejat, doar rol medic)
/doctor/patient/:id → PatientFile
/doctor/alarms → AlarmsConfig (toate alarmele)
/patient → PatientDashboard (protejat, doar rol pacient)
/patient/recommendations → PatientRecommendations
/patient/alarms → PatientAlarms
/patient/profile → PatientProfile
```

**5. Mock Data (src/mockData.js)**
Creează date false realiste:
- 3 pacienți cu date complete
- 48 de citiri senzori per pacient (ultimele 24h, la fiecare 30 min)
- 100 de puncte ECG per pacient (valori realiste între 400-700)
- 5 alarme per pacient (mixte: puls ridicat, temperatură, etc.)
- 3 recomandări per pacient
- Praguri de alarmă per pacient:
  - Puls: min 50, max 120 BPM
  - Temperatură: min 35.5, max 38.0 °C
  - Umiditate: min 30, max 70 %

**6. API Service (src/api.js)**
Creează un modul care:
- Are funcții pentru toate operațiile (getPatients, getSensorData, postAlarm, etc.)
- Deocamdată returnează mock data (importă din mockData.js)
- Are comentarii `// TODO: înlocuiește cu fetch real la API` la fiecare funcție
- Structura pregătită pentru a conecta la backend real mai târziu:
```javascript
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
```

**7. Protected Routes (src/components/ProtectedRoute.jsx)**
- Verifică dacă user-ul e autentificat (token în localStorage)
- Verifică rolul (medic/pacient)
- Redirecționează la login dacă nu e autentificat

### Design:
- Folosește **Material UI** pentru componente (Card, TextField, Button, Table, Slider, AppBar, Drawer, etc.)
- Tema: tonuri de **albastru medical** (#1976d2 principal) + **alb** + accente **verzi** pentru valori normale și **roșu** pentru alarme
- Responsive (desktop + mobil)
- Dark mode pentru ECG viewer
- Font: Roboto (default Material UI)
- Card-uri cu shadow ușor, border-radius 12px
- Spacing consistent (8px grid)

### Structura finală fișiere frontend:
```
web-frontend/
├── public/
│   └── index.html
├── src/
│   ├── index.js
│   ├── App.js                          ← Routing + Theme
│   ├── api.js                          ← API service (mock deocamdată)
│   ├── mockData.js                     ← Date false realiste
│   ├── components/
│   │   ├── LoginPage.jsx
│   │   ├── ProtectedRoute.jsx
│   │   ├── doctor/
│   │   │   ├── DoctorNavbar.jsx
│   │   │   ├── DoctorDashboard.jsx
│   │   │   ├── PatientFile.jsx
│   │   │   ├── SensorHistoryCharts.jsx
│   │   │   ├── ECGViewer.jsx
│   │   │   ├── AlarmThresholdForm.jsx
│   │   │   ├── AlarmHistory.jsx
│   │   │   └── RecommendationsManager.jsx
│   │   └── patient/
│   │       ├── PatientNavbar.jsx
│   │       ├── PatientDashboard.jsx
│   │       ├── PulseChart.jsx
│   │       ├── TemperatureChart.jsx
│   │       ├── HumidityChart.jsx
│   │       ├── ECGChart.jsx
│   │       ├── PatientProfile.jsx
│   │       ├── PatientRecommendations.jsx
│   │       └── PatientAlarms.jsx
│   └── theme.js                        ← Material UI theme customization
└── package.json
```

---

## TASK 2: STRUCTURA BACKEND (cloud-backend/)

### Ce trebuie să faci:
Creează DOAR structura de fișiere și codul pentru backend-ul Node.js + Express în `cloud-backend/`.
NU modifica nimic din `web-frontend/` în acest task.

### Structura fișiere:
```
cloud-backend/
├── package.json
├── server.js                    ← Entry point Express
├── .env.example                 ← Exemplu variabile de mediu (fără valori reale!)
├── config/
│   └── db.js                    ← Conexiune Azure SQL (mssql package)
├── middleware/
│   ├── auth.js                  ← JWT verificare + requireRole
│   └── validate.js              ← Validare input (express-validator)
├── routes/
│   ├── authRoutes.js            ← /api/auth/register, /api/auth/login
│   ├── patientRoutes.js         ← /api/patients CRUD
│   ├── sensorRoutes.js          ← /api/sensors (primire date + istoric)
│   ├── alarmRoutes.js           ← /api/alarms (primire + istoric + praguri)
│   ├── recommendationRoutes.js  ← /api/recommendations CRUD
│   └── doctorRoutes.js          ← /api/doctors
├── controllers/
│   ├── authController.js        ← register (bcrypt) + login (JWT)
│   ├── patientController.js
│   ├── sensorController.js
│   ├── alarmController.js
│   ├── recommendationController.js
│   └── doctorController.js
└── sql/
    ├── schema.sql               ← CREATE TABLE (11 tabele)
    ├── indexes.sql              ← CREATE INDEX
    └── seed.sql                 ← Date de test
```

### Dependențe (package.json):
```json
{
  "name": "smartlink-api",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mssql": "^10.0.1",
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express-validator": "^7.0.1",
    "helmet": "^7.1.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

### server.js:
- Express app pe PORT din env (default 8080)
- Middleware: cors (permite origin-ul Vercel + localhost), helmet, express.json
- Montare routes: /api/auth, /api/patients, /api/sensors, /api/alarms, /api/recommendations, /api/doctors
- Endpoint /api/health care returnează { status: "ok", timestamp: Date.now() }
- Error handling middleware global

### config/db.js:
- Folosește pachetul `mssql`
- Citește din env: DB_SERVER, DB_NAME, DB_USER, DB_PASSWORD
- Pool de conexiuni cu retry logic
- Export: getPool() function

### middleware/auth.js:
- verifyToken: decodifică JWT din header Authorization: Bearer <token>
- requireRole('doctor'): verifică rolul din token
- requireRole('patient'): verifică rolul din token

### middleware/validate.js:
- Validare pentru register: email valid, parolă min 6 chars, rol obligatoriu
- Validare pentru sensor data: pulse/temperature/humidity sunt numere în range valid
- Validare pentru alarm thresholds: valori numerice pozitive

### controllers/authController.js:
- register: primește {email, password, role, firstName, lastName}, hash parolă cu bcrypt, inserează în DB, returnează user fără parolă
- login: primește {email, password}, verifică bcrypt, generează JWT cu {userId, role, email}, returnează {token, user}

### controllers/sensorController.js:
- receiveSensorData: POST primește {patientId, pulse, temperature, humidity}, inserează în sensor_data
- receiveECG: POST primește {patientId, values[]}, inserează în ecg_data
- receiveAccelerometer: POST primește {patientId, values[]}, inserează în accelerometer_data
- getHistory: GET cu query params (patientId, startDate, endDate), returnează citiri

### controllers/alarmController.js:
- reportAlarm: POST primește {patientId, type, value, threshold}, inserează în alarm_history
- getThresholds: GET returnează praguri pentru un pacient
- upsertThresholds: PUT inserează sau actualizează praguri (INSERT ... ON CONFLICT UPDATE)
- getHistory: GET returnează istoric alarme

### controllers/patientController.js:
- getAll: GET returnează toți pacienții medicului logat (JOIN cu patient_doctor)
- getById: GET returnează detalii pacient cu ultima citire senzor (subquery)
- update: PUT actualizează date pacient

### controllers/recommendationController.js:
- create: POST crează recomandare nouă
- getByPatient: GET returnează recomandările unui pacient
- delete: DELETE șterge o recomandare

### sql/schema.sql — 11 tabele:
```sql
-- 1. users: id, email, password_hash, role('doctor'/'patient'), first_name, last_name, created_at
-- 2. doctors: id, user_id(FK), specialization, clinic_name
-- 3. patients: id, user_id(FK), age, weight, height, blood_type
-- 4. patient_doctor: id, patient_id(FK), doctor_id(FK), assigned_at (UNIQUE patient+doctor)
-- 5. device_associations: id, patient_id(FK), device_id(VARCHAR), paired_at
-- 6. sensor_data: id, patient_id(FK), pulse(INT), temperature(DECIMAL), humidity(DECIMAL), recorded_at
-- 7. ecg_data: id, patient_id(FK), values(NVARCHAR MAX - JSON array), recorded_at
-- 8. accelerometer_data: id, patient_id(FK), values(NVARCHAR MAX - JSON array), recorded_at
-- 9. alarm_thresholds: id, patient_id(FK UNIQUE), pulse_min, pulse_max, temp_min, temp_max, hum_min, hum_max, updated_at
-- 10. alarm_history: id, patient_id(FK), alarm_type, measured_value, threshold_value, triggered_at, acknowledged(BIT)
-- 11. recommendations: id, patient_id(FK), doctor_id(FK), text, priority('low'/'medium'/'high'), created_at
```

### sql/indexes.sql:
- sensor_data: index pe (patient_id, recorded_at)
- ecg_data: index pe (patient_id, recorded_at)
- alarm_history: index pe (patient_id, triggered_at)
- users: unique index pe email

### sql/seed.sql:
- 1 medic (doctor@test.com / test123 — parolă bcrypt hash)
- 3 pacienți (pacient1@test.com, pacient2@test.com, pacient3@test.com / test123)
- Asocieri medic-pacient
- 48 citiri senzori per pacient (ultimele 24h)
- 5 alarme per pacient
- 3 recomandări per pacient
- Praguri alarmă default

### .env.example:
```
PORT=8080
DB_SERVER=smartlink-sql-server.database.windows.net
DB_NAME=smartlink-db
DB_USER=smartlinkadmin
DB_PASSWORD=your_password_here
JWT_SECRET=your_secret_here
CORS_ORIGIN=https://your-vercel-url.vercel.app
```

### CORS important în server.js:
```javascript
app.use(cors({
  origin: [
    process.env.CORS_ORIGIN,
    'http://localhost:3000'
  ],
  credentials: true
}));
```

---

## REGULI IMPORTANTE

1. **Fiecare task separat** — nu amesteca fișiere frontend cu backend
2. **Mock data primul** — frontend-ul trebuie să funcționeze complet fără backend
3. **Comentarii în română** unde e relevant, cod în engleză
4. **Nu pune credențiale reale** în cod — doar .env.example cu placeholder-uri
5. **Testează local** înainte de push:
   - Frontend: `cd web-frontend && npm start` → http://localhost:3000
   - Backend: `cd cloud-backend && npm run dev` → http://localhost:8080/api/health
6. **Nu modifica** `.github/workflows/main_smartlink-api.yml`
7. **Package-lock.json** — lasă-l să se genereze automat la npm install

---

## ORDINEA DE LUCRU

1. **ÎNTÂI:** Instalează dependențele frontend: `cd web-frontend && npm install @mui/material @mui/icons-material @emotion/react @emotion/styled react-router-dom recharts axios`
2. **Apoi:** Creează toate fișierele frontend conform structurii de mai sus
3. **Testează:** `npm start` — trebuie să meargă login + ambele dashboard-uri cu mock data
4. **După:** Creează structura cloud-backend/ cu toate fișierele
5. **Testează:** `cd cloud-backend && npm install && npm run dev` — /api/health trebuie să răspundă

---

## NOTĂ PENTRU CLAUDE ÎN VS CODE

Ești în repo-ul SmartLink. Lucrezi pe branch-ul `main`. 
- Fișierele frontend merg în `web-frontend/`
- Fișierele backend merg în `cloud-backend/`
- NU șterge fișierele existente, doar adaugă/modifică
- Când creezi fișiere noi, creează-le direct cu conținut complet, nu placeholder-uri
- Dacă ai dubii, întreabă înainte de a modifica
