/* Device-local credential vault. GitHub still authorizes every repository request.
 * This is not a server login or a way to make the public repository private.
 * The password and derived key are never stored. Unlocked tokens remain in memory.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CatalogAccess = api;
})(globalThis, function () {
  'use strict';
  const KEY = 'maderarte_admin_vault_v1';
  const ITERATIONS = 600000;
  const encoder = new TextEncoder();
  const context = encoder.encode('Maderarte/catalogo/admin/v1/alejoherrera05-del/Maderarte');
  function engine() {
    if (!globalThis.crypto?.subtle) throw new Error('Abre este panel con HTTPS para usar tu contraseña.');
    return globalThis.crypto;
  }
  function validatePassword(password) {
    if (typeof password !== 'string' || Array.from(password).length < 15 || password.length > 256) {
      throw new Error('Usa una contraseña de 15 a 256 caracteres. Puedes usar una frase.');
    }
  }
  function encode(value) { return btoa(String.fromCharCode(...new Uint8Array(value))); }
  function decode(value) {
    if (typeof value !== 'string' || value.length > 10000) throw new Error('Formato de conexión no válido.');
    return Uint8Array.from(atob(value), char => char.charCodeAt(0));
  }
  function envelope(value) {
    if (!value || value.version !== 1 || value.kdf !== 'PBKDF2-SHA256' || value.iterations !== ITERATIONS || value.cipher !== 'AES-GCM-256') throw new Error('Configura de nuevo la conexión de este navegador.');
    const salt = decode(value.salt), iv = decode(value.iv), data = decode(value.data);
    if (salt.length !== 16 || iv.length !== 12 || data.length < 16 || data.length > 2048) throw new Error('Configura de nuevo la conexión de este navegador.');
    return { salt, iv, data };
  }
  async function derive(password, salt) {
    if (typeof password !== 'string' || password.length > 256) throw new Error('Contraseña incorrecta.');
    const material = await engine().subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
    return engine().subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function seal(token, password) {
    validatePassword(password);
    if (typeof token !== 'string' || token.trim().length < 10 || token.length > 1024) throw new Error('Revisa la conexión de GitHub.');
    const salt = engine().getRandomValues(new Uint8Array(16));
    const iv = engine().getRandomValues(new Uint8Array(12));
    const key = await derive(password, salt);
    const clear = encoder.encode(JSON.stringify({ repository: 'alejoherrera05-del/Maderarte', token: token.trim() }));
    const data = await engine().subtle.encrypt({ name: 'AES-GCM', iv, additionalData: context, tagLength: 128 }, key, clear);
    clear.fill(0);
    return { version: 1, kdf: 'PBKDF2-SHA256', iterations: ITERATIONS, cipher: 'AES-GCM-256', salt: encode(salt), iv: encode(iv), data: encode(data) };
  }
  async function unlock(record, password) {
    if (!record) throw new Error('Primero configura el acceso de este navegador y crea tu contraseña.');
    const { salt, iv, data } = envelope(record);
    const key = await derive(password, salt);
    let clear;
    try {
      clear = new Uint8Array(await engine().subtle.decrypt({ name: 'AES-GCM', iv, additionalData: context, tagLength: 128 }, key, data));
      const result = JSON.parse(new TextDecoder().decode(clear));
      if (result.repository !== 'alejoherrera05-del/Maderarte' || typeof result.token !== 'string' || result.token.length < 10) throw new Error('Invalid payload');
      return result.token;
    } catch { throw new Error('Contraseña incorrecta o conexión guardada dañada.'); }
    finally { if (clear) clear.fill(0); }
  }
  function read(storage = globalThis.localStorage) {
    const text = storage.getItem(KEY);
    if (!text) return null;
    try { const value = JSON.parse(text); envelope(value); return value; }
    catch { throw new Error('La conexión guardada no es válida. Configura de nuevo este navegador.'); }
  }
  function save(record, storage = globalThis.localStorage) {
    envelope(record);
    const text = JSON.stringify(record);
    try { storage.setItem(KEY, text); if (storage.getItem(KEY) !== text) throw new Error('Storage write failed'); }
    catch { throw new Error('No se pudo guardar la conexión cifrada. Revisa el almacenamiento del navegador.'); }
  }
  return Object.freeze({ KEY, ITERATIONS, validatePassword, seal, unlock, read, save });
});
