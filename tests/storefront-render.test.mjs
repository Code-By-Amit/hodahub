import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { useSelector } from 'react-redux';
import { buildSync } from 'esbuild';

test('the real provider server-renders content using the empty hydration snapshot even after live cart changes', () => {
  const compiled = buildSync({ stdin: { contents: "export { default as ReduxProvider } from './src/components/providers/ReduxProvider.js'; export { store } from './src/lib/store/store.js';", resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', packages: 'external', alias: { '@': path.resolve('src') }, loader: { '.js': 'jsx' }, jsx: 'automatic' });
  const compiledModule = { exports: {} };
  new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(createRequire(import.meta.url), compiledModule, compiledModule.exports);
  const { ReduxProvider, store } = compiledModule.exports;
  store.dispatch({ type: 'cart/addItem', payload: { productId: 'saved', name: 'Saved watch', price: 500, quantity: 1 } });
  function Content() {
    const count = useSelector((state) => state.cart.items.length);
    return React.createElement('main', null, 'Storefront content. Server cart count: ' + count);
  }
  const html = renderToString(React.createElement(ReduxProvider, null, React.createElement(Content)));
  assert.match(html, /Storefront content/);
  assert.match(html, /Server cart count: 0/);
  assert.equal(store.getState().cart.items.length, 1);
});
