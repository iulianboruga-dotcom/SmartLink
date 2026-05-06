# SmartLink API

## Flux complet proiect + setup + utilizare

SmartLink API este backend-ul aplicației **SmartLink**, o platformă pentru monitorizarea pacienților în timp real prin senzori IoT și gestionarea acestora de către medici.

Sistemul permite:

* autentificare securizată JWT
* înregistrare doctori și pacienți
* asociere pacient - medic
* colectare date medicale live
* istoric senzori
* sistem alarme și praguri
* recomandări medicale

---

# Stack Tehnologic

* **Node.js**
* **Express.js**
* **Azure SQL / MSSQL**
* **JWT Authentication**
* **Swagger OpenAPI**
* **bcrypt**
* **Helmet**
* **CORS**
* **express-validator**
* **nodemon**

---

# Package.json și rolul dependențelor


## Explicație pachete

* **express** → framework backend REST API
* **mssql** → conexiune Azure SQL / SQL Server
* **jsonwebtoken** → creare și validare token JWT
* **bcrypt** → criptare parole
* **dotenv** → variabile din .env
* **cors** → acces frontend extern
* **helmet** → securitate headers HTTP
* **express-validator** → validare input request body
* **swagger-ui-express** → documentație Swagger UI
* **yamljs** → citește swagger.yaml
* **nodemon** → restart automat în development

---

# Flux complet aplicație

## Pornire server

```bash
npm run dev
```

Execută:

```bash
nodemon server.js
```

sau producție:

```bash
npm start
```

---

## La pornire serverul :

1. Încarcă `.env`
2. Creează Express app
3. Activează Helmet
4. Activează CORS
5. Activează `express.json()`
6. Încarcă Swagger din `swagger.yaml`
7. Montează toate rutele `/api/*`
8. Pornește serverul pe PORT

---

Instalare dependințe:

```bash
npm install
```

---

# Configurare .env

Creează fișier `.env`

```env
PORT=3000
DB_SERVER=your_server
DB_NAME=your_database
DB_USER=your_user
DB_PASSWORD=your_password
JWT_SECRET=your_secret_key
CORS_ORIGIN=http://localhost:3000
```

---


# API Documentation

După pornirea serverului:

```text
http://localhost:8080/api-docs
```

Swagger UI permite:

* testare endpointuri
* login JWT
* request / response examples
* documentație completă API

---

# Flux utilizare

## 1. Register doctor

```http
POST /api/doctors/register
```

## 2. Register pacient

```http
POST /api/patients/register
```

## 3. Login

```http
POST /api/auth/login
```

Primești token JWT.

## 4. Authorize în Swagger

```text
Bearer YOUR_TOKEN
```

## 5. Testezi endpointurile securizate

---

# Endpointuri principale

## Auth

* POST `/api/auth/login`

## Doctors

* POST `/api/doctors/register`
* GET `/api/doctors`
* GET `/api/doctors/profile`

## Patients

* POST `/api/patients/register`
* GET `/api/patients`
* GET `/api/patients/{id}`
* PUT `/api/patients/{id}`
* POST `/api/patients/assign-doctor`
* DELETE `/api/patients/unassign-doctor`

## Sensors

* POST `/api/sensors`
* POST `/api/sensors/ecg`
* POST `/api/sensors/accelerometer`
* GET `/api/sensors/history`

## Alarms

* POST `/api/alarms`
* GET `/api/alarms/history`
* GET `/api/alarms/thresholds/{patientId}`
* PUT `/api/alarms/thresholds/{patientId}`
* PATCH `/api/alarms/{id}/acknowledge`

## Recommendations

* POST `/api/recommendations`
* GET `/api/recommendations/{patientId}`
* DELETE `/api/recommendations/{id}`

---

# Securitate

Aplicația folosește:

* JWT Authentication
* Password hashing cu bcrypt
* Helmet headers
* CORS controlat
* Input validation

---

