<div align="center">

# 🫀 SmartLink — *Vital Connection*

**Sistem wearable de monitorizare a sănătății în timp real**
ESP32 + Android + Web (React) + Cloud (Azure)

[🇷🇴 Română](#-română) · [🇬🇧 English](#-english) · [🇪🇸 Español](#-español)

**Web:** [smart-link-wine.vercel.app](https://smart-link-wine.vercel.app) · **API:** [smartlink-api.azurewebsites.net/api](https://smartlink-api.azurewebsites.net/api) · **Landing:** [iulianboruga-dotcom.github.io/SmartLink](https://iulianboruga-dotcom.github.io/SmartLink)

*TechNova Solutions — proiect academic, UPT, Inginerie Software*

</div>

---

## 🇷🇴 Română

### Despre proiect
SmartLink este un sistem complet de monitorizare la distanță a pacienților cu afecțiuni cronice. Un dispozitiv purtabil bazat pe ESP32 citește semnale vitale (ECG, puls, temperatură, umiditate), le trimite prin Bluetooth LE către o aplicație Android, care le sincronizează în cloud (Azure). Medicul vede datele în timp real într-un dashboard web, primește alarme automate la depășirea pragurilor și gestionează pacienții și recomandările.

### Arhitectura sistemului
```
ESP32 (senzori) ──BLE──▶ Android App ──HTTPS/REST──▶ Azure API (Node.js) ──SQL──▶ Azure SQL
                                                          ▲                          │
                              Web Medic (React) ──REST/JWT─┘  ◀──────SQL─────────────┘
```
1. ESP32 citește senzorii și emite pe BLE.
2. Android primește datele (BLE) și le trimite în cloud prin HTTP.
3. API-ul Express validează și salvează în Azure SQL.
4. Dashboard-ul web (React) citește prin REST și afișează grafice, alarme, recomandări.

### Branch-uri (un singur repo, branch-uri separate pe componente)
| Branch | Conținut |
|--------|----------|
| **`main`** | Web frontend + backend cloud (folderele `web-frontend/` și `cloud-backend/`). Deploy automat: Vercel (web) + Azure (API). |
| **`android-app`** | Aplicația Android (Kotlin), pachet `com.example.smartlink_multi`. |
| **`esp32-firmware`** | Firmware-ul Arduino C++ pentru ESP32. |

> **Regulă:** nu se amestecă branch-urile în același folder de lucru. Fiecare componentă trăiește pe branch-ul ei.
> Branch-uri auxiliare/istorice: `web-frontend`, `cloud-backend` (versiuni timpurii), `learning` (exercițiu), `gh-pages` (landing).

### Structura folderelor
```
main/
├── cloud-backend/              # API REST — Node.js + Express
│   ├── controllers/            # authController, patientController, sensorController, ...
│   ├── routes/                 # authRoutes, patientRoutes, sensorRoutes, ...
│   ├── sql/                    # schema + seed
│   └── server.js
├── web-frontend/               # Dashboard medic — React 18 + Material UI + Recharts
│   ├── src/
│   │   ├── components/
│   │   │   └── doctor/         # DoctorDashboard, PatientFile, ECGViewer, SchedulePage, ...
│   │   ├── api.js              # stratul de comunicare cu API-ul (+ snakeToCamel)
│   │   └── App.js
│   └── package.json
└── .github/workflows/          # main_smartlink-api.yml (auto-deploy Azure)

android-app/
└── app/src/main/java/com/example/smartlink_multi/
    ├── MainActivity.kt         # BLE + ViewPager2 (taburi: ECG / Senzori / Alarme / Setări)
    └── data/                   # network (Retrofit/ApiService), dto, repository, prefs (sesiune JWT)

esp32-firmware/
└── SmartLink_ECG_BLE/          # sketch Arduino (.ino): citire senzori + BLE
```

### Stack tehnic
- **Hardware:** ESP32-S3 · AD8232 (ECG) · DHT22 (temperatură/umiditate ambientală) · senzor puls optic (MAX30102) · senzor temperatură de contact (MAX30205 / DS18B20). Cost componente ≈ **€42.59**/dispozitiv.
- **Firmware:** Arduino C++ · BLE (HM-10 style, serviciu FFE0).
- **Mobile:** Android (Kotlin) · ViewPager2 · Retrofit · sesiune JWT (SharedPreferences).
- **Backend:** Node.js · Express 4 · JWT · bcrypt · Azure SQL (mssql).
- **Frontend:** React 18 · Material UI · Recharts.
- **Deploy:** Vercel (web) · Azure App Service F1 (API) · Azure SQL.

### Contract BLE (firmware ↔ Android)
```
Nume dispozitiv: "SmartLink-ECG"
Service:  FFE0  (0000ffe0-0000-1000-8000-00805f9b34fb)
FFE1 (status, ~1s, NOTIFY): JSON {"leadOff":bool,"temp":float,"hum":float,"bpm":int}
FFE2 (ECG, NOTIFY): întregi ADC despărțiți prin virgulă, ~8-10 eșantioane/pachet, 100 Hz
MTU: 100
```

### Credențiale demo
| Rol | Email | Parolă |
|-----|-------|--------|
| Medic | `doctor@smartlink.ro` | `123456` |
| Pacient | `pacient@smartlink.ro` | `123456` |

### Teste de acceptanță (24)
**Categoria 1 — Fișe pacienți (web medic)**
- 3.1.1 Login medic cu credențiale · 3.1.2 Înregistrare publică doctor/pacient · 3.1.3 Listare pacienți ai medicului logat · 3.1.4 Vizualizare fișă pacient

**Categoria 2 — Valori pacient (Android + cloud)**
- 3.2.1 Login pacient pe Android (backend real) · 3.2.2 Citire date BLE de la ESP32 · 3.2.3 Sincronizare în cloud la 30s · 3.2.4 Afișare alarme din cloud · 3.2.5 Notificări push locale

**Categoria 3 — Wearable ESP32**
- 3.3.1 Pornire + advertising BLE · 3.3.2 Conectare telefon–ESP32 · 3.3.3 Citire continuă senzori · 3.3.4 Transmisie ECG 100 val/s · 3.3.5 Persistare în cloud

**Categoria 4 — Urmărire medic (web)**
- 3.4.1 Grafic puls în timp real · 3.4.2 Grafic temperatură + umiditate · 3.4.3 Vizualizare ECG istoric · 3.4.4 Filtre după dată

**Categoria 5 — Rapoarte + acțiuni medic**
- 3.5.1 Configurare praguri alarme · 3.5.2 Detecție automată alarme · 3.5.3 Istoric alarme cu filtrare · 3.5.4 Recomandări pe Android* · 3.5.5 Creare recomandare · 3.5.6 Modificare/ștergere recomandare

> \*3.5.4: recomandările există în baza de date și în dashboard-ul medicului; afișarea pe Android e o extensie planificată.

### Rulare locală
```bash
# Backend (branch main)
cd cloud-backend && npm install && npm start          # necesită .env cu credențiale Azure SQL + JWT_SECRET

# Frontend (branch main)
cd web-frontend && npm install && npm run dev          # REACT_APP_API_URL → URL-ul API-ului

# Android (branch android-app): deschide în Android Studio, build & run
# Firmware (branch esp32-firmware): deschide .ino în Arduino IDE, flash pe ESP32
```

### Echipa
Borugă Iulian-Constantin (Team Lead / Arhitect) · Pteancu Paul-Vasile (firmware ESP32) · Osman Erol-Hakan (ESP32) · Ciurcea-Lupinca Paula-Florina (backend API) · Janosy Tibor-Zoltan (backend DB) · Cucicea Roland-Boni (Android UI) · Costa Robert-Adrian (Android BLE) · German Florin-Adrian (Android notificări) · Dolhan Claudia-Cristina (web medic) · Terec Darius-Mihai (web pacient + marketing).

---

## 🇬🇧 English

### About
SmartLink is a complete remote monitoring system for patients with chronic conditions. An ESP32-based wearable reads vital signs (ECG, pulse, temperature, humidity) and streams them over Bluetooth LE to an Android app, which syncs the data to the cloud (Azure). A doctor views the data in real time on a web dashboard, receives automatic alarms when thresholds are exceeded, and manages patients and recommendations.

### System architecture
```
ESP32 (sensors) ──BLE──▶ Android App ──HTTPS/REST──▶ Azure API (Node.js) ──SQL──▶ Azure SQL
                                                          ▲                          │
                              Web (React, doctor) ──REST/JWT┘  ◀──────SQL────────────┘
```
1. The ESP32 reads sensors and advertises over BLE.
2. Android receives the data (BLE) and uploads it to the cloud over HTTP.
3. The Express API validates and stores it in Azure SQL.
4. The web dashboard (React) reads via REST and renders charts, alarms and recommendations.

### Branches (single repo, one branch per component)
| Branch | Content |
|--------|---------|
| **`main`** | Web frontend + cloud backend (`web-frontend/` and `cloud-backend/` folders). Auto-deploy: Vercel (web) + Azure (API). |
| **`android-app`** | Android application (Kotlin), package `com.example.smartlink_multi`. |
| **`esp32-firmware`** | Arduino C++ firmware for the ESP32. |

> **Rule:** never mix branches in the same working folder. Each component lives on its own branch.
> Auxiliary/historical branches: `web-frontend`, `cloud-backend` (early versions), `learning` (practice), `gh-pages` (landing page).

### Folder structure
```
main/
├── cloud-backend/              # REST API — Node.js + Express
│   ├── controllers/            # authController, patientController, sensorController, ...
│   ├── routes/                 # authRoutes, patientRoutes, sensorRoutes, ...
│   ├── sql/                    # schema + seed
│   └── server.js
├── web-frontend/               # Doctor dashboard — React 18 + Material UI + Recharts
│   ├── src/
│   │   ├── components/doctor/   # DoctorDashboard, PatientFile, ECGViewer, SchedulePage, ...
│   │   ├── api.js               # API layer (+ snakeToCamel)
│   │   └── App.js
│   └── package.json
└── .github/workflows/          # main_smartlink-api.yml (Azure auto-deploy)

android-app/
└── app/src/main/java/com/example/smartlink_multi/
    ├── MainActivity.kt         # BLE + ViewPager2 (tabs: ECG / Sensors / Alarms / Settings)
    └── data/                   # network (Retrofit/ApiService), dto, repository, prefs (JWT session)

esp32-firmware/
└── SmartLink_ECG_BLE/          # Arduino sketch (.ino): sensor reading + BLE
```

### Tech stack
- **Hardware:** ESP32-S3 · AD8232 (ECG) · DHT22 (ambient temperature/humidity) · optical pulse sensor (MAX30102) · contact temperature sensor (MAX30205 / DS18B20). Component cost ≈ **€42.59**/device.
- **Firmware:** Arduino C++ · BLE (HM-10 style, FFE0 service).
- **Mobile:** Android (Kotlin) · ViewPager2 · Retrofit · JWT session.
- **Backend:** Node.js · Express 4 · JWT · bcrypt · Azure SQL (mssql).
- **Frontend:** React 18 · Material UI · Recharts.
- **Deploy:** Vercel (web) · Azure App Service F1 (API) · Azure SQL.

### BLE contract (firmware ↔ Android)
```
Device name: "SmartLink-ECG"
Service:  FFE0  (0000ffe0-0000-1000-8000-00805f9b34fb)
FFE1 (status, ~1s, NOTIFY): JSON {"leadOff":bool,"temp":float,"hum":float,"bpm":int}
FFE2 (ECG, NOTIFY): comma-separated ADC integers, ~8-10 samples/packet, 100 Hz
MTU: 100
```

### Demo credentials
| Role | Email | Password |
|------|-------|----------|
| Doctor | `doctor@smartlink.ro` | `123456` |
| Patient | `pacient@smartlink.ro` | `123456` |

### Acceptance tests (24)
**Category 1 — Patient records (web, doctor):** login, public registration, list of the logged-in doctor's patients, patient record view.
**Category 2 — Patient values (Android + cloud):** patient login on Android, BLE reading from ESP32, 30s cloud sync, alarms from cloud, local push notifications.
**Category 3 — ESP32 wearable:** BLE startup/advertising, phone–ESP32 pairing, continuous sensor reading, ECG at 100 samples/s, cloud persistence.
**Category 4 — Doctor monitoring (web):** real-time pulse chart, temperature + humidity chart, historical ECG view, date filters.
**Category 5 — Reports & doctor actions:** alarm threshold configuration, automatic alarm detection, alarm history with filtering, recommendations on Android*, create recommendation, edit/delete recommendation.

> \*3.5.4: recommendations exist in the database and in the doctor dashboard; display on Android is a planned extension.

### Run locally
```bash
# Backend (main branch)
cd cloud-backend && npm install && npm start          # needs .env with Azure SQL credentials + JWT_SECRET

# Frontend (main branch)
cd web-frontend && npm install && npm run dev          # REACT_APP_API_URL → API URL

# Android (android-app branch): open in Android Studio, build & run
# Firmware (esp32-firmware branch): open the .ino in Arduino IDE, flash to ESP32
```

### Team
Borugă Iulian-Constantin (Team Lead / Architect) · Pteancu Paul-Vasile (ESP32 firmware) · Osman Erol-Hakan (ESP32) · Ciurcea-Lupinca Paula-Florina (backend API) · Janosy Tibor-Zoltan (backend DB) · Cucicea Roland-Boni (Android UI) · Costa Robert-Adrian (Android BLE) · German Florin-Adrian (Android notifications) · Dolhan Claudia-Cristina (web, doctor) · Terec Darius-Mihai (web, patient + marketing).

---

## 🇪🇸 Español

### Acerca del proyecto
SmartLink es un sistema completo de monitorización remota para pacientes con enfermedades crónicas. Un dispositivo wearable basado en ESP32 lee signos vitales (ECG, pulso, temperatura, humedad) y los transmite por Bluetooth LE a una aplicación Android, que sincroniza los datos en la nube (Azure). El médico ve los datos en tiempo real en un panel web, recibe alarmas automáticas cuando se superan los umbrales y gestiona pacientes y recomendaciones.

### Arquitectura del sistema
```
ESP32 (sensores) ──BLE──▶ App Android ──HTTPS/REST──▶ API Azure (Node.js) ──SQL──▶ Azure SQL
                                                          ▲                          │
                              Web (React, médico) ─REST/JWT┘  ◀──────SQL────────────┘
```
1. El ESP32 lee los sensores y emite por BLE.
2. Android recibe los datos (BLE) y los sube a la nube por HTTP.
3. La API Express valida y guarda en Azure SQL.
4. El panel web (React) lee por REST y muestra gráficos, alarmas y recomendaciones.

### Ramas (un solo repo, una rama por componente)
| Rama | Contenido |
|------|-----------|
| **`main`** | Frontend web + backend en la nube (carpetas `web-frontend/` y `cloud-backend/`). Despliegue automático: Vercel (web) + Azure (API). |
| **`android-app`** | Aplicación Android (Kotlin), paquete `com.example.smartlink_multi`. |
| **`esp32-firmware`** | Firmware Arduino C++ para el ESP32. |

> **Regla:** nunca mezclar ramas en la misma carpeta de trabajo. Cada componente vive en su propia rama.
> Ramas auxiliares/históricas: `web-frontend`, `cloud-backend` (versiones iniciales), `learning` (práctica), `gh-pages` (página de aterrizaje).

### Estructura de carpetas
```
main/
├── cloud-backend/              # API REST — Node.js + Express
│   ├── controllers/            # authController, patientController, sensorController, ...
│   ├── routes/                 # authRoutes, patientRoutes, sensorRoutes, ...
│   ├── sql/                    # esquema + seed
│   └── server.js
├── web-frontend/               # Panel del médico — React 18 + Material UI + Recharts
│   ├── src/
│   │   ├── components/doctor/   # DoctorDashboard, PatientFile, ECGViewer, SchedulePage, ...
│   │   ├── api.js               # capa de API (+ snakeToCamel)
│   │   └── App.js
│   └── package.json
└── .github/workflows/          # main_smartlink-api.yml (auto-despliegue Azure)

android-app/
└── app/src/main/java/com/example/smartlink_multi/
    ├── MainActivity.kt         # BLE + ViewPager2 (pestañas: ECG / Sensores / Alarmas / Ajustes)
    └── data/                   # network (Retrofit/ApiService), dto, repository, prefs (sesión JWT)

esp32-firmware/
└── SmartLink_ECG_BLE/          # sketch Arduino (.ino): lectura de sensores + BLE
```

### Stack tecnológico
- **Hardware:** ESP32-S3 · AD8232 (ECG) · DHT22 (temperatura/humedad ambiente) · sensor de pulso óptico (MAX30102) · sensor de temperatura de contacto (MAX30205 / DS18B20). Coste de componentes ≈ **€42.59**/dispositivo.
- **Firmware:** Arduino C++ · BLE (estilo HM-10, servicio FFE0).
- **Móvil:** Android (Kotlin) · ViewPager2 · Retrofit · sesión JWT.
- **Backend:** Node.js · Express 4 · JWT · bcrypt · Azure SQL (mssql).
- **Frontend:** React 18 · Material UI · Recharts.
- **Despliegue:** Vercel (web) · Azure App Service F1 (API) · Azure SQL.

### Contrato BLE (firmware ↔ Android)
```
Nombre del dispositivo: "SmartLink-ECG"
Servicio: FFE0  (0000ffe0-0000-1000-8000-00805f9b34fb)
FFE1 (estado, ~1s, NOTIFY): JSON {"leadOff":bool,"temp":float,"hum":float,"bpm":int}
FFE2 (ECG, NOTIFY): enteros ADC separados por comas, ~8-10 muestras/paquete, 100 Hz
MTU: 100
```

### Credenciales de demostración
| Rol | Email | Contraseña |
|-----|-------|------------|
| Médico | `doctor@smartlink.ro` | `123456` |
| Paciente | `pacient@smartlink.ro` | `123456` |

### Pruebas de aceptación (24)
**Categoría 1 — Fichas de pacientes (web, médico):** inicio de sesión, registro público, lista de pacientes del médico, vista de la ficha del paciente.
**Categoría 2 — Valores del paciente (Android + nube):** inicio de sesión del paciente en Android, lectura BLE del ESP32, sincronización en la nube cada 30s, alarmas desde la nube, notificaciones push locales.
**Categoría 3 — Wearable ESP32:** arranque/advertising BLE, emparejamiento teléfono–ESP32, lectura continua de sensores, ECG a 100 muestras/s, persistencia en la nube.
**Categoría 4 — Seguimiento del médico (web):** gráfico de pulso en tiempo real, gráfico de temperatura + humedad, vista de ECG histórico, filtros por fecha.
**Categoría 5 — Informes y acciones del médico:** configuración de umbrales de alarma, detección automática de alarmas, historial de alarmas con filtrado, recomendaciones en Android*, crear recomendación, editar/eliminar recomendación.

> \*3.5.4: las recomendaciones existen en la base de datos y en el panel del médico; la visualización en Android es una extensión planificada.

### Ejecución local
```bash
# Backend (rama main)
cd cloud-backend && npm install && npm start          # requiere .env con credenciales de Azure SQL + JWT_SECRET

# Frontend (rama main)
cd web-frontend && npm install && npm run dev          # REACT_APP_API_URL → URL de la API

# Android (rama android-app): abrir en Android Studio, build & run
# Firmware (rama esp32-firmware): abrir el .ino en Arduino IDE, flashear en el ESP32
```

### Equipo
Borugă Iulian-Constantin (Líder de equipo / Arquitecto) · Pteancu Paul-Vasile (firmware ESP32) · Osman Erol-Hakan (ESP32) · Ciurcea-Lupinca Paula-Florina (API backend) · Janosy Tibor-Zoltan (BD backend) · Cucicea Roland-Boni (UI Android) · Costa Robert-Adrian (BLE Android) · German Florin-Adrian (notificaciones Android) · Dolhan Claudia-Cristina (web, médico) · Terec Darius-Mihai (web, paciente + marketing).

---

<div align="center">

*SmartLink — Vital Connection · TechNova Solutions*
Proiect academic · Universitatea Politehnica Timișoara · Inginerie Software

</div>
