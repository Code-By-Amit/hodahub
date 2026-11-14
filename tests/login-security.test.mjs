import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { build } from 'esbuild';
import bcrypt from 'bcryptjs';

const mocks = {
  'next/server': 'export const NextResponse = { json: (body, init) => Response.json(body, init) };',
  '@/lib/db': 'export const db = { select() { globalThis.__loginTest.reads++; return { from() { return this; }, where() { return this; }, limit: async () => [globalThis.__loginTest.user] }; }, update() { return { set() { return this; }, where: async () => {} }; } };',
  '@/lib/db/schema': 'export const users = { id: "id", email: "email" }; export const orders = { userId: "user_id", guestEmail: "guest_email" };',
  '@/lib/auth': 'export const generateOTP = () => "123456"; export const generateTokens = () => {globalThis.__loginTest.tokens++; return {};}; export const setAuthCookies = (response) => {response.headers.set("set-cookie", "test-session=created");return response;};',
  '@/lib/email': 'export const sendOTPEmail = async () => ({success: globalThis.__loginTest.delivery});',
  '@/lib/rateLimit': 'export const getClientIP = () => "test"; export const checkRateLimit = async () => ({success: globalThis.__loginTest.rateAllowed});',
};
const compiled = await build({ entryPoints: ['src/app/api/auth/login/route.js'], bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', alias: { '@': path.resolve('src') }, plugins: [{ name: 'isolated-login-dependencies', setup(builder) { builder.onResolve({ filter: /^(next\/server|@\/lib\/(db(?:\/schema)?|auth|email|rateLimit))$/ }, ({ path: name }) => ({ path: name, namespace: 'login-test' })); builder.onLoad({ filter: /.*/, namespace: 'login-test' }, ({ path: name }) => ({ contents: mocks[name], loader: 'js' })); } }] });
const compiledModule = { exports: {} };
new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(createRequire(import.meta.url), compiledModule, compiledModule.exports);
const passwordHash = await bcrypt.hash('Correct-password-123!', 4);

function setup(overrides = {}) {
  globalThis.__loginTest = { reads: 0, tokens: 0, rateAllowed: true, delivery: true, user: { id: 'test-user', email: 'test@example.com', passwordHash, isVerified: true, role: 'customer' }, ...overrides };
}
function login(password) {
  return compiledModule.exports.POST(new Request('http://localhost/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'test@example.com', password }) }));
}

test('wrong passwords never issue sessions, even for verified users', async () => {
  setup();
  const response = await login('Wrong-password-123!');
  assert.equal(response.status, 401);
  assert.equal(response.headers.get('set-cookie'), null);
  assert.equal(globalThis.__loginTest.tokens, 0);
});
test('rate-limited logins stop before reading identities or issuing sessions', async () => {
  setup({ rateAllowed: false });
  assert.equal((await login('Correct-password-123!')).status, 429);
  assert.equal(globalThis.__loginTest.reads, 0);
  assert.equal(globalThis.__loginTest.tokens, 0);
});
test('a correct verified password can still establish a session', async () => {
  setup();
  const response = await login('Correct-password-123!');
  assert.equal(response.status, 200);
  assert.equal(globalThis.__loginTest.tokens, 1);
});
test('failed verification-email delivery is reported without issuing a session', async () => {
  setup();
  globalThis.__loginTest.user.isVerified = false;
  globalThis.__loginTest.delivery = false;
  assert.equal((await login('Correct-password-123!')).status, 503);
  assert.equal(globalThis.__loginTest.tokens, 0);
});
