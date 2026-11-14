const transitions = { pending: ['confirmed', 'cancelled'], confirmed: ['packed', 'cancelled'], packed: ['shipped'], shipped: ['delivered'], delivered: [], cancelled: [] };
export function canTransitionOrder(from, to) { return from === to || Boolean(transitions[from]?.includes(to)); }
export function courierOrderStatus(courierStatus, currentStatus) {
  if (!['packed', 'shipped'].includes(currentStatus)) return null;
  const status = String(courierStatus || '').trim().toUpperCase();
  // Undelivered, RTO delivered, and cancellation scans require staff review.
  if (['DELIVERED', 'DL'].includes(status)) return 'delivered';
  if (currentStatus === 'packed' && ['IN TRANSIT', 'DISPATCHED', 'OUT FOR DELIVERY'].includes(status)) return 'shipped';
  return null;
}
export function exchangeEligibility(order, now = Date.now()) {
  if (order.status !== 'delivered') return 'Exchanges are available only after delivery.';
  if (order.returnStatus !== 'none') return 'An exchange request has already been submitted.';
  if (!order.deliveredAt) return 'Please contact support to confirm the delivery date for this order.';
  if (now - new Date(order.deliveredAt).getTime() > 48 * 60 * 60 * 1000) return 'The 48-hour exchange request window has ended. Please contact support.';
  return '';
}
