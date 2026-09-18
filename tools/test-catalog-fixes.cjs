'use strict';
// Idempotent integration fixes: keep the same assertions and never touch catalogue records.
const fs = require('node:fs');
const assert = require('node:assert/strict');
function replace(file, before, after) {
  const text = fs.readFileSync(file, 'utf8');
  if (text.includes(after)) return;
  assert.ok(text.includes(before), `Missing integration anchor: ${file}`);
  fs.writeFileSync(file, text.replace(before, after));
}
replace('assets/admin-store.js', 'this.token = token; this.fetch = fetchImpl;', 'this.token = token; this.fetch = fetchImpl.bind(globalThis);');
replace('admin.html', '<div class="lock-mark" aria-hidden="true">⌑</div>', '<div class="lock-mark" aria-hidden="true"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 14v3"/></svg></div>');
replace('tools/test-catalog-browser.cjs', "page.on('pageerror', error => errors.push(error.message));", "page.on('pageerror', error => { errors.push(error.message); console.error('PAGE ERROR:', error.message); }); page.on('requestfailed', request => console.error('REQUEST FAILED:', new URL(request.url()).pathname, request.failure()?.errorText));");
replace('tools/test-catalog-browser.cjs', "await page.waitForFunction(() => document.getElementById('login-status').textContent.includes('Token inválido'));", "try { await page.waitForFunction(() => document.getElementById('login-status').textContent.includes('Token inválido')); } catch (error) { console.error('LOGIN STATUS:', await page.locator('#login-status').textContent(), 'SCRIPT ERRORS:', errors, 'MOCK REQUESTS:', mock.state.requests.map(r => [r.method, r.route])); await page.screenshot({ path: path.join(screenshots, `admin-login-failure-${width}.png`), fullPage: true }); throw error; }");
replace('tools/test-catalog-browser.cjs', "await page.locator('#workspace').waitFor({ state: 'visible' });", "await page.waitForFunction(() => !document.getElementById('workspace').hidden || document.getElementById('login-status').classList.contains('error')); if (await page.locator('#workspace').isHidden()) { console.error('AUTHENTICATED LOAD:', await page.locator('#login-status').textContent(), 'SCRIPT ERRORS:', errors, 'MOCK REQUESTS:', mock.state.requests.map(r => [r.method, r.route])); await page.screenshot({ path: path.join(screenshots, `admin-load-failure-${width}.png`), fullPage: true }); throw new Error('Authenticated catalogue did not open'); }");
const tests = 'tools/test-catalog-admin.cjs';
if (!fs.readFileSync(tests, 'utf8').includes('Fetch receiver is the browser global')) fs.appendFileSync(tests, `\ntest('Fetch receiver is the browser global, not the repository instance', async () => {\n  const StoreForReceiver = require('../assets/admin-store.js');\n  const repo = new StoreForReceiver.Repository({ token: 'test-only', fetchImpl: async function () {\n    assert.equal(this, globalThis);\n    return { ok: true, status: 200, json: async () => ({ full_name: 'alejoherrera05-del/Maderarte', permissions: { push: true } }) };\n  } });\n  await repo.verifyAccess();\n});\n`);
console.log('Browser compatibility and login diagnostics applied.');
