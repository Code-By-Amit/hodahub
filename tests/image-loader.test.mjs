import test from 'node:test';
import assert from 'node:assert/strict';
import imageLoader from '../src/lib/image-loader.js';

test('requests responsive Cloudinary images directly', () => {
  const src = 'https://res.cloudinary.com/example/image/upload/v123/products/watch.webp';
  assert.equal(imageLoader({ src, width: 384 }), 'https://res.cloudinary.com/example/image/upload/f_auto,q_auto,c_limit,w_384/v123/products/watch.webp');
  assert.match(imageLoader({ src, width: 750 }), /w_750\//);
});

test('preserves other image sources and signed Cloudinary URLs', () => {
  for (const src of ['/logo.png', 'https://images.unsplash.com/photo.jpg', 'https://res.cloudinary.com/example/image/upload/s--signed--/v123/watch.jpg']) {
    assert.equal(imageLoader({ src, width: 384 }), src);
  }
});
