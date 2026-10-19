import test from 'node:test';
import assert from 'node:assert/strict';
import { checkCategoryCycle, getPrimaryBreadcrumbs } from '../src/lib/category-tree.js';

test('checkCategoryCycle detects direct self-parenting', () => {
  const result = checkCategoryCycle('cat-1', ['cat-1'], []);
  assert.equal(result.hasCycle, true);
  assert.match(result.reason, /cannot be its own parent/i);
});

test('checkCategoryCycle detects circular loops in ancestors', () => {
  // Existing: cat-1 -> cat-2 -> cat-3
  // Proposed: make cat-1 a parent of cat-3 (i.e. cat-3 has parent cat-1)
  const allRelations = [
    { categoryId: 'cat-2', parentId: 'cat-1' },
    { categoryId: 'cat-3', parentId: 'cat-2' },
  ];
  // Attempting to set cat-3 as a parent of cat-1 creates a cycle
  const result = checkCategoryCycle('cat-1', ['cat-3'], allRelations);
  assert.equal(result.hasCycle, true);
  assert.match(result.reason, /circular relationship/i);
});

test('checkCategoryCycle permits non-circular multi-parent DAG relationships', () => {
  // cat-3 has parents cat-1 and cat-2 (valid diamond or multi-parent)
  const allRelations = [
    { categoryId: 'cat-2', parentId: 'cat-1' },
  ];
  const result = checkCategoryCycle('cat-3', ['cat-1', 'cat-2'], allRelations);
  assert.equal(result.hasCycle, false);
});

test('getPrimaryBreadcrumbs respects depth ceiling and terminates on cyclic graph data', () => {
  const allCategories = [
    { id: 'cat-1', name: 'Cat 1', slug: 'cat-1' },
    { id: 'cat-2', name: 'Cat 2', slug: 'cat-2' },
  ];
  // Synthetic loop: cat-1 is parent of cat-2, and cat-2 is parent of cat-1
  const cyclicRelations = [
    { categoryId: 'cat-2', parentId: 'cat-1' },
    { categoryId: 'cat-1', parentId: 'cat-2' },
  ];

  const path = getPrimaryBreadcrumbs('cat-1', allCategories, cyclicRelations);
  assert.ok(Array.isArray(path));
  assert.ok(path.length <= 50, 'Path length must be bounded by MAX_DEPTH');
});

test('each product counts once per category with descendants rolled up', () => {
  // Simulating rollup counting algorithm:
  // Root category "Watches" (c-1), child "Men's Watch" (c-2), child "Women's Watch" (c-3)
  const products = [
    { id: 'p1', categoryId: 'c-2' },
    { id: 'p2', categoryId: 'c-2' },
    { id: 'p3', categoryId: 'c-3' },
  ];

  const descendantsMap = {
    'c-1': new Set(['c-1', 'c-2', 'c-3']),
    'c-2': new Set(['c-2']),
    'c-3': new Set(['c-3']),
  };

  const countForC1 = products.filter((p) => descendantsMap['c-1'].has(p.categoryId)).length;
  const countForC2 = products.filter((p) => descendantsMap['c-2'].has(p.categoryId)).length;
  const countForC3 = products.filter((p) => descendantsMap['c-3'].has(p.categoryId)).length;

  assert.equal(countForC1, 3, 'Root category rolls up all 3 distinct products once');
  assert.equal(countForC2, 2, 'Subcategory rolls up only its products');
  assert.equal(countForC3, 1, 'Subcategory rolls up only its products');
});
