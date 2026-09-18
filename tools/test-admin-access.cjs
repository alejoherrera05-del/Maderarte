'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Access = require('../assets/admin-access.js');
const password = 'Frase larga de prueba para Maderarte 2026!';
const token = 'test-credential-never-a-real-token';
let saved;
test('Device vault protects token without storing password or key', async () => {
  saved = await Access.seal(token, password);
  assert.equal(await Access.unlock(saved, password), token);
  const serialized = JSON.stringify(saved);
  assert.ok(!serialized.includes(token) && !serialized.includes(password));
  assert.deepEqual(Object.keys(saved).sort(), ['cipher','data','iterations','iv','kdf','salt','version'].sort());
  assert.equal(saved.iterations, 600000);
});
test('Incorrect password does not reveal the GitHub credential', async () => {
  const record = saved || await Access.seal(token, password);
  await assert.rejects(Access.unlock(record, 'Una contraseña diferente para probar'), /incorrecta/);
  await assert.rejects(Access.unlock(null, password), /configura/);
});
test('Random salt and IV change ciphertext on every configuration', async () => {
  const first = saved || await Access.seal(token, password);
  const second = await Access.seal(token, password);
  assert.notEqual(first.salt, second.salt); assert.notEqual(first.iv, second.iv); assert.notEqual(first.data, second.data);
});
test('Tampered ciphertext and downgraded KDF cannot unlock', async () => {
  const record = saved || await Access.seal(token, password);
  const changed = { ...record, data: (record.data[0] === 'A' ? 'B' : 'A') + record.data.slice(1) };
  await assert.rejects(Access.unlock(changed, password), /incorrecta/);
  await assert.rejects(Access.unlock({ ...record, iterations: 1 }, password), /Configura/);
  await assert.rejects(Access.unlock({ ...record, iv: 'AA==' }, password), /Configura/);
});
test('Storage failure and corrupt connection do not pretend to save', async () => {
  const record = saved || await Access.seal(token, password);
  const data = new Map(); const storage = { getItem: key => data.get(key) || null, setItem: (key,value) => data.set(key,value) };
  assert.equal(Access.read(storage), null); Access.save(record, storage); assert.deepEqual(Access.read(storage), record);
  assert.throws(() => Access.save(record, { setItem() { throw new Error('Quota'); }, getItem() { return null; } }), /No se pudo guardar/);
  data.set(Access.KEY, 'broken'); assert.throws(() => Access.read(storage), /no es válida/);
});
test('Password strength and anonymous access regression contracts', () => {
  assert.throws(() => Access.validatePassword('corta'), /15/);
  assert.throws(() => Access.validatePassword('x'.repeat(257)), /256/);
  Access.validatePassword(password);
  const html = fs.readFileSync(path.join(__dirname, '../admin.html'), 'utf8');
  const ui = fs.readFileSync(path.join(__dirname, '../assets/admin-catalog.js'), 'utf8');
  assert.ok(html.includes('id="access-password"') && html.includes('id="setup-form"'));
  assert.ok(!html.includes('id="read-only"') && !ui.includes('async function readOnly'));
  assert.ok(!ui.includes('sessionStorage.setItem(SESSION_KEY'));
  assert.ok(ui.includes('Access.unlock') && ui.includes('repository.verifyAccess()'));
});
