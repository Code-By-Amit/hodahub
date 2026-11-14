import dotenv from 'dotenv';
import assert from 'node:assert/strict';
import pg from 'pg';
import jwt from 'jsonwebtoken';
import { chromium } from 'playwright';
import { databaseConnectionConfig } from '../../src/lib/db/connection-config.js';
dotenv.config({ path: '.env.local', quiet: true });
const client = new pg.Client(databaseConnectionConfig(process.env.DATABASE_URL));
let browser;
try {
  await client.connect();
  const { rows } = await client.query("SELECT id,role,session_version FROM users WHERE role='admin' LIMIT 1");
  if (!rows.length) throw new Error('No existing admin account available for read-only UI inspection');
  const user = rows[0];
  const token = jwt.sign({ id: user.id, role: user.role, sessionVersion: user.session_version }, process.env.JWT_SECRET, { expiresIn: '3m' });
  browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addCookies([{ name: 'access_token', value: token, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' }]);
  const page = await context.newPage();
  await page.route('**/api/**', (route) => route.request().method() === 'GET' ? route.continue() : route.fulfill({ status: 403, json: { error: 'Read-only UI inspection' } }));
  for (const port of (process.env.ADMIN_UI_TEST_PORTS || '3000,3001').split(',')) {
    const base = 'http://localhost:' + port;
    await page.goto(base + '/admin/products', { timeout: 90000 });
    await page.getByRole('heading', { name: 'Products', exact: true }).waitFor({ timeout: 60000 });
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.admin-product-search')).display === 'flex');
    for (const width of [1440, 1100]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const fontSize of ['16px', '24px']) {
        await page.evaluate((size) => { document.documentElement.style.fontSize = size; }, fontSize);
        const positions = await page.locator('[aria-label="Product filters"]').locator('input,button[role="combobox"]').evaluateAll((nodes) => nodes.map((node) => ({ top: Math.round(node.getBoundingClientRect().top), height: node.offsetHeight })));
        assert.equal(new Set(positions.map((item) => item.top)).size, 1, 'Desktop filters must share one row at ' + width + '/' + fontSize + ': ' + JSON.stringify(positions));
        assert.ok(positions.every((item) => item.height === 40));
      }
    }
    await page.evaluate(() => { document.documentElement.style.fontSize = '16px'; });
    console.log('Products ' + port, JSON.stringify(await page.locator('[aria-label="Product filters"]').evaluate((node) => ({ classes: node.className, display: getComputedStyle(node).display, columns: getComputedStyle(node).gridTemplateColumns, rootFont: getComputedStyle(document.documentElement).fontSize, controls: Array.from(node.querySelectorAll('input,button[role=combobox]')).map((e) => ({ top: e.getBoundingClientRect().top, height: e.offsetHeight, width: e.offsetWidth })) }))));
    await page.goto(base + '/admin/settings', { timeout: 90000 });
    await page.getByRole('heading', { name: 'Store Settings', exact: true }).waitFor({ timeout: 60000 });
    await page.getByRole('combobox', { name: 'Country Dial Code' }).first().waitFor();
    for (const fontSize of ['16px', '24px']) {
      await page.evaluate((size) => { document.documentElement.style.fontSize = size; }, fontSize);
      for (const selector of await page.getByRole('combobox', { name: 'Country Dial Code' }).all()) {
        const metrics = await selector.evaluate((node) => ({ height: node.offsetHeight, visible: node.firstElementChild.scrollWidth <= node.firstElementChild.clientWidth }));
        assert.equal(metrics.height, 40);
        assert.equal(metrics.visible, true, 'Full dial code must remain visible');
      }
      assert.ok((await page.locator('input[type="tel"]').evaluateAll((nodes) => nodes.map((node) => node.offsetHeight))).every((height) => height === 40));
    }
    console.log('Settings ' + port, JSON.stringify(await page.getByRole('combobox', { name: 'Country Dial Code' }).first().evaluate((node) => ({ classes: node.className, label: node.textContent, height: node.offsetHeight, width: node.offsetWidth, font: getComputedStyle(node).fontSize, prefixWidth: node.parentElement.parentElement.offsetWidth, inputHeight: document.querySelector('input[type=tel]').offsetHeight }))));
  }
} finally { await browser?.close(); await client.end(); }
