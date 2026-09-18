const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const Order = require('../assets/catalog-order.js');
const { products, mockRepository } = require('./catalog-test-fixture.cjs');
const root = path.resolve(__dirname, '..');
const screenshots = path.resolve(process.env.REVIEW_SCREENSHOT_DIR || path.join(root, 'review-screenshots'));
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const tinyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAwAAAAICAIAAABChommAAAAFUlEQVR4nGP88OkrAyHARFDFsFcEAE16AucbZEQ4AAAAAElFTkSuQmCC', 'base64');
(async () => {
  fs.mkdirSync(screenshots, { recursive: true });
  const server = http.createServer((request, response) => {
    let route = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (route.endsWith('/')) route += 'index.html'; else if (!path.extname(route)) route += '/index.html';
    const file = path.resolve(root, '.' + route);
    if (!file.startsWith(root + path.sep)) { response.writeHead(403); response.end(); return; }
    fs.readFile(file, (error, data) => {
      if (error) {
        if (process.env.LOCAL_NO_ASSETS === '1' && /\.(png|jpe?g|webp|ico)$/i.test(file)) { response.setHeader('Content-Type', 'image/svg+xml'); response.end('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="160"><rect width="200" height="160" fill="#e7e9ec"/></svg>'); return; }
        response.writeHead(404); response.end('Not found'); return;
      }
      response.setHeader('Content-Type', (mime[path.extname(file)] || 'application/octet-stream') + (['.html', '.js', '.css', '.json'].includes(path.extname(file)) ? '; charset=utf-8' : ''));
      response.setHeader('Cache-Control', 'no-store'); response.end(data);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: true, args: ['--no-sandbox'] });
  let checks = 0;
  async function check(condition, message) { assert.ok(condition, message); checks++; console.log('OK:', message); }
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 }, isMobile: width === 390, hasTouch: width === 390 });
      const page = await context.newPage(); const errors = []; page.on('pageerror', error => { errors.push(error.message); console.error('PAGE ERROR:', error.message); }); page.on('requestfailed', request => console.error('REQUEST FAILED:', new URL(request.url()).pathname, request.failure()?.errorText));
      const mock = mockRepository();
      // All GitHub writes are simulated; tests never alter a real product or credential.
      await context.route('https://api.github.com/**', async route => {
        const request = route.request();
        const cors = { 'access-control-allow-origin': base, 'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS', 'access-control-allow-headers': 'authorization,accept,x-github-api-version,content-type' };
        if (request.method() === 'OPTIONS') { await route.fulfill({ status: 204, headers: cors }); return; }
        const headers = request.headers(); headers.Authorization = headers.authorization;
        const response = await mock.fetch(request.url(), { method: request.method(), headers, body: request.postData() });
        await route.fulfill({ status: response.status, headers: cors, contentType: 'application/json', body: JSON.stringify(await response.json()) });
      });
      await context.route('https://fonts.googleapis.com/**', route => route.abort()); await context.route('https://fonts.gstatic.com/**', route => route.abort());
      await page.goto(base + '/admin.html', { waitUntil: 'domcontentloaded' });
      await page.screenshot({ path: path.join(screenshots, `admin-login-${width}.png`), fullPage: true });
      await page.locator('#access-token').fill('invalid-test-token'); await page.locator('#connect').click();
      try { await page.waitForFunction(() => document.getElementById('login-status').textContent.includes('Token inválido')); } catch (error) { console.error('LOGIN STATUS:', await page.locator('#login-status').textContent(), 'SCRIPT ERRORS:', errors, 'MOCK REQUESTS:', mock.state.requests.map(r => [r.method, r.route])); await page.screenshot({ path: path.join(screenshots, `admin-login-failure-${width}.png`), fullPage: true }); throw error; }
      await check(await page.locator('#workspace').isHidden(), `${width}: invalid access keeps editor closed`);
      await page.locator('#access-token').fill('test-only-not-a-real-token'); await page.locator('#connect').click();
      await page.waitForFunction(() => !document.getElementById('workspace').hidden || document.getElementById('login-status').classList.contains('error')); if (await page.locator('#workspace').isHidden()) { console.error('AUTHENTICATED LOAD:', await page.locator('#login-status').textContent(), 'SCRIPT ERRORS:', errors, 'MOCK REQUESTS:', mock.state.requests.map(r => [r.method, r.route])); await page.screenshot({ path: path.join(screenshots, `admin-load-failure-${width}.png`), fullPage: true }); throw new Error('Authenticated catalogue did not open'); }
      await check(await page.locator('.product-row').count() === products.length, `${width}: all products loaded`);
      const actualGroups = await page.locator('.group-head h3').allTextContents();
      assert.deepEqual(actualGroups, Order.categories.filter(c => products.some(p => p.categoria === c.key)).map(c => c.label)); checks++;
      await check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width}: admin has no horizontal overflow`);
      await page.screenshot({ path: path.join(screenshots, `admin-catalog-${width}.png`) });
      await page.locator('#search').fill('MILÁN'); const expectedSearch = Order.sortProducts(products).filter(p => Order.fold([p.nombre, p.descripcion || '', p.id, Order.label(p.categoria), Order.sublabel(p.subcategoria)].join(' ')).includes('milan')).map(p => String(p.id)); assert.ok(expectedSearch.length > 0, 'Search fixture must exercise accent-insensitive matches'); const actualSearch = await page.locator('[data-edit]').evaluateAll(nodes => nodes.map(node => node.dataset.edit)); assert.deepEqual(actualSearch, expectedSearch, `${width}: accent-insensitive search returns exactly the matching products`); checks++;
      await page.locator('#search').fill(''); await page.locator('#category-filter').selectOption('alcobas');
      await check(await page.locator('.product-row').count() === products.filter(p => p.categoria === 'alcobas').length, `${width}: category filter`);
      const bed = products.find(p => p.categoria === 'alcobas'); await page.locator(`[data-edit="${bed.id}"]`).click();
      await check(await page.locator('#price-a160').inputValue() === String(bed.variantesAlcoba.a160), `${width}: existing size variants preserved`);
      await page.locator('#product-description').fill('Descripción de prueba que permanece solo en el entorno simulado.');
      await page.screenshot({ path: path.join(screenshots, `admin-editor-${width}.png`) });
      await page.locator('#save-draft').click(); await page.locator('#product-dialog').waitFor({ state: 'hidden' });
      await check(mock.state.writes === 0, `${width}: save draft does not publish`);
      await page.reload({ waitUntil: 'domcontentloaded' }); await page.locator('#workspace').waitFor({ state: 'visible' });
      await check((await page.locator('#sync-status').textContent()).includes('Borrador recuperado'), `${width}: reload restores pending work`);
      await page.locator('#publish').click(); await page.waitForFunction(() => !document.getElementById('logout').disabled);
      await check(mock.state.writes === 1, `${width}: one atomic publication`);
      const published = JSON.parse(mock.state.text).find(p => p.id === bed.id);
      assert.deepEqual(published.variantesAlcoba, bed.variantesAlcoba); assert.deepEqual(published.imagenes, bed.imagenes); checks++;
      await page.locator('#new-product').click(); await page.locator('#product-category').selectOption(''); await page.locator('#product-name').fill('Alcoba Z prueba');
      await page.locator('#save-draft').click(); await check(await page.locator('#product-dialog').isVisible(), `${width}: category is required`);
      await page.locator('#product-category').selectOption('alcobas');
      await page.locator('#product-images').setInputFiles({ name: 'test.png', mimeType: 'image/png', buffer: tinyPng });
      await page.waitForFunction(() => !document.getElementById('save-draft').disabled);
      await check(await page.locator('.photo-card').count() === 1, `${width}: photo upload succeeds`);
      const uploadedSize = await page.locator('.photo-card img').first().evaluate(async img => { await img.decode(); return [img.naturalWidth, img.naturalHeight]; });
      assert.deepEqual(uploadedSize, [12, 8]); checks++;
      await page.locator('#save-draft').click(); await page.locator('#product-dialog').waitFor({ state: 'hidden' });
      await page.locator('#category-filter').selectOption('alcobas'); await check(await page.locator('.product-row').count() === products.filter(p => p.categoria === 'alcobas').length + 1, `${width}: new bed stays in Alcobas`);
      const remote = JSON.parse(mock.state.text); remote[0].descripcion = 'Actualizado en otro equipo'; mock.state.text = JSON.stringify(remote);
      await page.locator('#publish').click(); await page.waitForFunction(() => document.getElementById('sync-status').textContent.includes('otro equipo'));
      await check(mock.state.writes === 1, `${width}: conflict cannot overwrite newer catalogue`);
      const downloadPromise = page.waitForEvent('download'); await page.locator('#export').click(); const download = await downloadPromise; const exportText = fs.readFileSync(await download.path(), 'utf8');
      await check(!exportText.includes('test-only-not-a-real-token') && JSON.parse(exportText).length === products.length + 1, `${width}: backup includes draft, never credentials`);
      await page.locator('#logout').click(); await page.locator('#read-only').click(); await page.locator('#workspace').waitFor({ state: 'visible' });
      await page.locator('#search').fill('sala'); await check(!(await page.locator('#logout').isDisabled()) && await page.locator('[data-edit]').count() === 0, `${width}: read-only stays read-only and can reconnect`);
      await check(errors.length === 0, `${width}: no admin JavaScript exceptions: ${errors.join('; ')}`);
      await context.close();
    }
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 } });
      const page = await context.newPage(); const errors = []; page.on('pageerror', error => errors.push(error.message));
      await context.route('https://fonts.googleapis.com/**', route => route.abort()); await context.route('https://fonts.gstatic.com/**', route => route.abort());
      await page.goto(base + '/catalogo/', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.product-card');
      if (await page.locator('.maderarte-notice-close').isVisible()) await page.locator('.maderarte-notice-close').click();
      await check(await page.locator('.product-card').count() === products.length, `${width}: public storefront still lists all products`);
      const actual = await page.locator('.product-card').evaluateAll(cards => cards.map(card => Number(card.dataset.productId)));
      assert.deepEqual(actual, Order.sortProducts(products).map(p => p.id)); checks++;
      await check(await page.locator('.catalog-group-heading').count() === Order.groups(products).length, `${width}: visible category headings in all-products view`);
      await check(!/\$\s*[\d.]+/.test(await page.locator('#catalog-grid').innerText()), `${width}: public catalogue contains no price display`);
      await check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width}: storefront has no horizontal overflow`);
      await page.locator('#catalog-grid').scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(screenshots, `public-catalog-${width}.png`) });
      await page.locator('.footer-admin').scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(screenshots, `footer-admin-${width}.png`) });
      await check(await page.locator('.footer-admin').getAttribute('href') === '/admin.html', `${width}: footer uses absolute admin URL`);
      await page.goto(base + '/catalogo/salas/?precios=maderarte2026', { waitUntil: 'domcontentloaded' }); await page.waitForSelector('.product-card');
      await check(/\$\s*[\d.]+/.test(await page.locator('#catalog-grid').innerText()), `${width}: priced link still displays prices`);
      await check(await page.locator('.product-card').count() === products.filter(p => p.categoria === 'salas').length, `${width}: deep category route stays filtered`);
      await check(errors.length === 0, `${width}: no storefront JavaScript exceptions`);
      await context.close();
    }
    console.log(`BROWSER OK: ${checks} checks, desktop 1440 and mobile 390. All GitHub writes mocked.`);
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
