import fs from 'node:fs';
import assert from 'node:assert/strict';
const read = file => fs.readFileSync(file, 'utf8');
const write = (file, text) => fs.writeFileSync(file, text);
function change(text, before, after) { assert.ok(text.includes(before), `Missing anchor: ${before.slice(0, 100)}`); return text.replace(before, after); }
let html = read('admin.html');
if (html.includes('id="access-password"')) { console.log('Access refinement already applied.'); process.exit(0); }
html = html.replaceAll('v=20260918', 'v=20260918b');
html = change(html, '<script src="/assets/admin-catalog.js', '<script src="/assets/admin-access.js?v=20260918b" defer></script>\n  <script src="/assets/admin-catalog.js');
html = change(html, '<body>', '<body class="is-locked">');
html = html.replace(/<header class="topbar">[\s\S]*?<\/header>/, `<header class="topbar"><a class="brand" href="/" aria-label="Volver a Maderarte"><img src="/logomaderarte2026.png" alt="" width="40" height="40"><span class="brand-text"><span>MADERARTE</span><small>Administración</small></span></a><div class="top-actions"><a id="view-catalog" href="/catalogo/" target="_blank" rel="noopener" hidden>Ver catálogo ↗</a><button id="logout" type="button" hidden>Cerrar sesión</button></div></header>`);
html = html.replace(/    <section class="intro">[\s\S]*?<\/section>\n/, '');
const start = html.indexOf('    <section id="login-panel"');
const end = html.indexOf('    <section id="workspace"');
assert.ok(start > 0 && end > start);
const lock = '<div class="lock-mark" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></svg></div>';
html = html.slice(0, start) + `    <section id="login-panel" class="login-card" aria-labelledby="login-title">
      ${lock}
      <h1 id="login-title">Acceso privado</h1>
      <form id="login-form">
        <label for="access-password">Contraseña</label>
        <input id="access-password" type="password" autocomplete="current-password" required maxlength="256" placeholder="Tu contraseña" autofocus>
        <button class="primary" type="submit" id="connect">Entrar</button>
      </form>
      <p id="login-status" class="status" role="status" aria-live="polite"></p>
      <button class="text-button login-extra" id="configure-access" type="button">Configurar este navegador</button>
    </section>
    <section id="setup-panel" class="login-card" aria-labelledby="setup-title" hidden>
      ${lock}
      <h2 id="setup-title">Configurar acceso</h2>
      <p class="hint">Solo una vez en este navegador.</p>
      <form id="setup-form">
        <label for="access-token">Token de GitHub</label>
        <input id="access-token" type="password" autocomplete="off" spellcheck="false" required maxlength="1024" placeholder="Conexión de publicación">
        <label for="new-password">Nueva contraseña</label>
        <input id="new-password" type="password" autocomplete="new-password" required minlength="15" maxlength="256">
        <label for="confirm-password">Repetir contraseña</label>
        <input id="confirm-password" type="password" autocomplete="new-password" required minlength="15" maxlength="256">
        <p class="hint">Mínimo 15 caracteres. Puedes usar una frase.</p>
        <button class="primary" type="submit" id="save-access">Guardar y entrar</button>
      </form>
      <p id="setup-status" class="status" role="status" aria-live="polite"></p>
      <details><summary>Ayuda con la conexión</summary><p>En GitHub, crea un token de acceso detallado limitado a tu repositorio Maderarte, con permiso Contents: Read and write. No uses la contraseña de tu cuenta de GitHub.</p><p>La conexión queda cifrada en este navegador. En otro equipo, o si borras sus datos, tendrás que configurarla de nuevo. Olvidar esta contraseña requiere volver a vincular un token autorizado.</p></details>
      <button class="text-button login-extra" id="back-login" type="button">Volver</button>
    </section>
` + html.slice(end);
html = change(html, '<section id="workspace" hidden', '<section id="workspace" hidden inert');
html = change(html, '<dialog id="product-dialog"', '<dialog id="product-dialog" inert');
html = change(html, '<p class="order-note">Orden automático: categoría → subcategoría Junior → prioridad opcional → nombre. Cambiar fotos no mueve el producto a otra categoría.</p>', '<p class="order-note">Organizado por categorías.</p>');
html = html.replace(/<footer class="admin-footer">[\s\S]*?<\/footer>/, '<footer class="admin-footer"><a href="/">Volver a Maderarte</a></footer>');
write('admin.html', html);
const homepage = read('index.html');
const fonts = homepage.match(/@font-face\{[\s\S]*?(?=\s*:root\{)/)?.[0];
assert.ok(fonts?.includes('Maderarte Algerian') && fonts.includes('SF Pro Text'));
const refinement = `
/* Same fonts and brand wordmark as the storefront, using the existing assets. */
${fonts}
:root{--canvas:#f4f5f7;--ink:#181512;--brand:#e4510f;--brand-dark:#b8430b;font-family:"SF Pro Text",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
body{min-height:100dvh;display:flex;flex-direction:column}.topbar{min-height:88px;background:rgba(255,255,255,.78);padding:20px max(24px,calc((100% - 1280px)/2))}.brand{gap:14px;font-weight:400;letter-spacing:normal}.brand-text{display:grid;gap:2px}.brand-text>span{font-family:"Maderarte Algerian",Georgia,serif;font-size:1.18rem;font-weight:400;letter-spacing:.08em}.brand-text small{font-family:"SF Pro Text",sans-serif;font-size:.55rem;font-weight:500;letter-spacing:.18em;margin-top:3px;text-transform:uppercase}.brand img{width:40px;height:40px}
main{width:100%;flex:1}body.is-locked main{display:grid;place-items:center;padding:50px 24px;max-width:none}.login-card{width:100%;max-width:420px;padding:36px;border-radius:18px;box-shadow:0 16px 48px #18151206}.login-card h1,.login-card h2{font-family:"SF Pro Display","SF Pro Text",sans-serif;font-size:1.6rem;font-weight:500;letter-spacing:-.035em;line-height:1.2;margin:0 0 28px}.lock-mark{margin-bottom:22px;background:#f9f0e9;color:#c45a20}.login-card label{font-weight:500;font-size:.8rem}.login-card input{margin-bottom:18px!important;min-height:48px!important}.login-card .primary{margin-top:4px;min-height:48px;font-weight:500;font-size:.88rem}.login-card .status:empty{display:none}.login-extra{display:block;margin:14px auto -6px;padding:8px;min-height:36px;font-size:.73rem;font-weight:400;color:var(--muted)}.login-card details{font-size:.75rem}.login-card details p{font-size:.75rem}.login-card>p.hint{margin-top:-12px;margin-bottom:24px}.admin-footer{width:100%;border-top:0;justify-content:center;padding:18px 24px 28px;font-size:.72rem}.admin-footer a{text-decoration:none}.admin-footer a:hover{text-decoration:underline}
@media(max-width:520px){.topbar{padding:18px 20px;min-height:78px}.brand{gap:10px}.brand img{width:36px;height:36px}.brand-text>span{font-size:1.12rem}.brand-text small{font-size:.49rem;letter-spacing:.16em}body.is-locked main{padding:30px 20px}.login-card{padding:28px 24px}.admin-footer{align-items:center}.login-card h1,.login-card h2{font-size:1.5rem}}
`;
write('assets/admin-catalog.css', read('assets/admin-catalog.css') + refinement);
let js = read('assets/admin-catalog.js');
js = change(js, 'const Order = window.CatalogOrder, Store = window.CatalogStore;', 'const Order = window.CatalogOrder, Store = window.CatalogStore, Access = window.CatalogAccess;');
js = change(js, 'readonly: false', 'authorized: false');
js = change(js, "value || (state.readonly && !['reload', 'logout'].includes(id))", 'value || !state.authorized');
js = change(js, "$('editor-fields').disabled = value;", "$('editor-fields').disabled = value || !state.authorized;");
js = change(js, "${state.readonly ? ' · solo lectura' : ''}", '');
js = change(js, "state.readonly ? 'Catálogo público' : prices.length", 'prices.length');
js = change(js, "${state.readonly ? '' : `<button type=\"button\" data-edit=\"${escape(product.id)}\">Editar</button>`}", '${`<button type="button" data-edit="${escape(product.id)}">Editar</button>`}');
js = change(js, "status('Catálogo cargado desde GitHub. Cada producto se ordena automáticamente en su categoría.', 'ok');", "status('Catálogo actualizado.', 'ok');");
const connectStart = js.indexOf('  async function connect(token) {');
const connectEnd = js.indexOf('  function categoryChanged() {');
assert.ok(connectStart > 0 && connectEnd > connectStart);
const newAuth = `  let authBusy = false;
  function clearLegacyToken() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
      const previous = JSON.parse(localStorage.getItem('maderarte_gh') || '{}');
      if (previous.owner === 'alejoherrera05-del' && previous.repo === 'Maderarte' && previous.token) {
        delete previous.token; localStorage.setItem('maderarte_gh', JSON.stringify(previous));
      }
    } catch { /* A storage failure never grants access. */ }
  }
  function lockWorkspace() {
    state.poll++; state.authorized = false;
    if (state.repository) state.repository.token = '';
    state.repository = null; state.products = []; state.sha = ''; state.editing = null;
    state.photos = []; state.finishes = []; state.dirty = false; state.pending = false; state.conflict = false; state.legacy = null;
    $('catalog-list').replaceChildren(); $('photo-list').replaceChildren(); $('finish-list').replaceChildren();
    $('summary').textContent = ''; $('sync-status').textContent = ''; $('focal-preview').style.backgroundImage = 'none';
    $('product-form').reset(); $('product-dialog').close(); $('product-dialog').inert = true;
    $('workspace').hidden = true; $('workspace').inert = true;
    $('logout').hidden = true; $('view-catalog').hidden = true; document.body.classList.add('is-locked');
    setBusy(false);
  }
  function authBusyState(busy) {
    authBusy = busy;
    for (const id of ['connect', 'save-access', 'configure-access', 'back-login', 'access-password', 'access-token', 'new-password', 'confirm-password']) $(id).disabled = busy;
  }
  async function connect(token, newPassword) {
    const repository = new Store.Repository({ token });
    await repository.verifyAccess(); state.repository = repository;
    await loadAuthenticated();
    if (newPassword !== undefined) Access.save(await Access.seal(token, newPassword));
    clearLegacyToken(); state.authorized = true;
    for (const id of ['access-password', 'access-token', 'new-password', 'confirm-password']) $(id).value = '';
    $('login-panel').hidden = true; $('setup-panel').hidden = true;
    $('workspace').hidden = false; $('workspace').inert = false; $('product-dialog').inert = false;
    $('logout').hidden = false; $('view-catalog').hidden = false; document.body.classList.remove('is-locked');
    render(); $('new-product').focus();
  }
  async function signIn(setup) {
    if (authBusy || state.authorized) return;
    const message = $(setup ? 'setup-status' : 'login-status');
    message.className = 'status'; message.textContent = 'Entrando…'; authBusyState(true);
    try {
      if (setup) {
        const password = $('new-password').value;
        Access.validatePassword(password);
        if (password !== $('confirm-password').value) throw new Error('Las contraseñas no coinciden.');
        await connect($('access-token').value.trim(), password);
      } else {
        const token = await Access.unlock(Access.read(), $('access-password').value);
        await connect(token);
      }
      message.textContent = '';
    } catch (error) { lockWorkspace(); message.textContent = error.message; message.className = 'status error'; }
    finally {
      $('access-password').value = ''; $('new-password').value = ''; $('confirm-password').value = '';
      authBusyState(false);
    }
  }
  function showSetup() {
    if (authBusy || state.authorized) return;
    $('login-panel').hidden = true; $('setup-panel').hidden = false; $('setup-status').textContent = '';
    try {
      const previous = JSON.parse(localStorage.getItem('maderarte_gh') || '{}');
      $('access-token').value = sessionStorage.getItem(SESSION_KEY) || (previous.owner === 'alejoherrera05-del' && previous.repo === 'Maderarte' ? previous.token || '' : '');
    } catch { $('access-token').value = ''; }
    ($('access-token').value ? $('new-password') : $('access-token')).focus();
  }
`;
js = js.slice(0, connectStart) + newAuth + js.slice(connectEnd);
js = js.replaceAll('state.readonly', '!state.authorized');
js = change(js, "if (!state.editing || state.busy) return;", "if (!state.authorized || !state.editing || state.busy) return;");
js = change(js, "if (state.busy) return; const files =", "if (!state.authorized || state.busy) return; const files =");
js = change(js, "function movePhoto(from, to) { if (state.busy ||", "function movePhoto(from, to) { if (!state.authorized || state.busy ||");
js = change(js, "$('login-form').addEventListener('submit', event => { event.preventDefault(); connect($('access-token').value.trim()); });\n  $('read-only').addEventListener('click', readOnly);", `$('login-form').addEventListener('submit', event => { event.preventDefault(); signIn(false); });
  $('setup-form').addEventListener('submit', event => { event.preventDefault(); signIn(true); });
  $('configure-access').addEventListener('click', showSetup);
  $('back-login').addEventListener('click', () => {
    if (authBusy) return;
    $('setup-panel').hidden = true; $('login-panel').hidden = false; $('login-status').textContent = '';
    for (const id of ['access-token', 'new-password', 'confirm-password']) $(id).value = '';
    $('access-password').focus();
  });`);
js = change(js, "state.poll++; sessionStorage.removeItem(SESSION_KEY); state.repository = null; state.dirty = false;\n    $('workspace').hidden = true; $('login-panel').hidden = false; $('logout').hidden = true; $('logout').textContent = 'Cerrar sesión'; $('login-status').textContent = 'Conecta tu acceso para editar. Los borradores guardados se conservan en este dispositivo.';", "clearLegacyToken(); lockWorkspace(); $('setup-panel').hidden = true; $('login-panel').hidden = false; $('login-status').textContent = ''; $('access-password').focus();");
js = change(js, "() => exportData(state.products)", "() => { if (state.authorized) exportData(state.products); }");
js = change(js, "() => exportData(state.legacy, 'maderarte-borrador-anterior')", "() => { if (state.authorized) exportData(state.legacy, 'maderarte-borrador-anterior'); }");
js = change(js, "$('reload').addEventListener('click', async () => {\n    if (state.busy) return;", "$('reload').addEventListener('click', async () => {\n    if (!state.authorized || state.busy) return;");
js = change(js, 'if (!state.authorized) await readOnly(); else await loadAuthenticated(true);', 'await loadAuthenticated(true);');
const migration = js.indexOf('  // Migrate only the matching public-site connection.');
assert.ok(migration > 0);
js = js.slice(0, migration) + "  // A saved connection never unlocks the editor without the device password.\n  setBusy(false);\n})();\n";
assert.ok(!js.includes('readOnly') && !js.includes('read-only') && !js.includes('state.readonly'));
write('assets/admin-catalog.js', js);
let browser = read('tools/test-catalog-browser.cjs');
browser = change(browser, "await page.goto(base + '/admin.html', { waitUntil: 'domcontentloaded' });", `const beforeLoginData = [];
      page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/data/')) beforeLoginData.push(request.url()); });
      await page.goto(base + '/admin.html', { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => document.fonts.ready);
      await check(await page.locator('#workspace').isHidden() && await page.locator('.product-row').count() === 0, \`\${width}: unauthenticated editor is empty and closed\`);
      await check(await page.locator('#read-only').count() === 0 && beforeLoginData.length === 0 && mock.state.requests.length === 0, \`\${width}: no anonymous catalogue access or requests\`);
      await check(await page.locator('#view-catalog').isHidden(), \`\${width}: catalogue actions remain behind login\`);
      await check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), \`\${width}: login fits viewport\`);
      await check(await page.locator('.brand-text>span').evaluate(node => getComputedStyle(node).fontFamily.includes('Maderarte Algerian') && document.fonts.check('19px "Maderarte Algerian"')), \`\${width}: original Algerian wordmark loaded\`);`);
browser = change(browser, "await page.locator('#access-token').fill('invalid-test-token'); await page.locator('#connect').click();", `await page.locator('#configure-access').click();
      await page.locator('#access-token').fill('invalid-test-token');
      await page.locator('#new-password').fill('Maderarte prueba local 2026!');
      await page.locator('#confirm-password').fill('Maderarte prueba local 2026!');
      await page.locator('#save-access').click();`);
browser = change(browser, "document.getElementById('login-status').textContent.includes('Token inválido')", "document.getElementById('setup-status').textContent.includes('Token inválido')");
browser = change(browser, "await page.locator('#access-token').fill('test-only-not-a-real-token'); await page.locator('#connect').click();", `await check(await page.evaluate(() => localStorage.getItem(CatalogAccess.KEY) === null), \`\${width}: invalid token cannot configure device\`);
      await page.locator('#access-token').fill('test-only-not-a-real-token');
      await page.locator('#new-password').fill('Maderarte prueba local 2026!');
      await page.locator('#confirm-password').fill('Maderarte prueba local 2026!');
      await page.locator('#save-access').click();`);
browser = change(browser, "document.getElementById('login-status').classList.contains('error')", "document.getElementById('setup-status').classList.contains('error')");
browser = change(browser, "const actualGroups = await page.locator('.group-head h3').allTextContents();", `const vaultText = await page.evaluate(() => localStorage.getItem(CatalogAccess.KEY));
      await check(Boolean(vaultText) && !vaultText.includes('test-only-not-a-real-token') && !vaultText.includes('Maderarte prueba local 2026!'), \`\${width}: persistent connection is encrypted\`);
      await check(await page.evaluate(() => sessionStorage.getItem('maderarte_admin_session') === null), \`\${width}: no plaintext session credential\`);
      const actualGroups = await page.locator('.group-head h3').allTextContents();`);
browser = change(browser, "await page.reload({ waitUntil: 'domcontentloaded' }); await page.locator('#workspace').waitFor({ state: 'visible' });", `await page.reload({ waitUntil: 'domcontentloaded' });
      await page.locator('#login-panel').waitFor({ state: 'visible' });
      await check(await page.locator('.product-row').count() === 0, \`\${width}: reload does not bypass password\`);
      await page.locator('#access-password').fill('Maderarte prueba local 2026!'); await page.locator('#connect').click();
      await page.locator('#workspace').waitFor({ state: 'visible' });`);
browser = change(browser, "await page.locator('#logout').click(); await page.locator('#read-only').click(); await page.locator('#workspace').waitFor({ state: 'visible' });\n      await page.locator('#search').fill('sala'); await check(!(await page.locator('#logout').isDisabled()) && await page.locator('[data-edit]').count() === 0, `${width}: read-only stays read-only and can reconnect`);", `await page.locator('#logout').click();
      await check(await page.locator('#workspace').isHidden() && await page.locator('.product-row').count() === 0 && await page.locator('#product-name').inputValue() === '', \`\${width}: logout clears product DOM and closes editor\`);
      const requestsAtLock = mock.state.requests.length;
      await page.evaluate(() => { for (const id of ['new-product', 'reload', 'export', 'publish']) document.getElementById(id).dispatchEvent(new Event('click')); });
      await check(await page.locator('#product-dialog').isHidden() && mock.state.requests.length === requestsAtLock, \`\${width}: locked actions cannot load or edit\`);
      await page.locator('#access-password').fill('Contraseña de prueba incorrecta'); await page.locator('#connect').click();
      await page.waitForFunction(() => document.getElementById('login-status').textContent.includes('incorrecta'));
      await check(mock.state.requests.length === requestsAtLock && await page.locator('.product-row').count() === 0, \`\${width}: wrong password never unlocks token or requests data\`);
      await page.locator('#access-password').fill('Maderarte prueba local 2026!'); await page.locator('#connect').click();
      await page.locator('#workspace').waitFor({ state: 'visible' });
      await check(await page.locator('.product-row').count() === products.length + 1, \`\${width}: password-only login restores saved work\`);`);
write('tools/test-catalog-browser.cjs', browser);
write('tools/test-catalog-admin.cjs', read('tools/test-catalog-admin.cjs') + "\nrequire('./test-admin-access.cjs');\n");
const doc = `# Acceso y catálogo de Maderarte

## Entrada

El candado ADMIN del pie de página lleva a /admin.html. La entrada usa el mismo logo oficial, Algerian y SF Pro de la web. No tiene consulta anónima ni frases promocionales. No carga productos al abrirla sin iniciar sesión.

La pantalla normal muestra Contraseña y Entrar. No existe una contraseña universal ni una clave creada por el asistente: el propietario define su contraseña en el navegador.

## Primera configuración

1. Pulsa Configurar este navegador.
2. Vincula un token detallado de GitHub limitado al repositorio Maderarte, con Contents: Read and write. Una conexión anterior de este mismo catálogo puede rellenarse de forma enmascarada; nunca abre el panel automáticamente.
3. Elige y confirma una contraseña de 15 a 256 caracteres. La contraseña no es la de tu cuenta de GitHub.
4. Pulsa Guardar y entrar. La aplicación comprueba los permisos y carga el catálogo antes de guardar la conexión cifrada.

Después entras con tu contraseña. Cerrar sesión limpia el catálogo y la ficha de la pantalla y descarta la credencial descifrada. Al recargar o abrir otra pestaña vuelve a pedir la contraseña. Los borradores de producto permanecen en este navegador.

## Alcance y límites del acceso

Esto es una contraseña para desbloquear la conexión DE ESTE NAVEGADOR, no un sistema central de cuentas. En otro dispositivo, tras borrar sus datos o al olvidar la contraseña, hay que configurar de nuevo un token autorizado. Cambiar la contraseña local no cambia otros equipos ni revoca un token: para revocarlo hay que hacerlo en GitHub. Una cuenta central con correo, recuperación y permisos por usuario requiere autenticación en un servidor; no se ha añadido ese servicio.

Solo la conexión se cifra en almacenamiento local, con AES-GCM-256, sal aleatoria, IV aleatorio y PBKDF2-SHA256 de 600000 iteraciones. No se guardan la contraseña ni la clave derivada; el token descifrado solo se usa en memoria durante la sesión. La contraseña no se envía a GitHub. GitHub sigue autorizando cada lectura/escritura remota. Un token inválido no permite configurar el acceso. Se retiran las credenciales antiguas en texto claro de este catálogo al completar la vinculación.

Esto no privatiza GitHub Pages ni el repositorio: las fotos y los archivos ya publicados siguen siendo públicos, incluido el archivo comercial con precios. Los borradores locales no se cifran con este cambio. No introduzcas información confidencial. Este mecanismo no protege una sesión desbloqueada frente a una extensión maliciosa, código malicioso del mismo origen o un dispositivo comprometido. Usa una contraseña larga y distinta, un equipo de confianza y cierra sesión al terminar.

## Catálogo

Las categorías conservan el orden Salas, Comedores, Alcobas, Sofá camas y Junior. Dentro de cada grupo se aplica subcategoría, prioridad opcional y nombre. Las nuevas fotos no cambian la categoría. Guardar borrador guarda solo localmente; Guardar y publicar actualiza ambos catálogos y fotos conjuntamente. Los conflictos con otra edición bloquean la publicación; descarga el respaldo antes de reconciliar. No se cambia Maderarte-App.

## Pruebas

node --test tools/test-catalog-admin.cjs incluye pruebas del cifrado, contraseña incorrecta, manipulación de datos, errores de almacenamiento, permisos, orden y publicación atómica. node tools/test-catalog-browser.cjs verifica contraseña, configuración, ausencia de entrada anónima, limpieza al salir, marca y flujos de edición a 1440/390 px. Las escrituras de las pruebas son simuladas; no cambian productos reales.
`;
write('CATALOGO-ADMIN.md', doc);
console.log('Admin entry refined. Product data, storefront and publication layer unchanged.');
