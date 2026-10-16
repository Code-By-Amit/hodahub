import test from 'node:test';
import assert from 'node:assert/strict';

import { happyCustomerSchema, happyCustomerUpdateSchema } from '../src/lib/validations.js';
import {
  buildOrderPatch,
  extractCloudinaryPublicId,
  selectVisibleScreenshots,
} from '../src/lib/happy-customers.js';

const CLOUDINARY_JPG = 'https://res.cloudinary.com/demo/image/upload/v1700000000/happy-customers/abc123.jpg';

test('happyCustomerSchema accepts JPEG, PNG and WebP screenshots', () => {
  for (const url of [
    CLOUDINARY_JPG,
    'https://res.cloudinary.com/demo/image/upload/v1/happy-customers/a.png',
    'https://res.cloudinary.com/demo/image/upload/v1/happy-customers/a.webp',
    'https://res.cloudinary.com/demo/image/upload/v1/happy-customers/a.jpeg',
  ]) {
    const result = happyCustomerSchema.safeParse({ imageUrl: url });
    assert.equal(result.success, true, `should accept ${url}`);
  }
});

test('happyCustomerSchema rejects unsupported image formats', () => {
  for (const url of [
    'https://res.cloudinary.com/demo/image/upload/v1/happy-customers/a.gif',
    'https://res.cloudinary.com/demo/video/upload/v1/happy-customers/a.mp4',
    'https://res.cloudinary.com/demo/image/upload/v1/happy-customers/a.svg',
    'not-a-url.jpg',
    '',
  ]) {
    const result = happyCustomerSchema.safeParse({ imageUrl: url });
    assert.equal(result.success, false, `should reject ${url || '(empty)'}`);
  }
});

test('happyCustomerSchema bounds the caption and normalises display order', () => {
  assert.equal(happyCustomerSchema.safeParse({ imageUrl: CLOUDINARY_JPG, caption: 'x'.repeat(501) }).success, false);
  assert.equal(happyCustomerSchema.safeParse({ imageUrl: CLOUDINARY_JPG, caption: 'x'.repeat(500) }).success, true);

  const parsed = happyCustomerSchema.parse({ imageUrl: '  ' + CLOUDINARY_JPG + '  ', sortOrder: '4' });
  assert.equal(parsed.imageUrl, CLOUDINARY_JPG);
  assert.equal(parsed.sortOrder, 4);

  const defaults = happyCustomerSchema.parse({ imageUrl: CLOUDINARY_JPG });
  assert.equal(defaults.isActive, true);
  assert.equal(defaults.sortOrder, 0);

  assert.equal(happyCustomerSchema.safeParse({ imageUrl: CLOUDINARY_JPG, sortOrder: 1.5 }).success, false);
  assert.equal(happyCustomerSchema.safeParse({ imageUrl: CLOUDINARY_JPG, sortOrder: -1 }).success, false);
});

test('happyCustomerUpdateSchema allows partial publish and reorder payloads', () => {
  assert.equal(happyCustomerUpdateSchema.safeParse({ isActive: false }).success, true);
  assert.equal(happyCustomerUpdateSchema.safeParse({ sortOrder: 3 }).success, true);
  assert.equal(happyCustomerUpdateSchema.safeParse({ caption: '   ' }).success, true);
  assert.equal(happyCustomerUpdateSchema.safeParse({ imageUrl: 'https://evil.example/x.gif' }).success, false);

  const partial = happyCustomerUpdateSchema.parse({ sortOrder: '2' });
  assert.equal(partial.imageUrl, undefined);
  assert.equal(partial.isActive, undefined);
  assert.equal(partial.sortOrder, 2);
});

test('extractCloudinaryPublicId derives the asset id from the stored secure_url', () => {
  assert.equal(extractCloudinaryPublicId(CLOUDINARY_JPG), 'happy-customers/abc123');
  assert.equal(
    extractCloudinaryPublicId('https://res.cloudinary.com/demo/image/upload/happy-customers/no_version.png'),
    'happy-customers/no_version'
  );
  assert.equal(extractCloudinaryPublicId('https://cdn.example.com/other.jpg'), null);
  assert.equal(extractCloudinaryPublicId(''), null);
  assert.equal(extractCloudinaryPublicId(null), null);
});

test('buildOrderPatch only writes rows whose position actually changed', () => {
  const swapped = [{ id: 'a', sortOrder: 1 }, { id: 'b', sortOrder: 0 }];
  assert.deepEqual(buildOrderPatch(swapped), [
    { id: 'a', sortOrder: 0 },
    { id: 'b', sortOrder: 1 },
  ]);

  const alreadyOrdered = [{ id: 'a', sortOrder: 0 }, { id: 'b', sortOrder: 1 }];
  assert.deepEqual(buildOrderPatch(alreadyOrdered), []);

  const legacyDefaults = [{ id: 'a', sortOrder: 0 }, { id: 'b', sortOrder: 0 }, { id: 'c', sortOrder: 0 }];
  assert.deepEqual(buildOrderPatch(legacyDefaults), [
    { id: 'b', sortOrder: 1 },
    { id: 'c', sortOrder: 2 },
  ]);

  assert.deepEqual(buildOrderPatch([]), []);
  assert.deepEqual(buildOrderPatch(), []);
});

test('selectVisibleScreenshots drops broken images so the gallery can hide itself', () => {
  const items = [
    { id: 'a', imageUrl: 'x' },
    { id: 'b', imageUrl: 'y' },
    { id: 'c', imageUrl: 'z' },
  ];
  assert.deepEqual(selectVisibleScreenshots(items, { b: true }).map((i) => i.id), ['a', 'c']);
  assert.equal(selectVisibleScreenshots(items, {}).length, 3);
  assert.deepEqual(selectVisibleScreenshots(items, { a: true, b: true, c: true }), []);
  assert.deepEqual(selectVisibleScreenshots(), []);
});
