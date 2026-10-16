import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccessOrder } from '../src/lib/order-access.js';

const GUEST_ORDER = {
  userId: null,
  guestEmail: 'shopper@example.com',
  accessCode: 'a'.repeat(32),
};
const REGISTERED_ORDER = { userId: 'user-1', guestEmail: null, accessCode: null };

test('H1: a caller with no email cannot access a guest order that has no email', () => {
  const phoneOnlyUser = { id: 'u9', role: 'customer', email: null };
  const orderNoEmail = { ...GUEST_ORDER, guestEmail: null };

  assert.equal(canAccessOrder(phoneOnlyUser, orderNoEmail, null), false);
  assert.equal(canAccessOrder({ id: 'u9', role: 'customer' }, orderNoEmail, null), false);
});

test('H1: guest email match still works when both sides are populated', () => {
  assert.equal(
    canAccessOrder({ id: 'u1', role: 'customer', email: 'shopper@example.com' }, GUEST_ORDER, null),
    true
  );
});

test('guest access code authorizes the order it belongs to', () => {
  assert.equal(canAccessOrder(null, GUEST_ORDER, 'a'.repeat(32)), true);
  assert.equal(canAccessOrder(null, GUEST_ORDER, 'b'.repeat(32)), false);
  assert.equal(canAccessOrder(null, GUEST_ORDER, null), false);
  assert.equal(canAccessOrder(null, { ...GUEST_ORDER, accessCode: null }, 'anything'), false);
});

test('registered orders require their owner', () => {
  assert.equal(canAccessOrder({ id: 'user-1', role: 'customer' }, REGISTERED_ORDER, null), true);
  assert.equal(canAccessOrder({ id: 'user-2', role: 'customer' }, REGISTERED_ORDER, null), false);
  assert.equal(canAccessOrder(null, REGISTERED_ORDER, null), false);
});

test('an access code cannot unlock a registered order', () => {
  assert.equal(canAccessOrder(null, REGISTERED_ORDER, 'a'.repeat(32)), false);
});

test('admins reach both guest and registered orders', () => {
  const admin = { id: 'adm', role: 'admin', email: 'admin@example.com' };
  assert.equal(canAccessOrder(admin, GUEST_ORDER, null), true);
  assert.equal(canAccessOrder(admin, REGISTERED_ORDER, null), true);
});

test('a missing order is never accessible', () => {
  assert.equal(canAccessOrder({ id: 'user-1', role: 'customer' }, null, 'a'.repeat(32)), false);
});
