import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import {
  CLAIMABLE_PAYMENT_STATUSES,
  isPaymentAlreadySettled,
  isValidRazorpaySignature,
  nextOrderStatus,
} from '../src/lib/payment-claim.js';

const SECRET = 'unit-test-secret-not-a-real-key';
const ORDER_ID = 'order_AAAAAAAAAAAA';
const PAYMENT_ID = 'pay_AAAAAAAAAAAA';

const sign = (orderId, paymentId) =>
  crypto.createHmac('sha256', SECRET).update(`${orderId}|${paymentId}`).digest('hex');

const verify = (signature, { orderId = ORDER_ID, paymentId = PAYMENT_ID } = {}) =>
  isValidRazorpaySignature({
    razorpayOrderId: orderId,
    razorpayPaymentId: paymentId,
    razorpaySignature: signature,
    keySecret: SECRET,
  });

test('accepts a correctly signed order/payment pair', () => {
  assert.equal(verify(sign(ORDER_ID, PAYMENT_ID)), true);
});

test('rejects a signature made for a different razorpay order', () => {
  assert.equal(verify(sign('order_VICTIMORDER00', PAYMENT_ID), { orderId: ORDER_ID }), false);
});

test('rejects tampered payloads', () => {
  const good = sign(ORDER_ID, PAYMENT_ID);
  assert.equal(verify(good, { paymentId: 'pay_TAMPERED0000' }), false);
  assert.equal(verify(good.slice(0, -1) + (good.at(-1) === 'a' ? 'b' : 'a')), false);
});

test('rejects malformed signatures without throwing', () => {
  for (const bad of [
    '',
    'zz'.repeat(32),
    'ab'.repeat(31),
    'ab'.repeat(33),
    'A'.repeat(64),
    'order_AAAAAAAAAAAA:pay_AAAAAAAAAAAA',
    '0'.repeat(63),
    Buffer.alloc(32).toString('base64'),
    ['not', 'a', 'string'],
    { toString: () => 'x'.repeat(64) },
    null,
    undefined,
    12345678901234567890,
  ]) {
    assert.equal(verify(bad), false, `expected rejection for ${JSON.stringify(bad) ?? String(bad)}`);
  }
});

test('fails loudly when the key secret is missing instead of signing with undefined', () => {
  assert.throws(
    () =>
      isValidRazorpaySignature({
        razorpayOrderId: ORDER_ID,
        razorpayPaymentId: PAYMENT_ID,
        razorpaySignature: sign(ORDER_ID, PAYMENT_ID),
        keySecret: undefined,
      }),
    /RAZORPAY_KEY_SECRET/
  );
});

test('H2: paid and refunded orders are settled; pending and failed are claimable', () => {
  const prepaid = { paymentMethod: 'razorpay', codAdvancePaidAt: null };
  assert.equal(isPaymentAlreadySettled({ ...prepaid, paymentStatus: 'pending' }), false);
  assert.equal(isPaymentAlreadySettled({ ...prepaid, paymentStatus: 'failed' }), false);
  assert.equal(isPaymentAlreadySettled({ ...prepaid, paymentStatus: 'paid' }), true);
  assert.equal(isPaymentAlreadySettled({ ...prepaid, paymentStatus: 'refunded' }), true);
  assert.deepEqual(CLAIMABLE_PAYMENT_STATUSES, ['pending', 'failed']);
});

test('H2: COD advance is settled once the advance is recorded', () => {
  const cod = { paymentMethod: 'cod', paymentStatus: 'pending' };
  assert.equal(isPaymentAlreadySettled({ ...cod, codAdvancePaidAt: null }), false);
  assert.equal(isPaymentAlreadySettled({ ...cod, codAdvancePaidAt: new Date() }), true);
});

test('M2: confirmation never regresses an order that already progressed', () => {
  const at = (status) => ({ status, paymentMethod: 'razorpay', paymentStatus: 'pending' });
  assert.equal(nextOrderStatus(at('pending')), 'confirmed');
  assert.equal(nextOrderStatus(at('confirmed')), 'confirmed');
  assert.equal(nextOrderStatus(at('packed')), 'packed');
  assert.equal(nextOrderStatus(at('shipped')), 'shipped');
  assert.equal(nextOrderStatus(at('delivered')), 'delivered');
});
