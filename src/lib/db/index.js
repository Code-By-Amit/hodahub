import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  const isLocal = !connectionString || connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  const poolInstance = new pg.Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });

  poolInstance.on('error', (err) => {
    // Handle idle connection resets silently so serverless / dev HMR doesn't crash on ECONNRESET
    if (err.code === 'ECONNRESET' || err.errno === -4077) {
      console.warn('Postgres connection pool reset idle socket gracefully:', err.message);
    } else {
      console.error('Unexpected error on idle Postgres client:', err);
    }
  });

  return poolInstance;
}

const pool = globalThis.pgPool || createPool();
if (process.env.NODE_ENV !== 'production') {
  globalThis.pgPool = pool;
}

export const db = globalThis.drizzleDb || drizzle(pool, { schema });
if (process.env.NODE_ENV !== 'production') {
  globalThis.drizzleDb = db;
}

