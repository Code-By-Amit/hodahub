import test from 'node:test';
import assert from 'node:assert/strict';
import { compareBrandOrder } from '../src/lib/brand-order.js';
import { validatePriceRange } from '../src/lib/catalog-filters.js';
import { canTransitionOrder, exchangeEligibility } from '../src/lib/order-rules.js';
import { brandSchema } from '../src/lib/validations.js';
import cartReducer, { addItem, refreshCartPrices, selectCartSubtotal } from '../src/lib/store/cartSlice.js';

test('brand positions take precedence and unranked brands remain alphabetic', () => {
  const list = [{ name: 'Zulu', sortOrder: 0 }, { name: 'Alpha', sortOrder: 2 }, { name: 'Omega', sortOrder: 1 }, { name: 'Beta', sortOrder: 0 }];
  assert.deepEqual(list.sort(compareBrandOrder).map((brand) => brand.name), ['Omega', 'Alpha', 'Beta', 'Zulu']);
  assert.equal(brandSchema.safeParse({ name: 'Test', slug: 'test', sortOrder: -1 }).success, false);
});
test('budget filters reject invalid and inverted ranges while allowing open bounds', () => {
  for (const [min, max] of [['-1', '100'], ['100', '10'], ['NaN', '50'], ['0', 'Infinity']]) assert.notEqual(validatePriceRange(min, max), '');
  for (const [min, max] of [['', ''], ['0', '10.50'], ['100', ''], [undefined, '50']]) assert.equal(validatePriceRange(min, max), '');
});
test('fulfillment never regresses completed or cancelled orders', () => {
  assert.equal(canTransitionOrder('cancelled', 'confirmed'), false);
  assert.equal(canTransitionOrder('delivered', 'shipped'), false);
  assert.equal(canTransitionOrder('pending', 'delivered'), false);
  assert.equal(canTransitionOrder('confirmed', 'packed'), true);
});
test('exchange eligibility uses actual delivery time and prevents repeat requests', () => {
  const now = Date.UTC(2026, 10, 14, 12);
  const order = { status: 'delivered', returnStatus: 'none', deliveredAt: new Date(now - 47 * 3600000) };
  assert.equal(exchangeEligibility(order, now), '');
  assert.match(exchangeEligibility({ ...order, deliveredAt: new Date(now - 49 * 3600000) }, now), /48-hour/);
  assert.notEqual(exchangeEligibility({ ...order, returnStatus: 'approved' }, now), '');
  assert.notEqual(exchangeEligibility({ ...order, deliveredAt: null }, now), '');
});

test('a refreshed checkout quote updates both the product and its selected add-on', () => {
  let cart = cartReducer(undefined, addItem({ productId: 'p', name: 'Watch', price: 500, quantity: 1, selectedAddon: { id: 'a', price: 50, quantity: 1, isFree: false } }));
  assert.equal(selectCartSubtotal({ cart }), 550);
  cart = cartReducer(cart, refreshCartPrices([{ productId: 'p', price: 600, discountPrice: null, codAvailable: true, addons: [{ id: 'a', price: 75, isFree: false }] }]));
  assert.equal(selectCartSubtotal({ cart }), 675);
  assert.equal(cart.items[0].selectedAddon.quantity, 1);
});
