const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const Order = require('../assets/catalog-order.js');
const { Repository, ConflictError, blobSha } = require('../assets/admin-store.js');
const { products, copy, gitSha, mockRepository } = require('./catalog-test-fixture.cjs');
const root = path.resolve(__dirname, '..');
const image = 'data:image/jpeg;base64,/9j/2Q==';
const repository = mock => new Repository({ token: 'test-only-not-a-real-token', fetchImpl: mock.fetch });
test('All current products, images and metadata survive sorting', () => {
  const original = copy(products), sorted = Order.sortProducts(products);
  assert.deepEqual(products, original); assert.equal(sorted.length, products.length);
  for (const p of products) assert.deepEqual(sorted.find(x => x.id === p.id), p);
  assert.deepEqual(Order.validate(products), []);
});
test('Upload order never mixes categories or changes alphabetical order', () => {
  const expected = Order.sortProducts(products).map(p => p.id);
  for (let offset = 0; offset < products.length; offset++) {
    const shuffled = [...products.slice(offset), ...products.slice(0, offset)].reverse();
    assert.deepEqual(Order.sortProducts(shuffled).map(p => p.id), expected);
  }
  assert.deepEqual(Order.groups(products).map(g => g.key), Order.categories.filter(c => products.some(p => p.categoria === c.key)).map(c => c.key));
});
test('Manual priority stays inside category and Junior subcategory', () => {
  const rows = [{ id: 1, categoria: 'alcobas', nombre: 'Z', orden: 0 }, { id: 2, categoria: 'salas', nombre: 'A' }, { id: 3, categoria: 'junior', subcategoria: 'cunas_convertibles', nombre: 'A', orden: 0 }, { id: 4, categoria: 'junior', subcategoria: 'cama_cunas', nombre: 'Z' }, { id: 5, categoria: 'salas', nombre: 'Z', orden: 0 }];
  assert.deepEqual(Order.sortProducts(rows).map(p => p.id), [5, 2, 1, 4, 3]);
});
test('Aliases, accents, empty and unknown categories are deterministic', () => {
  assert.equal(Order.categoryKey('Sofá camas'), 'sofacamas'); assert.equal(Order.categoryKey('sofa-camas'), 'sofacamas'); assert.equal(Order.fold('MILÁN'), 'milan');
  assert.deepEqual(Order.sortProducts(null), []);
  const rows = [{ id: 1, categoria: 'muebles', nombre: 'A' }, { id: 2, categoria: 'alcobas', nombre: 'A' }, { id: 3, categoria: 'alcobas', nombre: 'A' }];
  assert.deepEqual(Order.sortProducts(rows).map(p => p.id), [2, 3, 1]);
});
test('Public data strips all price fields recursively without losing photos', () => {
  const publicData = Order.publicProducts(products);
  assert.equal(publicData.length, products.length);
  for (const p of publicData) { assert.equal(p.precio, undefined); assert.equal(p.variantesAlcoba, undefined); assert.equal(p.variantesComedor, undefined); assert.ok(p.imagenes.length); }
  assert.deepEqual(Order.publicProducts({ nested: { price: 2, valor: 3, detalle: 'bien' } }), { nested: { detalle: 'bien' } });
});
test('Validation rejects missing categories, duplicate IDs, invalid prices and unsafe images', () => {
  const row = copy(products[0]); row.imagenes = ['javascript:alert(1)']; row.precio = -2; row.categoria = '';
  assert.ok(Order.validate([row, row]).length >= 4);
  assert.equal(Order.validImage('//untrusted.example/image.jpg'), false);
  assert.equal(Order.validImage('data:image/svg+xml;base64,AAAA'), false);
});
test('Git blob hash agrees with Git for UTF-8 product text', async () => {
  const text = 'Maderarte · Alcoba Milán 🛏️\n'; assert.equal(await blobSha(text), gitSha(text));
});
test('Atomic publish writes both catalogues and new photos in one commit', async () => {
  const mock = mockRepository(); const repo = repository(mock); const input = copy(products); input[0].imagenes = [image, image, ...input[0].imagenes]; input[0].extraMetadata = { keep: true }; const original = copy(input);
  const result = await repo.publish(input, mock.sha);
  assert.equal(mock.state.writes, 1); assert.equal(mock.state.blobs.length, 1); assert.equal(mock.state.commits.length, 1);
  const entries = mock.state.trees[0].tree; assert.equal(mock.state.trees[0].base_tree, 'tree-1');
  assert.ok(entries.find(e => e.path === 'data/productos.json')); assert.ok(entries.find(e => e.path === 'data/productos-publicos.json'));
  assert.equal(entries.filter(e => e.path.startsWith('img/')).length, 1);
  assert.equal(mock.state.requests.some(r => r.method === 'PUT'), false);
  assert.equal(mock.state.requests.find(r => r.method === 'PATCH').body.force, false);
  const publicData = JSON.parse(entries.find(e => e.path === 'data/productos-publicos.json').content);
  assert.deepEqual(publicData, Order.publicProducts(result.products));
  assert.deepEqual(input, original); assert.equal(result.sha, mock.sha);
  const saved = result.products.find(p => p.id === input[0].id); assert.deepEqual(saved.extraMetadata, { keep: true }); assert.equal(saved.imagenes[0], saved.imagenes[1]);
  assert.ok(saved.imagenes[0].startsWith('/img/'));
});
test('Stale catalogue is refused before any upload or publication', async () => {
  const mock = mockRepository(); await assert.rejects(repository(mock).publish(products, 'outdated-sha'), ConflictError);
  assert.equal(mock.state.writes, 0); assert.equal(mock.state.blobs.length, 0); assert.equal(mock.state.commits.length, 0);
});
test('Missing baseline is refused without contacting GitHub', async () => {
  const mock = mockRepository(); await assert.rejects(repository(mock).publish(products, ''), /Primero carga/); assert.equal(mock.state.requests.length, 0);
});
test('Photo or tree failures never partially publish the catalogues', async () => {
  for (const route of ['/git/blobs', '/git/trees']) {
    const mock = mockRepository(); mock.state.failure = route; const items = copy(products); items[0].imagenes.push(image);
    await assert.rejects(repository(mock).publish(items, mock.sha)); assert.equal(mock.state.writes, 0);
  }
});
test('Concurrent product edit is not overwritten', async () => {
  const mock = mockRepository(); mock.state.race = 'product'; await assert.rejects(repository(mock).publish(products, mock.sha), ConflictError); assert.equal(mock.state.writes, 0);
  assert.equal(JSON.parse(mock.state.text)[0].descripcion, 'Cambio de otro equipo');
});
test('Unrelated concurrent SEO commit is safely retained and retried', async () => {
  const mock = mockRepository(); mock.state.race = 'seo'; const result = await repository(mock).publish(products, mock.sha);
  assert.equal(mock.state.writes, 1); assert.equal(mock.state.commits.length, 2); assert.equal(mock.state.trees[1].base_tree, 'concurrent-tree'); assert.equal(result.sha, mock.sha);
});
test('Lost successful PATCH response is confirmed instead of double-publishing', async () => {
  const mock = mockRepository(); mock.state.ambiguous = true; const result = await repository(mock).publish(products, mock.sha); assert.equal(mock.state.writes, 1); assert.equal(result.sha, mock.sha);
});
test('Invalid credentials do not unlock write access', async () => {
  const mock = mockRepository(); const repo = new Repository({ token: 'invalid-test-token', fetchImpl: mock.fetch }); await assert.rejects(repo.verifyAccess(), /Token inválido/); assert.equal(mock.state.writes, 0);
});
test('Storefront script syntax, footer link and ordering are intact', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const match of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) if (!match[1].includes('application/ld+json')) new vm.Script(match[2]);
  assert.match(html, /class="footer-admin" href="\/admin.html"/); assert.match(html, /CatalogOrder\.sortProducts/); assert.match(html, /catalog-group-heading/);
  assert.match(html, /const catalogFile = showPrices \? "\/data\/productos.json" : "\/data\/productos-publicos.json"/);
  const admin = fs.readFileSync(path.join(root, 'admin.html'), 'utf8'); assert.match(admin, /noindex, nofollow, noarchive/); assert.doesNotMatch(admin, /admin-pass-input|procesarAutenticacion/); assert.match(admin, /Content-Security-Policy/);
});

test('Fetch receiver is the browser global, not the repository instance', async () => {
  const StoreForReceiver = require('../assets/admin-store.js');
  const repo = new StoreForReceiver.Repository({ token: 'test-only', fetchImpl: async function () {
    assert.equal(this, globalThis);
    return { ok: true, status: 200, json: async () => ({ full_name: 'alejoherrera05-del/Maderarte', permissions: { push: true } }) };
  } });
  await repo.verifyAccess();
});

test('Authorized fixture loads without failure injection', async () => {
  const mock = mockRepository();
  const repo = repository(mock);
  const access = await repo.verifyAccess();
  assert.equal(access.permissions.push, true);
  assert.equal((await repo.read()).products.length, products.length);
  assert.equal(mock.state.writes, 0);
});
