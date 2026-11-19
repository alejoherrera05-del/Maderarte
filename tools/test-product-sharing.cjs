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
    for (const viewport of [{width:320,height:844}, {width:390,height:844}, {width:700,height:390}, {width:956,height:440}, {width:1440,height:1000}]) {
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
      await page.evaluate(async () => { await document.fonts.ready; });
      const share = page.locator(viewport.width <= 680 ? '#dialog-mobile-share' : '#dialog-copy-link');
      const quote = page.locator(viewport.width <= 680 ? '#dialog-mobile-quote' : '#dialog-quote');
      await quote.scrollIntoViewIfNeeded();
      await page.screenshot({path:path.join(screenshots, `product-actions-${viewport.width}.png`)});
      check(await page.locator('#whatsapp-float, .mobile-whatsapp-float').count() === 0, `${viewport.width}: floating WhatsApp is removed`);
      check(await quote.isVisible() && await quote.locator('span').innerText() === 'Cotizar' && await quote.locator('svg.dialog-whatsapp-icon').isVisible(), `${viewport.width}: quote action has a visible Cotizar label and WhatsApp icon`);
      check(await quote.evaluate(el => !!el.closest('[role="dialog"][aria-modal="true"]')), `${viewport.width}: quote action belongs to the active modal for assistive technology`);
      const row = await quote.evaluate(el => {
        const mobile = innerWidth <= 680;
        const controls = [
          document.getElementById(mobile ? 'dialog-mobile-favorite' : 'dialog-favorite'),
          document.getElementById(mobile ? 'dialog-mobile-share' : 'dialog-copy-link'),
          el,
        ];
        const rects = controls.map(control => control.getBoundingClientRect());
        const actionRow = el.closest('.dialog-mobile-actions, .dialog-actions');
        const label = el.querySelector('span');
        const range = document.createRange();
        range.selectNodeContents(label);
        const text = range.getBoundingClientRect();
        const quoteRect = el.getBoundingClientRect();
        const topbar = mobile ? el.closest('.dialog-mobile-topbar') : actionRow;
        const back = mobile ? document.getElementById('catalog-mobile-back').getBoundingClientRect() : null;
        return {
          sameRow:rects.every(r => Math.abs((r.top + r.height/2) - (quoteRect.top + quoteRect.height/2)) <= 2),
          separate:rects.every((r, i) => rects.every((other, j) => i === j || r.right <= other.left + 1 || other.right <= r.left + 1)),
          targets:rects.every(r => r.width >= 44 && r.height >= 44),
          tappable:controls.every((control, i) => {
            const r = rects[i];
            return r.left >= 0 && r.right <= innerWidth + 1 && r.top >= 0 && r.bottom <= innerHeight + 1 && control.contains(document.elementFromPoint(r.left + r.width/2, r.top + r.height/2));
          }),
          inline:getComputedStyle(el).position !== 'fixed' && getComputedStyle(actionRow).position !== 'fixed',
          fullLabel:text.width > 0 && text.height > 0 && text.left >= quoteRect.left && text.right <= quoteRect.right + 1 && text.top >= quoteRect.top && text.bottom <= quoteRect.bottom + 1,
          noOverflow:topbar.scrollWidth <= topbar.clientWidth + 1 && document.documentElement.scrollWidth <= innerWidth + 1 && (!back || (back.left >= 0 && back.right <= Math.min(...rects.map(r => r.left)) + 1)),
        };
      });
      check(row.sameRow && row.separate && row.inline, `${viewport.width}: Cotizar, favorite and share occupy one inline row without overlap: ${JSON.stringify(row)}`);
      check(row.targets && row.tappable, `${viewport.width}: every product action is at least 44px and receives taps inside the viewport: ${JSON.stringify(row)}`);
      check(row.fullLabel && row.noOverflow, `${viewport.width}: Cotizar stays fully readable and the action row fits without horizontal overflow: ${JSON.stringify(row)}`);
      const quoteLinks = await page.locator('[data-product-whatsapp]').evaluateAll(links => links.map(link => link.href));
      check(quoteLinks.length === 2 && quoteLinks.every(href => {
        const wa = new URL(href);
        const text = wa.searchParams.get('text') || '';
        return wa.protocol === 'https:' && wa.hostname === 'wa.me' && wa.pathname === '/573117476465' && text.includes(oslo.nombre) && text.includes(base + osloPath) && /cotizar/i.test(text);
      }), `${viewport.width}: both quote links contain the exact product, URL and quote request`);
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

      await page.locator(viewport.width <= 680 ? '#catalog-mobile-back' : '#catalog-close').click();
      await page.waitForURL('**/catalogo/');
      await page.locator('.product-card').first().waitFor();
      check(await page.locator('.product-card').count() === products.length, `${viewport.width}: closing a direct product URL returns to the real catalogue`);
      check(await page.locator('#whatsapp-float, .mobile-whatsapp-float').count() === 0 && await page.locator('.dialog-quote:visible').count() === 0, `${viewport.width}: closing the product leaves no floating or visible product quote action in the catalogue`);
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
      const quoteLinks = await page.locator('[data-product-whatsapp]').evaluateAll(links => links.map(link => link.href));
      check(quoteLinks.length === 2 && quoteLinks.every(href => new URL(href).searchParams.get('text').includes(selected)), 'Both WhatsApp quote links include the selected size');
    }
    await page.locator('#dialog-mobile-share').click();
    check(await page.evaluate(() => window.__shares.at(-1).url) === base + osloPath + '?precios=maderarte2026', 'Priced share retains a product-specific page for its thumbnail');
    check((await page.locator('meta[name="robots"]').getAttribute('content')).includes('noindex'), 'Commercial price links keep their existing noindex behavior');
    await page.close();
    console.log(`PRODUCT SHARING OK: ${checks} checks; native/blocked/cancelled share, copy fallback, inline Cotizar, direct links, 320/390/700/956/1440px. No messages sent.`);
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
