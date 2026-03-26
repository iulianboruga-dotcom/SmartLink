const sql = require('mssql');

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: true,          // necesar pentru Azure SQL
    trustServerCertificate: false,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let pool = null;

// Returnează pool-ul de conexiuni, cu retry logic la pornire
async function getPool() {
  if (pool) return pool;

  let retries = 5;
  while (retries > 0) {
    try {
      pool = await sql.connect(config);
      console.log('Conectat la Azure SQL Database');
      return pool;
    } catch (err) {
      retries--;
      console.error(`Eroare conexiune DB (${retries} încercări rămase):`, err.message);
      if (retries === 0) throw err;
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

module.exports = { getPool, sql };
