import fs from 'node:fs/promises';
import dotenv from 'dotenv';
import pg from 'pg';
import { databaseConnectionConfig } from '../src/lib/db/connection-config.js';

dotenv.config({ path: '.env.local', quiet: true });
const migrations = ['0001_brand_display_order.sql', '0002_order_inventory_release.sql', '0003_verified_identity.sql'];
if (!process.argv.includes('--apply') && !process.argv.includes('--check')) {
  console.log('Pending hardening migrations (preview only):\n' + migrations.join('\n'));
  console.log('Review historical order/payment discrepancies before applying. Run with --apply after review.');
  process.exit(0);
}
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const client = new pg.Client({ ...databaseConnectionConfig(process.env.DATABASE_URL), connectionTimeoutMillis: 10000, query_timeout: 10000 });
try {
  await client.connect();
  if (process.argv.includes('--check')) {
    await client.query('BEGIN READ ONLY');
    const counts = {};
    const checks = {
      historicalReleasedOrders: "SELECT COUNT(*)::int AS count FROM orders WHERE status = 'cancelled' OR payment_status = 'failed' OR return_status = 'approved'",
      paidCancelledOrdersNeedingReview: "SELECT COUNT(*)::int AS count FROM orders WHERE status = 'cancelled' AND payment_status = 'paid'",
      duplicatePhoneOnlyIdentityGroups: "SELECT COUNT(*)::int AS count FROM (SELECT RIGHT(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 10) FROM users WHERE email IS NULL AND is_verified = true AND phone IS NOT NULL GROUP BY 1 HAVING COUNT(*) > 1) collisions",
      mismatchedSavedAddressOrders: "SELECT COUNT(*)::int AS count FROM orders o JOIN addresses a ON a.id = o.address_id WHERE o.user_id IS DISTINCT FROM a.user_id",
    };
    for (const [key, query] of Object.entries(checks)) counts[key] = (await client.query(query)).rows[0].count;
    await client.query('ROLLBACK');
    console.log(JSON.stringify({ mode: 'read-only preflight', counts }, null, 2));
  } else {
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(736218042)');
  // Preserve the original values changed by the historical backfills locally.
  // This is a targeted migration snapshot, not a replacement for provider backups.
  const snapshot = {
    createdAt: new Date().toISOString(),
    orders: (await client.query("SELECT id, status, payment_status, return_status FROM orders WHERE status = 'cancelled' OR payment_status = 'failed' OR return_status = 'approved'")).rows,
    phoneIdentities: (await client.query('SELECT id, phone, is_verified FROM users WHERE email IS NULL AND is_verified = true AND phone IS NOT NULL')).rows,
  };
  await fs.mkdir(new URL('../.local-backups/', import.meta.url), { recursive: true });
  const snapshotName = 'hardening-' + Date.now() + '.json';
  await fs.writeFile(new URL('../.local-backups/' + snapshotName, import.meta.url), JSON.stringify(snapshot, null, 2), { mode: 0o600, flag: 'wx' });
  console.log('Saved targeted backfill snapshot to .local-backups/' + snapshotName);
  await client.query('CREATE TABLE IF NOT EXISTS store_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  for (const name of migrations) {
    const applied = await client.query('SELECT 1 FROM store_migrations WHERE name = $1', [name]);
    if (applied.rowCount) continue;
    await client.query(await fs.readFile(new URL('../drizzle/' + name, import.meta.url), 'utf8'));
    await client.query('INSERT INTO store_migrations (name) VALUES ($1)', [name]);
    console.log('Applied ' + name);
  }
  await client.query('COMMIT');
  }
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  console.error((process.argv.includes('--check') ? 'Read-only preflight failed' : 'Migration failed; transaction rolled back') + '. Error code: ' + (error.code || 'UNKNOWN') + '. Check database configuration and migration compatibility.');
  process.exitCode = 1;
} finally { await client.end(); }
