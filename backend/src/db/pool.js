const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME || 'warehouse_db',
  user: process.env.DB_USER || 'warehouse_user',
  password: process.env.DB_PASSWORD || 'warehouse_pass',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('connect', () => {
  logger.info('New client connected to PostgreSQL pool');
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle PostgreSQL client', { error: err.message });
  process.exit(1);
});

/**
 * Initialize the database by running the DDL script.
 */
async function initializeDatabase() {
  const fs = require('fs');
  const path = require('path');
  const initSql = fs.readFileSync(
    path.join(__dirname, 'init.sql'),
    'utf-8'
  );
  try {
    await pool.query(initSql);
    logger.info('Database tables initialized successfully');
  } catch (err) {
    logger.error('Failed to initialize database tables', { error: err.message });
    throw err;
  }
}

module.exports = { pool, initializeDatabase };
