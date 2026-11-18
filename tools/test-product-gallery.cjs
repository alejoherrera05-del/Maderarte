// Browser regression for full-size product photos, especially wide phones in landscape.
// All traffic and fixtures stay in this local server; no catalogue data is published.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const screenshots = path.resolve(process.env.REVIEW_SCREENSHOT_DIR || path.join(root, 'review-screenshots'));
const products = JSON.parse(fs.readFileSync(path.join(root, 'data/productos-publicos.json'), 'utf8'));
const oslo = products.find(product => /^comedor oslo$/i.test(product.nombre))
  || products.find(product => product.imagenes?.length >= 5);
const other = products.find(product => /^sala oslo$/i.test(product.nombre))
  || products.find(product => product.id !== oslo?.id && product.imagenes?.length >= 3);
assert.ok(oslo && other, 'The catalogue must provide two galleries to review.');

const fixture = {
  id: 9999999999991,
  nombre: 'Galería de prueba local',
  categoria: 'comedores',
  descripcion: 'Imágenes sintéticas usadas exclusivamente por esta prueba.',
  imagenes: ['/__gallery-test/wide.svg', '/__gallery-test/small.svg', '/__gallery-test/portrait.svg']
};
const fixtures = {
  'wide.svg': [1200, 300],
  'small.svg': [24, 18],
  'portrait.svg': [600, 900]
};
const mime = { '.html': 'text/html', '.json': 'application/json', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const results = [];
let checks = 0;
function check(condition, message) { assert.ok(condition, message); checks++; }

(async () => {
  fs.mkdirSync(screenshots, { recursive: true });
  const server = http.createServer((request, response) => {
    let route = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (route.startsWith('/__gallery-test/')) {
      const dimensions = fixtures[path.basename(route)];
      if (!dimensions) { response.writeHead(404); response.end(); return; }
      const [width, height] = dimensions;
      response.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store' });
      response.end(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#9f7a48"/><path d="M0 0L${width} ${height}M${width} 0L0 ${height}" stroke="#ffffff" stroke-width="${Math.max(1, width / 50)}"/></svg>`);
      return;
    }
    if (route.endsWith('/')) route += 'index.html';
    else if (!path.extname(route)) route += '/index.html';
    const file = path.resolve(root, '.' + route);
    if (!file.startsWith(root + path.sep)) { response.writeHead(403); response.end(); return; }
    fs.readFile(file, (error, content) => {
      response.writeHead(error ? 404 : 200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      response.end(error ? 'Not found' : content);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: true, args: ['--no-sandbox'] });

    async function createPage(viewport, fixtureOnly = false) {
      const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.origin !== base) return route.abort();
        if (fixtureOnly && url.pathname === '/data/productos-publicos.json') {
          return route.fulfill({ contentType: 'application/json', body: JSON.stringify([fixture]) });
        }
        return route.continue();
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      return { context, page, errors };
    }

    async function openGallery(page, product) {
      await page.goto(`${base}/?producto=${product.id}`, { waitUntil: 'domcontentloaded' });
      if (await page.locator('.maderarte-notice-close').isVisible()) await page.locator('.maderarte-notice-close').click();
      await page.locator('#catalog-modal.open').waitFor();
      await page.locator('.catalog-dialog').evaluate(dialog => Promise.all(dialog.getAnimations().map(animation => animation.finished)));
      if (page.viewportSize().width > page.viewportSize().height) {
        const layout = await page.evaluate(() => {
          const media = document.getElementById('catalog-dialog-media').getBoundingClientRect();
          const copy = document.querySelector('.catalog-dialog-copy').getBoundingClientRect();
          return { media: media.toJSON(), copy: copy.toJSON(), viewport: [innerWidth, innerHeight] };
        });
        check(layout.media.right <= layout.copy.x + 1, 'Landscape product detail uses two columns');
        check(layout.media.height > 150 && layout.copy.height > 150, 'Landscape image and scrollable details both remain usable');
        check(layout.copy.bottom <= layout.viewport[1] + 1, 'Landscape details are inside the viewport, not clipped below the image');
      }
      await page.locator('#dialog-image').click();
      await page.locator('#image-lightbox.open').waitFor();
    }

    async function inspectPhoto(page, product, index, label) {
      const expectedPath = new URL(product.imagenes[index], base).pathname;
      await page.waitForFunction(({ expectedPath, index, length }) => {
        const image = document.getElementById('image-lightbox-img');
        return image?.complete && image.naturalWidth > 0
          && new URL(image.currentSrc || image.src).pathname === expectedPath
          && document.getElementById('image-lightbox-count').textContent === `${index + 1} / ${length}`;
      }, { expectedPath, index, length: product.imagenes.length });
      await page.locator('#image-lightbox-img').evaluate(image => image.decode());
      await page.locator('#image-lightbox-img').evaluate(image => Promise.all(image.getAnimations().map(animation => animation.finished)));
      const dimensions = await page.locator('#image-lightbox-img').evaluate(image => {
        const rect = image.getBoundingClientRect();
        const style = getComputedStyle(image);
        return {
          width: rect.width, height: rect.height, x: rect.x, y: rect.y,
          viewport: [innerWidth, innerHeight], natural: [image.naturalWidth, image.naturalHeight],
          objectFit: style.objectFit, transform: style.transform,
          overflow: document.documentElement.scrollWidth > innerWidth + 1
        };
      });
      const prefix = `${label}: photo ${index + 1}/${product.imagenes.length}`;
      check(Math.abs(dimensions.width - dimensions.viewport[0]) <= 1, `${prefix}: full viewport width, including phones over 900px wide`);
      check(Math.abs(dimensions.height - dimensions.viewport[1]) <= 1, `${prefix}: full viewport height, regardless of natural image size`);
      check(Math.abs(dimensions.x) <= 1 && Math.abs(dimensions.y) <= 1, `${prefix}: viewing surface remains centred`);
      check(dimensions.objectFit === 'contain', `${prefix}: the whole original image remains visible without cropping`);
      check(!dimensions.overflow, `${prefix}: no horizontal page overflow`);
      results.push({ label, photo: index + 1, ...dimensions });
      return dimensions;
    }

    async function swipeNext(page) {
      await page.locator('#image-lightbox').evaluate(lightbox => {
        const from = new Touch({ identifier: 1, target: lightbox, clientX: innerWidth * .75, clientY: innerHeight * .5 });
        const to = new Touch({ identifier: 1, target: lightbox, clientX: innerWidth * .2, clientY: innerHeight * .5 });
        lightbox.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [from], changedTouches: [from] }));
        lightbox.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches: [to], changedTouches: [to] }));
        lightbox.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [], changedTouches: [to] }));
      });
    }

    for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 956, height: 440 }]) {
      const { context, page, errors } = await createPage(viewport);
      for (const product of [oslo, other]) {
        await openGallery(page, product);
        const label = `${product.id}-${viewport.width}x${viewport.height}`;
        for (let index = 0; index < product.imagenes.length; index++) {
          await inspectPhoto(page, product, index, label);
          if (index === 0 || index === product.imagenes.length - 1) {
            await page.screenshot({ path: path.join(screenshots, `gallery-${label}-photo-${index + 1}.png`) });
          }
          if (index < product.imagenes.length - 1) {
            if (index % 2) await swipeNext(page);
            else await page.locator('#image-lightbox-next').tap();
          }
        }
        // Several rapid taps can cancel image requests. The final photo must still fit.
        const count = product.imagenes.length * 2 + 2;
        await page.locator('#image-lightbox-next').evaluate((button, count) => { for (let n = 0; n < count; n++) button.click(); }, count);
        await inspectPhoto(page, product, (product.imagenes.length - 1 + count) % product.imagenes.length, `${label}-rapid`);
        await page.locator('#image-lightbox-close').tap();
        check(await page.locator('#catalog-modal').getAttribute('aria-hidden') === 'false', `${label}: closing the photo returns to its product`);
      }
      check(errors.length === 0, `${viewport.width}: no JavaScript errors: ${errors.join('; ')}`);
      await context.close();
    }

    // Mixed intrinsic dimensions, including a tiny source, must not shrink the viewer.
    const { context, page, errors } = await createPage({ width: 390, height: 844 }, true);
    await openGallery(page, fixture);
    for (let index = 0; index < fixture.imagenes.length; index++) {
      await inspectPhoto(page, fixture, index, 'mixed-dimensions');
      if (index < fixture.imagenes.length - 1) await swipeNext(page);
    }
    for (const viewport of [{ width: 956, height: 440 }, { width: 844, height: 390 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await inspectPhoto(page, fixture, 2, `rotated-${viewport.width}x${viewport.height}`);
    }
    await page.setViewportSize({ width: 956, height: 440 });
    await page.waitForFunction(() => !lightboxGesture.ignoreClick);
    await page.locator('#image-lightbox-img').click();
    await page.locator('#image-lightbox.zoomed').waitFor();
    await page.locator('#image-lightbox').evaluate(lightbox => {
      const from = new Touch({ identifier: 2, target: lightbox, clientX: innerWidth / 2, clientY: innerHeight / 2 });
      const to = new Touch({ identifier: 2, target: lightbox, clientX: innerWidth * 2, clientY: innerHeight * 2 });
      lightbox.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [from], changedTouches: [from] }));
      lightbox.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches: [to], changedTouches: [to] }));
      lightbox.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [], changedTouches: [to] }));
    });
    check(await page.locator('#image-lightbox-img').evaluate(image => image.style.getPropertyValue('--pan-x') === '0px'), 'A narrow portrait image cannot be dragged horizontally out of the landscape viewport');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#image-lightbox-next').tap();
    await inspectPhoto(page, fixture, 0, 'after-zoom-pan-and-rotation');
    await page.waitForFunction(() => !lightboxGesture.ignoreClick);
    await page.locator('#image-lightbox-img').click();
    await page.locator('#image-lightbox.zoomed').waitFor();
    await page.locator('#image-lightbox-prev').tap();
    await inspectPhoto(page, fixture, 2, 'previous-photo-while-zoomed');
    await page.locator('#image-lightbox-img').click();
    await page.locator('#image-lightbox.zoomed').waitFor();
    await page.locator('#image-lightbox-close').tap();
    check(await page.locator('#image-lightbox').getAttribute('aria-hidden') === 'true', 'Touch close remains usable while zoomed');
    check(errors.length === 0, `Mixed gallery: no JavaScript errors: ${errors.join('; ')}`);
    await context.close();
    fs.writeFileSync(path.join(screenshots, 'gallery-dimensions.json'), JSON.stringify(results, null, 2));
    console.log(`GALERÍA OK: ${checks} checks; full-size images, swipes, rapid navigation, portrait/landscape, rotation and zoom bounds.`);
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
