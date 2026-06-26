import pg from 'pg';
import { env } from './env.js';
import { logger } from './logger.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected error on idle PostgreSQL client');
});

/** Run a parameterised query against the pool. */
export const query = (text, params) => pool.query(text, params);

/** Verify the database is reachable. Called on startup; throws if it is not. */
export const verifyConnection = async () => {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    logger.info('PostgreSQL connection verified');
  } finally {
    client.release();
  }
};

export const closePool = () => pool.end();
