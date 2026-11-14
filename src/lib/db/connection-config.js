import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Keep application and migration connections on the same verified TLS policy.
export function databaseConnectionConfig(connectionString, env = process.env) {
  if (!connectionString) throw new Error('DATABASE_URL is required');
  const url = new URL(connectionString);
  const local = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname);
  // node-postgres URL SSL parameters otherwise override the explicit TLS object.
  for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert', 'ssl']) url.searchParams.delete(key);
  if (local) return { connectionString: url.toString(), ssl: false };
  const certificatePath = env.DATABASE_SSL_CA_FILE || resolve(process.cwd(), 'prod-ca-2021.crt');
  const ca = env.DATABASE_SSL_CA?.replace(/\\n/g, '\n') ||
    (env.DATABASE_SSL_CA_FILE || existsSync(certificatePath) ? readFileSync(certificatePath, 'utf8') : undefined);
  return { connectionString: url.toString(), ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) } };
}
