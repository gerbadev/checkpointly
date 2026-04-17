const { Pool } = require('pg');
let pool = null;

function initDb() {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL not set in environment');
  }

  pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
  });

  return pool;
}

function getDb() {
  if (!pool) {
    throw new Error('DB not initialized. Call initDb() first.');
  }
  return pool;
}

module.exports = { initDb, getDb };
