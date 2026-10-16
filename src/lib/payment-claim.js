import crypto from 'crypto';

// Database-free Razorpay verification logic, so it can be unit tested without a connection.

const LOWERCASE_HEX_64 = /^[0-9a-f]{64}$/;

export function isValidRazorpaySignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature, keySecret }) {
  if (!keySecret) {
    throw new Error('RAZORPAY_KEY_SECRET is not configured');
  }

  // Guard before Buffer.from(..., 'hex'), which silently truncates invalid hex and would make
  // timingSafeEqual throw on a length mismatch.
  if (!LOWERCASE_HEX_64.test(String(razorpaySignature))) {
    return false;
  }

  const expected = crypto
    .createHmac('sha256', keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(String(razorpaySignature), 'hex'),
    Buffer.from(expected, 'hex')
  );
}

// A Razorpay order id can legitimately stop matching the current order row when a payment retry
// replaces it, so a signed verification that matches nothing must be recorded for reconciliation.
export function describeOrphanedPayment({ razorpayOrderId, razorpayPaymentId, claimedOrderId, reason }) {
  return `[PAYMENT ORPHAN] signed verification could not be matched to an order (${reason}) razorpay_order_id=${razorpayOrderId} razorpay_payment_id=${razorpayPaymentId} claimed_order_id=${claimedOrderId || 'none'}`;
}

// 'paid' must never be re-confirmed, and 'refunded' must never silently flip back to paid.
export const CLAIMABLE_PAYMENT_STATUSES = ['pending', 'failed'];

export function isPaymentAlreadySettled(order) {
  if (order.paymentMethod === 'cod') {
    return !!order.codAdvancePaidAt;
  }
  return !CLAIMABLE_PAYMENT_STATUSES.includes(order.paymentStatus);
}

// Payment confirmation must not drag an order that already progressed (packed/shipped/delivered)
// back to 'confirmed'.
export function nextOrderStatus(order) {
  return order.status === 'pending' ? 'confirmed' : order.status;
}
