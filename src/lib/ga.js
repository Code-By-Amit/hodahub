// Google Analytics 4 helper utilities
// This file provides a lightweight wrapper around gtag for GA4 events.
// It respects the cookie consent stored by src/lib/consent.js.

import { getConsent } from '@/lib/consent';

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID; // e.g. G-XXXXXXXXXX

// Queue events until the GA script is ready.
const queue = [];
let isReady = false;

export function _processQueue() {
  while (queue.length) {
    const [event, params] = queue.shift();
    window.gtag('event', event, params);
  }
}

export function track(eventName, params = {}) {
  if (typeof window === 'undefined' || !GA_ID) return;
  if (getConsent() !== 'granted') return;
  if (isReady && window.gtag) {
    window.gtag('event', eventName, params);
  } else {
    queue.push([eventName, params]);
  }
}

// Called by the GA component once the script has loaded.
export function setReady() {
  if (typeof window === 'undefined') return;
  isReady = true;
  _processQueue();
}

// ------- E‑commerce event helpers (GA4 naming) -------
export function trackViewItem(product) {
  track('view_item', {
    items: [
      {
        item_id: String(product.id || product._id),
        item_name: product.name,
        price: Number(product.price),
        currency: 'INR',
        // Include additional fields if available (category, brand, etc.)
        ...(product.categorySlug && { item_category: product.categoryName }),
        ...(product.brand && { item_brand: product.brand }),
      },
    ],
  });
}

export function trackViewItemList({ items, list_name }) {
  track('view_item_list', {
    item_list_name: list_name,
    items: items.map((p) => ({
      item_id: String(p.id || p._id),
      item_name: p.name,
      price: Number(p.price),
      currency: 'INR',
    })),
  });
}

export function trackSearch(query) {
  track('search', { search_term: String(query).slice(0, 100) });
}

export function trackAddToCart(product, quantity = 1) {
  track('add_to_cart', {
    items: [
      {
        item_id: String(product.id || product._id),
        item_name: product.name,
        price: Number(product.price),
        quantity,
        currency: 'INR',
      },
    ],
  });
}

export function trackRemoveFromCart(product, quantity = 1) {
  track('remove_from_cart', {
    items: [
      {
        item_id: String(product.id || product._id),
        item_name: product.name,
        price: Number(product.price),
        quantity,
        currency: 'INR',
      },
    ],
  });
}

export function trackBeginCheckout({ items, value }) {
  track('begin_checkout', {
    items: items.map((p) => ({
      item_id: String(p.id || p._id),
      item_name: p.name,
      price: Number(p.price),
      quantity: p.quantity || 1,
      currency: 'INR',
    })),
    value,
    currency: 'INR',
  });
}

export function trackPurchase({ orderId, items, value }) {
  const eventId = `purchase_${orderId}`; // de‑duplicate with Meta Pixel's CAPI
  track('purchase', {
    transaction_id: orderId,
    items: items.map((p) => ({
      item_id: String(p.id || p._id),
      item_name: p.name,
      price: Number(p.price),
      quantity: p.quantity || 1,
      currency: 'INR',
    })),
    value,
    currency: 'INR',
    event_id: eventId,
  });
}

export function trackSignUp() {
  track('sign_up');
}

export function trackContact({ method = 'whatsapp' } = {}) {
  track('contact', { method });
}

