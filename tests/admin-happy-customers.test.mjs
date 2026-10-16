import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const API_ROOT = path.join(process.cwd(), 'src', 'app', 'api');

const ADMIN_ROUTES = ['admin/happy-customers/route.js', 'admin/happy-customers/[id]/route.js'];

/**
 * The admin screens are cosmetic only — the server is the trust boundary. These routes must authorise
 * themselves before touching the database, so a hidden nav item is never the only protection.
 */
function exportedHandlers(source) {
  return [...source.matchAll(/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\b/g)].map(
    (match) => match[1]
  );
}

function handlerBody(source, name) {
  const start = source.indexOf(`export async function ${name}`);
  const next = source.indexOf('\nexport async function', start + 1);
  return next === -1 ? source.slice(start) : source.slice(start, next);
}

test('every Happy Customers admin handler calls requireAdmin before any database access', () => {
  for (const relativeRoute of ADMIN_ROUTES) {
    const source = readFileSync(path.join(API_ROOT, relativeRoute), 'utf8');
    const handlers = exportedHandlers(source);

    assert.ok(handlers.length > 0, `${relativeRoute} exposes no route handlers`);

    for (const handler of handlers) {
      const body = handlerBody(source, handler);
      const adminIndex = body.indexOf('requireAdmin(request)');
      const dbIndex = body.search(/\bdb\./);

      assert.ok(adminIndex !== -1, `${relativeRoute} ${handler} is missing requireAdmin()`);
      assert.ok(dbIndex === -1 || adminIndex < dbIndex, `${relativeRoute} ${handler} queries the DB before authorising`);
    }
  }
});

test('the public Happy Customers endpoint publishes only active rows and never leaks admin fields', () => {
  const source = readFileSync(path.join(API_ROOT, 'happy-customers/route.js'), 'utf8');

  assert.match(source, /eq\(happyCustomers\.isActive,\s*true\)/);
  assert.match(source, /asc\(happyCustomers\.sortOrder\)/);
  assert.doesNotMatch(source, /requireAdmin|getAuthUser/);
  assert.doesNotMatch(source, /cloudinaryAssetId/);
  assert.ok(exportedHandlers(source).join(',') === 'GET');
});
