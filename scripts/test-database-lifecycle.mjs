// Exercises real PostgreSQL transactions using connection-local temporary tables.
// No catalog, customer, or order rows in the public schema are modified.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import dotenv from 'dotenv';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { build } from 'esbuild';
import { databaseConnectionConfig } from '../src/lib/db/connection-config.js';

dotenv.config({ path: '.env.local', quiet: true });
const client = new pg.Client({ ...databaseConnectionConfig(process.env.DATABASE_URL), connectionTimeoutMillis: 10000, query_timeout: 10000 });
try {
  await client.connect();
  await client.query('SET search_path = pg_temp, public');
  for (const table of ['products', 'orders', 'order_items', 'order_status_history']) {
    await client.query(`CREATE TEMP TABLE ${table} (LIKE public.${table} INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES)`);
    const result = await client.query('SELECT relpersistence FROM pg_class WHERE oid = to_regclass($1)', [table]);
    assert.equal(result.rows[0]?.relpersistence, 't', 'All fixture tables must be temporary');
  }
  await client.query("ALTER TABLE pg_temp.order_status_history ADD CONSTRAINT injected_failure CHECK (note <> 'force-failure')");
  globalThis.__lifecycleTestDb = drizzle(client);
  const compiled = await build({ entryPoints: ['src/lib/order-lifecycle.js'], bundle: true, write: false, format: 'cjs', platform: 'node', packages: 'external', alias: { '@': path.resolve('src') }, plugins: [{ name: 'temporary-database', setup(builder) { builder.onResolve({ filter: /^@\/lib\/db$/ }, () => ({ path: 'temporary-db', namespace: 'fixture' })); builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export const db = globalThis.__lifecycleTestDb;', loader: 'js' })); } }] });
  const compiledModule = { exports: {} };
  new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(createRequire(import.meta.url), compiledModule, compiledModule.exports);
  const { cancelOrderAtomic } = compiledModule.exports;
  async function fixture({ method = 'razorpay', payment = 'pending', released = false } = {}) {
    await client.query('TRUNCATE pg_temp.order_status_history, pg_temp.order_items, pg_temp.orders, pg_temp.products');
    const productId = randomUUID();
    const orderId = randomUUID();
    await client.query('INSERT INTO pg_temp.products (id,name,slug,price,category_id,stock,units_sold) VALUES ($1,$2,$3,500,$4,3,2)', [productId, 'Lifecycle fixture', productId, randomUUID()]);
    await client.query("INSERT INTO pg_temp.orders (id,total_amount,payment_method,payment_status,inventory_released,created_at) VALUES ($1,1000,$2,$3,$4,NOW() - INTERVAL '1 hour')", [orderId, method, payment, released]);
    await client.query('INSERT INTO pg_temp.order_items (order_id,product_id,quantity,price_at_purchase) VALUES ($1,$2,2,500)', [orderId, productId]);
    return orderId;
  }
  async function state() {
    return (await client.query('SELECT p.stock,p.units_sold,o.status,o.inventory_released,(SELECT COUNT(*)::int FROM pg_temp.order_status_history) AS history FROM pg_temp.products p CROSS JOIN pg_temp.orders o')).rows[0];
  }
  let id = await fixture();
  await cancelOrderAtomic(id, 'fixture cancellation');
  await cancelOrderAtomic(id, 'duplicate cancellation');
  assert.deepEqual(await state(), { stock: 5, units_sold: 0, status: 'cancelled', inventory_released: true, history: 1 });
  id = await fixture();
  await assert.rejects(cancelOrderAtomic(id, 'force-failure'));
  assert.deepEqual(await state(), { stock: 3, units_sold: 2, status: 'pending', inventory_released: false, history: 0 });
  for (const fixtureOptions of [{ method: 'cod' }, { payment: 'paid' }]) {
    id = await fixture(fixtureOptions);
    assert.equal(await cancelOrderAtomic(id, 'expiry fixture', { expiredBefore: new Date() }), null);
    assert.equal((await state()).stock, 3);
    assert.equal((await state()).status, 'pending');
  }
  id = await fixture({ payment: 'failed' });
  await cancelOrderAtomic(id, 'failed payment expiry', { expiredBefore: new Date() });
  assert.equal((await state()).stock, 5);
  id = await fixture({ released: true });
  await cancelOrderAtomic(id, 'legacy released fixture');
  assert.equal((await state()).stock, 3);
  console.log('PASS: real PostgreSQL temporary-table lifecycle checks — idempotent stock release, atomic rollback after history failure, COD/paid expiry protection, failed-payment expiry, legacy release protection. Public tables unchanged.');
} finally {
  delete globalThis.__lifecycleTestDb;
  await client.end();
}
