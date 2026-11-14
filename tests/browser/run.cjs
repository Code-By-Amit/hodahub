// Isolated browser tests use actual UI components, fixture catalog data, and no live services.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const esbuild = require('esbuild'); // Already supplied by the project's drizzle-kit toolchain.
const postcss = require('postcss');
const tailwind = require('@tailwindcss/postcss');
const { chromium } = require('playwright');

(async () => {
  const outputDir = path.resolve('test-results');
  fs.mkdirSync(outputDir, { recursive: true });
  const result = await esbuild.build({ entryPoints: ['tests/browser/fixture.jsx'], bundle: true, write: false, define: { "process.env": "{}" }, format: 'iife', jsx: 'automatic', loader: { '.js': 'jsx' }, alias: { '@': path.resolve('src') }, plugins: [{ name: 'next-fixtures', setup(build) { build.onResolve({ filter: /^next\/(image|link)$/ }, (args) => ({ path: args.path, namespace: 'test-next' })); build.onLoad({ filter: /.*/, namespace: 'test-next' }, (args) => ({ loader: 'jsx', resolveDir: process.cwd(), contents: args.path === 'next/link' ? 'import React from "react"; export default function Link(props) { return <a {...props} />; }' : 'import React from "react"; export default function Image({fill, sizes, priority, ...props}) { return <img {...props} style={fill ? {position:"absolute",inset:0,width:"100%",height:"100%"} : undefined} />; }' })); } }] });
  const css = await postcss([tailwind()]).process(fs.readFileSync('src/app/globals.css', 'utf8'), { from: path.resolve('src/app/globals.css') });
  const watch = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 150"><rect x="44" y="1" width="32" height="148" rx="9" fill="#535653"/><rect x="47" y="8" width="26" height="134" rx="4" fill="#777c77"/><circle cx="60" cy="75" r="38" fill="#b8bdb9"/><circle cx="60" cy="75" r="31" fill="#19312e"/><circle cx="60" cy="75" r="27" fill="none" stroke="#d9d7b8" stroke-width="1"/><path d="M60 52v23l16 9" fill="none" stroke="#eeecd5" stroke-width="3"/><circle cx="60" cy="75" r="3" fill="#eeecd5"/></svg>';
  const server = http.createServer((req, res) => {
    if (req.url === '/app.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(result.outputFiles[0].text); }
    else if (req.url === '/style.css') { res.setHeader('Content-Type', 'text/css'); res.end(css.css); }
    else if (req.url === '/watch.svg') { res.setHeader('Content-Type', 'image/svg+xml'); res.end(watch); }
    else { res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/app.js"></script></body></html>'); }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    const candidates = [process.env.BROWSER_EXECUTABLE, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean);
    browser = await chromium.launch({ headless: true, executablePath: candidates.find((file) => fs.existsSync(file)) });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', (error) => { console.error(error.message); errors.push(error.message); });
    page.on('console', (message) => { if (message.type() === 'error' && /same key|unique.*key/i.test(message.text())) errors.push(message.text()); });
    await page.goto('http://127.0.0.1:' + server.address().port);
    await page.getByRole('heading', { name: 'Shop by brand' }).waitFor();
    for (const width of [360, 390, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      const desktop = width >= 1024;
      const region = page.getByRole('region', { name: desktop ? 'Brand collections desktop' : 'Brand collections mobile', exact: true });
      const slides = region.getByRole('group').first();
      const links = slides.getByRole('link');
      assert.equal(await links.count(), desktop ? 5 : 9);
      const boxes = await links.evaluateAll((nodes) => nodes.map((node) => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width }; }));
      assert.equal(new Set(boxes.map((box) => Math.round(box.y))).size, desktop ? 1 : 3);
      assert.equal(new Set(boxes.map((box) => Math.round(box.x))).size, desktop ? 5 : 3);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'No page-level horizontal overflow');
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('section[aria-labelledby="shop-by-brand-heading"]').screenshot({ path: path.join(outputDir, 'mobile-brand-grid.png') });
    await page.getByRole('button', { name: 'Next brand slide' }).click();
    await page.waitForFunction(() => document.querySelector('[aria-label="Go to brand slide 2"]').getAttribute('aria-current') === 'true');
    await page.getByRole('button', { name: 'Previous brand slide' }).click();
    await page.getByRole('combobox', { name: 'Sort products', exact: true }).focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    assert.equal(await page.getByTestId('selected-sort').textContent(), 'price');
    await page.getByRole('combobox', { name: 'Brand selection', exact: true }).click();
    await page.getByRole('combobox', { name: 'Search options' }).fill('Cart');
    await page.getByRole('option', { name: 'Cartier', exact: true }).click();
    assert.equal(await page.getByTestId('selected-sort').textContent(), 'Cartier');
    // A large browser base font must not clip +91 or make fields uneven.
    await page.evaluate(() => { document.documentElement.style.fontSize = '24px'; });
    const country = page.getByRole('combobox', { name: 'Country Dial Code' });
    await country.scrollIntoViewIfNeeded();
    const scrollBefore = await page.evaluate(() => window.scrollY);
    await country.click();
    const option = page.getByRole('option', { name: '+91', exact: true });
    await option.waitFor();
    assert.equal(await page.evaluate(() => window.scrollY), scrollBefore, 'Opening a dropdown must not scroll the page');
    assert.equal(await country.evaluate((node) => node.firstElementChild.scrollWidth <= node.firstElementChild.clientWidth), true, 'Country prefix remains fully visible');
    assert.equal(await page.getByRole('listbox').evaluate((node) => node.scrollWidth <= node.clientWidth), true, 'Dropdown has no horizontal scrollbar');
    assert.equal(await country.evaluate((node) => node.offsetHeight), 40);
    assert.equal(await page.locator('#fixture-phone').evaluate((node) => node.offsetHeight), 40);
    await option.click();
    assert.equal(await page.evaluate(() => window.scrollY), scrollBefore, 'Selecting must not move the page');
    await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
    await page.setViewportSize({ width: 1280, height: 900 });
    const containerMetrics = await page.locator('section[aria-labelledby="shop-by-brand-heading"] .store-container, section:has(.product-card) .store-container, footer .store-container').evaluateAll((nodes) => nodes.map((node) => ({ left: Math.round(node.getBoundingClientRect().left), width: Math.round(node.getBoundingClientRect().width) })));
    assert.equal(containerMetrics.length, 3);
    assert.equal(new Set(containerMetrics.map((item) => item.left + ':' + item.width)).size, 1, 'Brand, product and footer containers align');
    assert.equal(await page.locator('footer').getByRole('heading').count(), 0, 'Slim footer has no quick-link columns');
    const cards = page.locator('.product-card');
    const positions = await cards.evaluateAll((nodes) => nodes.slice(0, 5).map((node) => Math.round(node.getBoundingClientRect().top)));
    assert.equal(new Set(positions).size, 1, 'Five desktop product cards share one row');
    assert.equal(await cards.first().getByRole('button', { name: 'Add to Cart', exact: true }).evaluate((node) => node.offsetHeight), 36);
    await page.getByRole('heading', { name: 'New Arrivals', exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(outputDir, 'desktop-product-cards.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Open filters' }).click();
    await page.getByRole('checkbox', { name: 'Casio', exact: true }).check();
    await page.getByRole('checkbox', { name: 'Hublot', exact: true }).check();
    assert.equal(await page.getByTestId('applied-filters').textContent(), 'null');
    await page.getByRole('button', { name: /Apply filters/ }).click();
    assert.equal(JSON.parse(await page.getByTestId('applied-filters').textContent()).brand, 'casio,hublot');
    await page.getByRole('button', { name: 'Open filters' }).click();
    await page.getByRole('spinbutton', { name: 'Minimum price', exact: true }).fill('1000');
    await page.getByRole('spinbutton', { name: 'Maximum price', exact: true }).fill('500');
    await page.getByRole('button', { name: /Apply filters/ }).click();
    assert.match(await page.getByRole('alert').textContent(), /Maximum price/);
    await page.screenshot({ path: path.join(outputDir, 'mobile-filter-drawer.png'), fullPage: false });
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog').count(), 0);
    // Mount actual admin pages with read-only fixture API responses.
    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      assert.equal(route.request().method(), 'GET', 'UI inspection must not write to APIs');
      let data = {};
      if (url.pathname.includes('categories')) data = { categories: [{ id: 'w', name: 'Watches' }] };
      else if (url.pathname.includes('brands')) data = { brands: [{ id: 'c', name: 'Casio', slug: 'casio', sortOrder: 1 }] };
      else if (url.pathname.includes('products')) data = { products: [], pagination: { page: 1, totalPages: 1, total: 0 } };
      else if (url.pathname.includes('settings')) data = { settings: { storeName: 'Fixture store', contactEmail: 'test@example.com', contactPhone: '+919876543210', whatsappNumber: '+919876543210' } };
      await route.fulfill({ json: data });
    });
    const base = 'http://127.0.0.1:' + server.address().port;
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(base + '/?admin=products');
    await page.getByRole('heading', { name: 'Products', exact: true }).waitFor();
    const toolbar = page.locator('[aria-label="Product filters"]');
    const controls = toolbar.locator('input,button[role="combobox"]');
    const metrics = await controls.evaluateAll((nodes) => nodes.map((node) => ({ top: Math.round(node.getBoundingClientRect().top), height: node.offsetHeight })));
    assert.equal(metrics.length, 5);
    assert.equal(new Set(metrics.map((item) => item.top)).size, 1, 'Admin search and four dropdowns share one desktop row');
    assert.ok(metrics.every((item) => item.height === 40), 'All admin filter controls use the same height');
    await page.screenshot({ path: path.join(outputDir, 'admin-product-filters-desktop.png') });
    await page.setViewportSize({ width: 1100, height: 900 });
    await page.evaluate(() => { document.documentElement.style.fontSize = '24px'; });
    assert.equal(new Set(await controls.evaluateAll((nodes) => nodes.map((node) => Math.round(node.getBoundingClientRect().top)))).size, 1, 'All filters stay on one row at narrower desktop and enlarged font');
    await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Admin filters do not overflow mobile');
    await page.goto(base + '/?admin=brands');
    await page.getByRole('button', { name: 'Add Brand', exact: true }).click();
    await page.locator('#brand-sort-order').waitFor();
    const heights = await page.locator('input[type="text"],#brand-sort-order').evaluateAll((nodes) => nodes.map((node) => node.offsetHeight));
    assert.ok(heights.every((height) => height === 40), 'Brand name, slug and display order have consistent heights');
    await page.screenshot({ path: path.join(outputDir, 'admin-brand-form-mobile.png') });
    await page.goto(base + '/?admin=settings');
    await page.getByRole('heading', { name: 'Store Settings', exact: true }).waitFor();
    await page.getByRole('combobox', { name: 'Country Dial Code' }).first().waitFor();
    assert.ok((await page.locator('input[type="text"],input[type="email"],input[type="tel"],button[role="combobox"]').evaluateAll((nodes) => nodes.map((node) => node.offsetHeight))).every((height) => height === 40), 'Settings input and phone-control heights match');
    await page.screenshot({ path: path.join(outputDir, 'admin-settings-mobile.png') });
    assert.deepEqual(errors, []);
    console.log('PASS: mobile 3×3 / desktop 5-brand slides, five desktop product cards, large-font phone controls, no dropdown scroll jumps, keyboard/search selection, draft filters, price validation, Escape, no duplicate-key or browser errors.');
  } finally { await browser?.close(); await new Promise((resolve) => server.close(resolve)); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
