const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/api/analytics/track', (route) => route.fulfill({ json: { success: true } }));
    await page.goto(process.env.APP_TEST_URL || 'http://localhost:3001', { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'New Arrivals', exact: true }).waitFor();
    const reject = page.getByRole('button', { name: 'Reject', exact: true });
    if (await reject.isVisible()) await reject.click();
    for (const width of [1920, 1440, 390]) {
      await page.setViewportSize({ width, height: 1080 });
      for (const fontSize of ['16px', '24px']) {
        await page.evaluate((size) => { document.documentElement.style.fontSize = size; }, fontSize);
        const containers = await page.locator('.store-container').evaluateAll((nodes) => nodes.filter((node) => node.getClientRects().length).map((node) => { const rect = node.getBoundingClientRect(); return { left: Math.round(rect.left), width: Math.round(rect.width), padding: getComputedStyle(node).paddingInline }; }));
        assert.ok(containers.length >= 8, 'All homepage sections must use the shared container');
        assert.equal(new Set(containers.map((item) => JSON.stringify(item))).size, 1, 'Homepage container alignment at ' + width + '/' + fontSize + ': ' + JSON.stringify(containers));
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No page overflow at ' + width + '/' + fontSize);
      }
    }
    await page.setViewportSize({ width: 1920, height: 1080 });
    const arrivals = page.locator('section').filter({ has: page.getByRole('heading', { name: 'New Arrivals', exact: true }) });
    await arrivals.scrollIntoViewIfNeeded();
    await arrivals.screenshot({ path: 'test-results/aligned-home-arrivals-desktop.png' });
    const footer = page.locator('footer');
    assert.equal(await footer.getByRole('heading').count(), 0, 'Quick-link columns are removed');
    assert.ok(await footer.evaluate((node) => node.offsetHeight < 180), 'Desktop footer stays slim');
    await footer.screenshot({ path: 'test-results/slim-footer-desktop.png' });
    await footer.getByRole('button', { name: 'Cookie settings', exact: true }).click();
    await page.getByText('Your cookie choice', { exact: true }).waitFor();
    assert.deepEqual(errors, []);
    console.log('PASS: all homepage containers align at 1920/1440/390px and normal/enlarged fonts; no page overflow; quick-link columns removed; slim footer and cookie settings work.');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
