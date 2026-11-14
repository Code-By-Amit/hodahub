import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBrandCatalog } from '../src/lib/brand-order.js';

test('registered and legacy spellings share one brand URL and accurate counts', () => {
  const registered = [{ id: 'omega', name: 'Omeg_a', slug: 'omeg-a', sortOrder: 1 }];
  const rows = [{ brandRelId: 'omega', brandRelName: 'Omeg_a', brandRelSlug: 'omeg-a', images: ['watch.jpg'] }, { brandText: 'OMEG_A' }, { brandText: 'Omeg_a' }];
  const result = buildBrandCatalog(rows, registered);
  assert.equal(result.length, 1);
  assert.equal(result[0].slug, 'omeg-a');
  assert.equal(result[0].productCount, 3);
  assert.equal(result[0].sortOrder, 1);
  assert.equal(result[0].image, 'watch.jpg');
});
test('legacy slug allocation never steals registered custom URLs', () => {
  const registered = [{ id: 'a', name: 'Different Brand', slug: 'omeg-a' }];
  const result = buildBrandCatalog([{ brandText: 'Omeg a' }, { brandRelId: 'a', brandRelName: 'Different Brand', brandRelSlug: 'omeg-a' }], registered);
  assert.deepEqual(new Set(result.map((brand) => brand.slug)), new Set(['omeg-a', 'omeg-a-2']));
});
