/* Device-local credential vault. GitHub still authorizes repository requests.
 * The owner explicitly chose a four-digit convenience PIN after being informed
 * that it is weaker against offline guessing than the previous long password.
 * This does not make the public repository private or create a server login.
 * Neither the PIN nor the derived key is stored. Unlocked tokens stay in memory.
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
    if (!globalThis.crypto?.subtle) throw new Error('Abre este panel con HTTPS para usar tu PIN.');
    return globalThis.crypto;
  }
  function validatePIN(pin) {
    if (typeof pin !== 'string' || !/^[0-9]{4}$/.test(pin)) {
      throw new Error('Escribe exactamente 4 números para tu PIN.');
    }
  }
  // Retain the existing UI interface; new configurations now require four digits.
  const validatePassword = validatePIN;
  function encode(value) { return btoa(String.fromCharCode(...new Uint8Array(value))); }
  function decode(value) {
    if (typeof value !== 'string' || value.length > 10000) throw new Error('Formato de conexión no válido.');
    return Uint8Array.from(atob(value), char => char.charCodeAt(0));
  }
  function envelope(value) {
    if (!value || value.version !== 1 || value.kdf !== 'PBKDF2-SHA256' || value.iterations !== ITERATIONS || value.cipher !== 'AES-GCM-256' || (value.unlockMode !== undefined && value.unlockMode !== 'pin4')) throw new Error('Configura de nuevo la conexión de este navegador.');
    const salt = decode(value.salt), iv = decode(value.iv), data = decode(value.data);
    if (salt.length !== 16 || iv.length !== 12 || data.length < 16 || data.length > 2048) throw new Error('Configura de nuevo la conexión de este navegador.');
    return { salt, iv, data };
  }
  async function derive(password, salt) {
    if (typeof password !== 'string' || password.length > 256) throw new Error('Acceso incorrecto.');
    const material = await engine().subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
    return engine().subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function seal(token, pin) {
    validatePIN(pin);
    if (typeof token !== 'string' || token.trim().length < 10 || token.length > 1024) throw new Error('Revisa la conexión de GitHub.');
    const salt = engine().getRandomValues(new Uint8Array(16));
    const iv = engine().getRandomValues(new Uint8Array(12));
    const key = await derive(pin, salt);
    const clear = encoder.encode(JSON.stringify({ repository: 'alejoherrera05-del/Maderarte', token: token.trim() }));
    let data;
    try { data = await engine().subtle.encrypt({ name: 'AES-GCM', iv, additionalData: context, tagLength: 128 }, key, clear); }
    finally { clear.fill(0); }
    return { version: 1, unlockMode: 'pin4', kdf: 'PBKDF2-SHA256', iterations: ITERATIONS, cipher: 'AES-GCM-256', salt: encode(salt), iv: encode(iv), data: encode(data) };
  }
  async function unlock(record, password) {
    if (!record) throw new Error('Primero configura este navegador y elige tu PIN de 4 números.');
    const { salt, iv, data } = envelope(record);
    if (record.unlockMode === 'pin4') validatePIN(password);
    const key = await derive(password, salt);
    let clear;
    try {
      clear = new Uint8Array(await engine().subtle.decrypt({ name: 'AES-GCM', iv, additionalData: context, tagLength: 128 }, key, data));
      const result = JSON.parse(new TextDecoder().decode(clear));
      if (result.repository !== 'alejoherrera05-del/Maderarte' || typeof result.token !== 'string' || result.token.length < 10) throw new Error('Invalid payload');
      return result.token;
    } catch { throw new Error(record.unlockMode === 'pin4' ? 'PIN incorrecto o conexión guardada dañada.' : 'Contraseña anterior incorrecta o conexión guardada dañada.'); }
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
  return Object.freeze({ KEY, ITERATIONS, validatePIN, validatePassword, seal, unlock, read, save });
});
