// Browser-side Meta Pixel helpers. Every function is safe to call anywhere:
// it does nothing on the server, without a Pixel ID, or without cookie consent.
import { getConsent } from '@/lib/consent';
// Returns the effective selling price of a product (discount price takes priority)
const getEffectivePrice = (p) => Number(p.discountPrice || p.price || 0);

export const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
export const CURRENCY = 'INR'; // Meta wants the amount in RUPEES (499), never paise (49900)

const queue = [];

function send(event, params, eventId) {
  if (eventId) window.fbq('track', event, params, { eventID: eventId });
  else window.fbq('track', event, params);
}

// events fired while the pixel script is still loading are replayed once it is ready
function flush() {
  while (queue.length) send(...queue.shift());
}
if (typeof window !== 'undefined') window.addEventListener('meta-pixel-ready', flush);

export function track(event, params = {}, eventId) {
  if (typeof window === 'undefined' || !PIXEL_ID) return;
  if (getConsent() !== 'granted') return;
  if (window.fbq) send(event, params, eventId);
  else queue.push([event, params, eventId]);
}

export const newEventId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

// Use the SAME id format everywhere (and later in your product catalog): the Mongo _id
const idOf = (p) => String(p.productId || p._id || p.id);
const unitPrice = (p) => Number(getEffectivePrice(p));
const contentOf = (p, qty) => ({ id: idOf(p), quantity: qty ?? p.quantity ?? 1, item_price: unitPrice(p) });
const totalQty = (items) => items.reduce((s, i) => s + (i.quantity || 1), 0);

// ---- standard events ----

export function trackViewContent(product) {
  track('ViewContent', {
    content_ids: [idOf(product)],
    content_type: 'product',
    content_name: product.name,
    contents: [contentOf(product, 1)],
    value: unitPrice(product),
    currency: CURRENCY,
  });
}

export function trackAddToCart(product, quantity = 1) {
  track('AddToCart', {
    content_ids: [idOf(product)],
    content_type: 'product',
    content_name: product.name,
    contents: [contentOf(product, quantity)],
    value: unitPrice(product) * quantity,
    currency: CURRENCY,
  });
}

export function trackAddToWishlist(product) {
  track('AddToWishlist', {
    content_ids: [idOf(product)],
    content_type: 'product',
    content_name: product.name,
    value: unitPrice(product),
    currency: CURRENCY,
  });
}

export function trackSearch(query) {
  track('Search', { search_string: String(query).slice(0, 100), content_type: 'product' });
}

export function trackInitiateCheckout(items, total) {
  track('InitiateCheckout', {
    content_ids: items.map(idOf),
    content_type: 'product',
    contents: items.map((i) => contentOf(i)),
    num_items: totalQty(items),
    value: Number(total),
    currency: CURRENCY,
  });
}

export function trackAddPaymentInfo(items, total) {
  track('AddPaymentInfo', {
    content_ids: items.map(idOf),
    content_type: 'product',
    contents: items.map((i) => contentOf(i)),
    value: Number(total),
    currency: CURRENCY,
  });
}

// Fire once, AFTER payment is confirmed (or the COD order is placed).
// The event id must match the one the server sends, so Meta counts it once.
export function trackPurchase({ orderId, items, total }) {
  track(
    'Purchase',
    {
      content_ids: items.map(idOf),
      content_type: 'product',
      contents: items.map((i) => contentOf(i)),
      num_items: totalQty(items),
      value: Number(total),
      currency: CURRENCY,
    },
    `purchase_${orderId}`
  );
}

export function trackCompleteRegistration() {
  track('CompleteRegistration', { status: true });
}

// Paid subscription (price is stored in paise, Meta needs rupees)
export function trackSubscribe({ pricePaise, planName }) {
  track('Subscribe', {
    content_name: planName,
    value: Number(pricePaise) / 100,
    currency: CURRENCY,
  });
}

// ---- data the server needs to send the same Purchase through the Conversions API ----

function getCookie(name) {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : undefined;
}

export function getTrackingData() {
  if (typeof window === 'undefined' || getConsent() !== 'granted') return null;
  return {
    fbp: getCookie('_fbp'),
    fbc: getCookie('_fbc'),
    sourceUrl: window.location.href,
  };
}

// ---- WhatsApp inquiries ----

// Fire when someone clicks a WhatsApp button. No value/currency on purpose:
// a click is an inquiry, not revenue, and a fake value would pollute your reports.
export function trackContact({ product, source = 'whatsapp_button' } = {}) {
  track('Contact', {
    contact_method: 'whatsapp',
    source,
    ...(product
      ? { content_ids: [idOf(product)], content_type: 'product', content_name: product.name }
      : {}),
  });
}