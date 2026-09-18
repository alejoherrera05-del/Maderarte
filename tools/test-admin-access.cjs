'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Access = require('../assets/admin-access.js');
const pin = '0472'; // Fixture only, never the owner's PIN.
const token = 'test-credential-never-a-real-token';
let saved;
test('Device PIN vault encrypts the token without storing PIN or key fields', async () => {
  saved = await Access.seal(token, pin);
  assert.equal(await Access.unlock(saved, pin), token);
  assert.ok(!JSON.stringify(saved).includes(token));
  assert.deepEqual(Object.keys(saved).sort(), ['cipher','data','iterations','iv','kdf','salt','version','unlockMode'].sort());
  assert.equal(saved.unlockMode, 'pin4');
  assert.equal(saved.iterations, 600000);
});
test('Incorrect or malformed PIN does not reveal the GitHub credential', async () => {
  const record = saved || await Access.seal(token, pin);
  await assert.rejects(Access.unlock(record, '9999'), /PIN incorrecto/);
  await assert.rejects(Access.unlock(record, '472'), /4 números/);
  await assert.rejects(Access.unlock(record, 'abcd'), /4 números/);
  await assert.rejects(Access.unlock(null, pin), /configura/);
});
test('Random salt and IV change ciphertext on every configuration', async () => {
  const first = saved || await Access.seal(token, pin);
  const second = await Access.seal(token, pin);
  assert.notEqual(first.salt, second.salt); assert.notEqual(first.iv, second.iv); assert.notEqual(first.data, second.data);
});
test('Tampered ciphertext, unknown modes and downgraded KDF cannot unlock', async () => {
  const record = saved || await Access.seal(token, pin);
  const changed = { ...record, data: (record.data[0] === 'A' ? 'B' : 'A') + record.data.slice(1) };
  await assert.rejects(Access.unlock(changed, pin), /incorrecto/);
  await assert.rejects(Access.unlock({ ...record, iterations: 1 }, pin), /Configura/);
  await assert.rejects(Access.unlock({ ...record, iv: 'AA==' }, pin), /Configura/);
  await assert.rejects(Access.unlock({ ...record, unlockMode: 'unknown' }, pin), /Configura/);
});
test('Storage failure and corrupt connection do not pretend to save', async () => {
  const record = saved || await Access.seal(token, pin);
  const data = new Map(); const storage = { getItem: key => data.get(key) || null, setItem: (key,value) => data.set(key,value) };
  assert.equal(Access.read(storage), null); Access.save(record, storage); assert.deepEqual(Access.read(storage), record);
  assert.throws(() => Access.save(record, { setItem() { throw new Error('Quota'); }, getItem() { return null; } }), /No se pudo guardar/);
  data.set(Access.KEY, 'broken'); assert.throws(() => Access.read(storage), /no es válida/);
});
test('PIN validation requires exactly four ASCII digits and preserves leading zero', async () => {
  for (const invalid of ['', '123', '12345', '12a4', '12.4', '1e03', ' 0472', '0472 ', 472, null]) assert.throws(() => Access.validatePIN(invalid), /4 números/);
  for (const valid of ['0000', '0123', '0472', '9999']) Access.validatePIN(valid);
  Access.validatePassword(pin); // Existing UI adapter remains compatible.
  await assert.rejects(Access.seal(token, 'long-password-is-not-a-pin'), /4 números/);
  const record = await Access.seal(token, '0123');
  assert.equal(await Access.unlock(record, '0123'), token);
});
test('Numeric input hints and anonymous access regression contracts', () => {
  const html = fs.readFileSync(path.join(__dirname, '../admin.html'), 'utf8');
  const ui = fs.readFileSync(path.join(__dirname, '../assets/admin-catalog.js'), 'utf8');
  for (const id of ['access-password', 'new-password', 'confirm-password']) {
    const input = html.match(new RegExp('<input id="' + id + '"[^>]*>'))?.[0];
    assert.ok(input, id);
    for (const attr of ['type="password"', 'inputmode="numeric"', 'pattern="[0-9]{4}"', 'minlength="4"', 'maxlength="4"']) assert.ok(input.includes(attr), `${id}: ${attr}`);
  }
  assert.ok(!html.includes('minlength="15"'));
  assert.ok(!html.includes('id="read-only"') && !ui.includes('async function readOnly'));
  assert.ok(!ui.includes('sessionStorage.setItem(SESSION_KEY'));
  assert.ok(ui.includes('Access.unlock') && ui.includes('repository.verifyAccess()'));
});
