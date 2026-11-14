import test from 'node:test';
import assert from 'node:assert/strict';
import { databaseConnectionConfig } from '../src/lib/db/connection-config.js';

test('remote database connections verify TLS and ignore URL downgrade settings', () => {
  const config = databaseConnectionConfig('postgres://user:pass@database.example/db?sslmode=no-verify&ssl=false', { DATABASE_SSL_CA: 'trusted\\ncertificate', DATABASE_SSL_REJECT_UNAUTHORIZED: 'false' });
  assert.equal(config.ssl.rejectUnauthorized, true);
  assert.equal(config.ssl.ca, 'trusted\ncertificate');
  assert.equal(new URL(config.connectionString).searchParams.has('sslmode'), false);
  assert.equal(new URL(config.connectionString).searchParams.has('ssl'), false);
});

test('only exact local database hostnames skip TLS', () => {
  assert.equal(databaseConnectionConfig('postgres://localhost/db', {}).ssl, false);
  assert.equal(databaseConnectionConfig('postgres://localhost.attacker.example/db', { DATABASE_SSL_CA: 'ca' }).ssl.rejectUnauthorized, true);
});

test('an explicitly configured missing certificate fails instead of bypassing TLS', () => {
  assert.throws(() => databaseConnectionConfig('postgres://database.example/db', { DATABASE_SSL_CA_FILE: './missing-certificate-file.crt' }), /ENOENT/);
});
