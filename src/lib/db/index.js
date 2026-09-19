import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

export function isConnectionError(err) {
  if (!err) return false;

  const messages = [];
  const codes = [];

  let current = err;
  let depth = 0;
  while (current && depth < 5) {
    if (current.message) messages.push(current.message.toLowerCase());
    if (current.code) codes.push(current.code.toString());
    if (current.name) messages.push(current.name.toLowerCase());

    if (Array.isArray(current.errors)) {
      for (const subErr of current.errors) {
        if (subErr?.message) messages.push(subErr.message.toLowerCase());
        if (subErr?.code) codes.push(subErr.code.toString());
      }
    }

    current = current.cause;
    depth++;
  }

  const fullText = messages.join(' ');

  return (
    fullText.includes('connection terminated') ||
    fullText.includes('connection timeout') ||
    fullText.includes('econnscheduled') ||
    fullText.includes('econnreset') ||
    fullText.includes('econnrefused') ||
    fullText.includes('socket hang up') ||
    fullText.includes('connection closed') ||
    fullText.includes('terminating connection') ||
    fullText.includes('aggregateerror') ||
    codes.some((c) =>
      ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', '57P01', '57P02', '57P03', '08006', '08001', '08004'].includes(c)
    )
  );
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  const isLocal = !connectionString || connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

  const poolInstance = new pg.Pool({
    connectionString,
    max: process.env.NODE_ENV === 'production' ? 15 : 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 15000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });

  poolInstance.on('error', (err) => {
    if (isConnectionError(err)) {
      console.warn('[DB Pool] Gracefully handled idle client socket reset:', err.message);
    } else {
      console.error('[DB Pool] Unexpected error on idle Postgres client:', err);
    }
  });

  return poolInstance;
}

const pool = globalThis.pgPool || createPool();
if (process.env.NODE_ENV !== 'production') {
  globalThis.pgPool = pool;
}

const rawDb = drizzle(pool, { schema });

export function createResilientProxy(target) {
  if (!target || (typeof target !== 'object' && typeof target !== 'function')) {
    return target;
  }

  return new Proxy(target, {
    get(targetObj, prop, receiver) {
      if (typeof prop === 'symbol') {
        return Reflect.get(targetObj, prop, receiver);
      }

      const orig = Reflect.get(targetObj, prop, receiver);

      if (prop === 'then' && typeof orig === 'function') {
        return function (onFulfilled, onRejected) {
          const attemptQuery = (retriesLeft) => {
            return orig.call(
              targetObj,
              (val) => (onFulfilled ? onFulfilled(val) : val),
              async (err) => {
                if (retriesLeft > 0 && isConnectionError(err)) {
                  console.warn(
                    `[DB Auto-Retry] Connection issue detected (${err.cause?.message || err.message}). Retrying query... (${retriesLeft} retries remaining)`
                  );
                  await new Promise((resolve) => setTimeout(resolve, 300));
                  return attemptQuery(retriesLeft - 1);
                }
                if (onRejected) {
                  return onRejected(err);
                }
                throw err;
              }
            );
          };
          return attemptQuery(3);
        };
      }

      if (typeof orig === 'function') {
        return function (...args) {
          const res = orig.apply(targetObj, args);
          if (res && (typeof res === 'object' || typeof res === 'function')) {
            return createResilientProxy(res);
          }
          return res;
        };
      } else if (orig && typeof orig === 'object') {
        return createResilientProxy(orig);
      }

      return orig;
    },
  });
}

export const db = globalThis.drizzleDb || createResilientProxy(rawDb);
if (process.env.NODE_ENV !== 'production') {
  globalThis.drizzleDb = db;
}
