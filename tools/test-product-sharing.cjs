'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const products = JSON.parse(fs.readFileSync(path.join(root, 'data/productos-publicos.json'), 'utf8'));
const oslo = products.find(product => product.nombre === 'Comedor Oslo') || products[0];
assert.ok(oslo, 'The real catalogue contains a product to review');
const slug = value => String(value || 'pieza').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const osloPath = `/catalogo/producto/${slug(oslo.nombre)}-${oslo.id}/`;
const screenshots = process.env.REVIEW_SCREENSHOT_DIR || '/tmp/maderarte-review';
fs.mkdirSync(screenshots, { recursive: true });
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.jpg':'image/jpeg', '.png':'image/png', '.svg':'image/svg+xml', '.webp':'image/webp', '.otf':'font/otf', '.ttf':'font/ttf' };
let checks = 0;
function check(value, message) { assert.ok(value, message); checks++; }

async function main() {
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let file = path.resolve(root, '.' + pathname);
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type':mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({ headless:true, executablePath:process.env.CHROME_PATH || undefined });
    for (const viewport of [{width:390,height:844}, {width:700,height:390}, {width:956,height:440}, {width:1440,height:1000}]) {
      const mobile = viewport.width !== 1440;
      const context = await browser.newContext({ viewport, isMobile:mobile, hasTouch:mobile });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await context.addInitScript(() => {
        sessionStorage.setItem('maderarte-security-notice-2026-09', 'dismissed');
        window.__shares = []; window.__copies = []; window.__shareMode = 'success'; window.__copyMode = 'success';
        Object.defineProperty(navigator, 'share', { configurable:true, value:data => {
          window.__shares.push({ ...data, activated:navigator.userActivation.isActive });
          if (window.__shareMode === 'cancel') return Promise.reject(new DOMException('Cancelled', 'AbortError'));
          if (window.__shareMode === 'blocked') return Promise.reject(new DOMException('Blocked', 'NotAllowedError'));
          if (window.__shareMode === 'pending') return new Promise(resolve => { window.__finishShare = resolve; });
          return Promise.resolve();
        }});
        Object.defineProperty(navigator, 'clipboard', { configurable:true, value:{ writeText:text => {
          if (window.__copyMode === 'blocked') return Promise.reject(new DOMException('Blocked', 'NotAllowedError'));
          window.__copies.push(text); return Promise.resolve();
        }}});
      });
      await page.goto(base + osloPath, { waitUntil:'domcontentloaded' });
      await page.locator('#catalog-modal.open').waitFor();
      const share = page.locator(viewport.width <= 680 ? '#dialog-mobile-share' : '#dialog-copy-link');
      const float = page.locator('#whatsapp-float');
      check(await float.isVisible(), `${viewport.width}: WhatsApp remains visible in product`);
      check(await float.evaluate(el => !!el.closest('[role="dialog"][aria-modal="true"]')), `${viewport.width}: WhatsApp belongs to the active modal for assistive technology`);
      check(await float.evaluate(el => {
        const r = el.getBoundingClientRect();
        return r.width >= 44 && r.height >= 44 && r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight && r.top >= 0 && el.contains(document.elementFromPoint(r.left + r.width/2, r.top + r.height/2));
      }), `${viewport.width}: floating WhatsApp is fully inside viewport and receives taps`);
      const wa = new URL(await float.getAttribute('href'));
      check(wa.pathname === '/573117476465' && wa.searchParams.get('text').includes(oslo.nombre) && wa.searchParams.get('text').includes(osloPath), `${viewport.width}: consultation contains exact product and URL`);
      check(await page.locator('#dialog-whatsapp').count() === 0, `${viewport.width}: the old bottom advisor CTA is removed`);
      await share.click();
      const shared = await page.evaluate(() => window.__shares.at(-1));
      check(shared.activated && shared.url === base + osloPath && shared.title.includes(oslo.nombre), `${viewport.width}: sharing starts from the actual tap with product-specific URL`);
      check(!await page.locator('#product-share-dialog').isVisible(), `${viewport.width}: native sharing does not open a second dialog`);

      await page.evaluate(() => { window.__shareMode = 'cancel'; });
      await share.click();
      check(!await page.locator('#product-share-dialog').isVisible(), `${viewport.width}: cancelling native share respects user choice`);
      await page.evaluate(() => { window.__shareMode = 'blocked'; });
      await share.click();
      await page.locator('#product-share-dialog[open]').waitFor();
      check(await page.locator('#product-share-url').inputValue() === base + osloPath, `${viewport.width}: blocked native share exposes correct link`);
      check(await page.evaluate(() => window.__copies.length === 0), `${viewport.width}: clipboard is attempted only after a new user action`);
      const sendLink = new URL(await page.locator('#product-share-whatsapp').getAttribute('href'));
      check(sendLink.pathname === '/' && sendLink.searchParams.get('text').includes(base + osloPath), `${viewport.width}: sharing through WhatsApp lets user choose recipient`);
      await page.locator('#product-share-copy').click();
      await page.waitForFunction(() => document.getElementById('product-share-feedback').textContent.includes('Enlace copiado'));
      check(await page.evaluate(() => window.__copies.at(-1)) === base + osloPath, `${viewport.width}: copy writes the full product link`);
      await page.screenshot({path:path.join(screenshots, `share-options-${viewport.width}.png`)});
      await page.keyboard.press('Escape');
      check(!await page.locator('#product-share-dialog').isVisible() && await page.locator('#catalog-modal').isVisible(), `${viewport.width}: Escape closes only share options`);

      await page.evaluate(() => { Object.defineProperty(navigator, 'share', { configurable:true, value:undefined }); window.__copyMode = 'blocked'; });
      await share.click();
      await page.locator('#product-share-copy').click();
      await page.waitForFunction(() => document.getElementById('product-share-feedback').textContent.includes('mantén presionado'));
      check(await page.locator('#product-share-url').evaluate(input => input.selectionStart === 0 && input.selectionEnd === input.value.length), `${viewport.width}: clipboard denial leaves a selectable link and visible instructions`);
      await page.locator('#product-share-close').click();
      await page.locator('.catalog-dialog-copy').evaluate(el => { el.scrollTop = el.scrollHeight; });
      check(await float.evaluate(el => { const r=el.getBoundingClientRect(); return r.bottom <= innerHeight && el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)); }), `${viewport.width}: WhatsApp remains reachable after scrolling details`);
      await page.screenshot({path:path.join(screenshots, `product-actions-${viewport.width}.png`)});

      await page.locator(viewport.width <= 680 ? '#catalog-mobile-back' : '#catalog-close').click();
      await page.waitForURL('**/catalogo/');
      await page.locator('.product-card').first().waitFor();
      check(await page.locator('.product-card').count() === products.length, `${viewport.width}: closing a direct product URL returns to the real catalogue`);
      check(await float.isVisible(), `${viewport.width}: WhatsApp is visible outside the product too`);
      check(!new URL(await float.getAttribute('href')).searchParams.get('text').includes(osloPath), `${viewport.width}: general WhatsApp does not retain stale product`);
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${viewport.width}: catalogue does not overflow horizontally`);
      check(errors.length === 0, `${viewport.width}: no script errors: ${errors.join('; ')}`);
      await context.close();
    }

    // Keep the commercial access parameter on the unique product page too.
    const page = await browser.newPage({ viewport:{width:390,height:844}, isMobile:true, hasTouch:true });
    await page.addInitScript(() => {
      sessionStorage.setItem('maderarte-security-notice-2026-09', 'dismissed');
      window.__shares = [];
      Object.defineProperty(navigator, 'share', {value:data => {window.__shares.push(data); return Promise.resolve();}});
    });
    await page.goto(base + osloPath + '?precios=maderarte2026', {waitUntil:'domcontentloaded'});
    await page.locator('#catalog-modal.open').waitFor();
    const options = page.locator('#dialog-options .size-btn');
    if(await options.count()) {
      await options.last().click();
      const selected = await options.last().getAttribute('data-variant-label');
      check(new URL(await page.locator('#whatsapp-float').getAttribute('href')).searchParams.get('text').includes(selected), 'WhatsApp consultation includes selected size');
    }
    await page.locator('#dialog-mobile-share').click();
    check(await page.evaluate(() => window.__shares.at(-1).url) === base + osloPath + '?precios=maderarte2026', 'Priced share retains a product-specific page for its thumbnail');
    check((await page.locator('meta[name="robots"]').getAttribute('content')).includes('noindex'), 'Commercial price links keep their existing noindex behavior');
    await page.close();
    console.log(`PRODUCT SHARING OK: ${checks} checks; native/blocked/cancelled share, copy fallback, WhatsApp, direct links, 390/700/956/1440px. No messages sent.`);
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
