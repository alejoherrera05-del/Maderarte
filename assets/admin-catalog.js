/* Dedicated catalogue UI. Product data keeps its existing IDs and optional metadata. */
(() => {
  'use strict';
  const Order = window.CatalogOrder, Store = window.CatalogStore;
  const $ = id => document.getElementById(id);
  const SESSION_KEY = 'maderarte_admin_session';
  const MATERIALS = ['estructura', 'madera', 'tela', 'espuma', 'pintura'];
  const state = { products: [], sha: '', repository: null, pending: false, readonly: false, busy: false, conflict: false, editing: null, photos: [], finishes: [], dirty: false, legacy: null, poll: 0 };
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const money = value => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(value));
  const slug = value => Order.fold(value).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'pieza';
  const productPath = product => `/catalogo/producto/${slug(product.nombre)}-${product.id}/`;
  const clone = value => JSON.parse(JSON.stringify(value));
  let database, toastTimer, dragPhoto = null;
  function toast(text) { $('toast').textContent = text; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').hidden = true, 6000); }
  function status(text, kind = '') { $('sync-status').textContent = text; $('sync-status').className = `sync-status ${kind}`; }
  function setBusy(value) {
    state.busy = value;
    for (const id of ['new-product', 'reload', 'publish', 'save-product', 'save-draft', 'delete-product', 'logout']) $(id).disabled = value || (state.readonly && !['reload', 'logout'].includes(id)) || (id === 'publish' && (!state.pending || state.conflict));
    $('editor-fields').disabled = value; $('close-editor').disabled = value;
  }
  async function db() {
    if (database) return database;
    database = await new Promise((resolve, reject) => {
      const request = indexedDB.open('maderarte_catalog_admin_v3', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('state');
      request.onerror = () => reject(new Error('No se pudo abrir el respaldo local. Revisa el almacenamiento del navegador.'));
      request.onsuccess = () => resolve(request.result);
    });
    return database;
  }
  async function readDraft() {
    const connection = await db();
    return new Promise((resolve, reject) => { const request = connection.transaction('state').objectStore('state').get('draft'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
  }
  async function persist() {
    const connection = await db();
    const record = { version: 3, repository: 'alejoherrera05-del/Maderarte:main', products: state.products, baseSha: state.sha, pending: state.pending, savedAt: new Date().toISOString() };
    return new Promise((resolve, reject) => {
      const transaction = connection.transaction('state', 'readwrite'); transaction.objectStore('state').put(record, 'draft');
      transaction.oncomplete = resolve;
      transaction.onerror = transaction.onabort = () => reject(new Error('No se pudo guardar el borrador en este dispositivo. Descarga un respaldo antes de cerrar; revisa el espacio disponible.'));
    });
  }
  async function legacyDraft() {
    try {
      if (indexedDB.databases && !(await indexedDB.databases()).some(item => item.name === 'maderarte_db_v2')) return null;
      return await new Promise(resolve => {
        const request = indexedDB.open('maderarte_db_v2');
        request.onerror = () => resolve(null);
        request.onupgradeneeded = () => { request.transaction.abort(); resolve(null); };
        request.onsuccess = () => {
          const old = request.result;
          if (!old.objectStoreNames.contains('kv')) { old.close(); resolve(null); return; }
          const query = old.transaction('kv').objectStore('kv').get('productos');
          query.onsuccess = () => { const value = query.result; old.close(); resolve(Array.isArray(value) ? value : null); };
          query.onerror = () => { old.close(); resolve(null); };
        };
      });
    } catch { return null; }
  }
  function exportData(products, prefix = 'maderarte-catalogo') {
    const blob = new Blob([JSON.stringify(products, null, 2)], { type: 'application/json' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${prefix}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }
  function render() {
    const query = Order.fold($('search').value), category = $('category-filter').value;
    const filtered = state.products.filter(p => (category === 'todos' || p.categoria === category) && (!query || Order.fold([p.nombre, Order.label(p.categoria), Order.sublabel(p.subcategoria), p.descripcion].join(' ')).includes(query)));
    const counts = Order.groups(state.products).length;
    $('summary').textContent = `${state.products.length} productos · ${counts} categorías con productos${state.readonly ? ' · solo lectura' : ''}`;
    $('catalog-list').innerHTML = Order.groups(filtered).map(group => `<section class="catalog-group" aria-label="${escape(group.label)}"><div class="group-head"><h3>${escape(group.label)}</h3><span class="group-count">${group.products.length}</span></div>${group.products.map(product => {
      const prices = [product.precio, ...Object.values(product.variantesComedor || {}), ...Object.values(product.variantesAlcoba || {})].map(Number).filter(n => Number.isFinite(n) && n > 0);
      const price = state.readonly ? 'Catálogo público' : prices.length ? `Desde ${money(Math.min(...prices))}` : 'Precio por definir';
      const meta = [Order.label(product.categoria), product.categoria === 'junior' ? Order.sublabel(product.subcategoria) : '', `${product.imagenes?.length || 0} fotos`, product.orden != null ? `Prioridad ${product.orden}` : ''].filter(Boolean).join(' · ');
      const image = Order.validImage(product.imagenes?.[0]) ? product.imagenes[0] : '/logomaderarte2026.png';
      return `<article class="product-row" data-product-id="${escape(product.id)}"><img class="row-photo" src="${escape(image)}" alt="${escape(product.nombre)}" loading="lazy"><div><strong class="row-title">${escape(product.nombre)}</strong><p class="row-meta">${escape(meta)}</p><span class="row-price">${escape(price)}</span></div><div class="row-actions">${state.readonly ? '' : `<button type="button" data-edit="${escape(product.id)}">Editar</button>`}<a href="${escape(productPath(product))}" target="_blank" rel="noopener">Ver ↗</a></div></article>`;
    }).join('')}</section>`).join('') || '<div class="empty">No hay productos que coincidan. Prueba otra búsqueda o categoría.</div>';
    setBusy(state.busy);
  }
  async function loadAuthenticated(ignoreDraft = false) {
    const remote = await state.repository.read();
    const draft = ignoreDraft ? null : await readDraft();
    const restorable = draft?.pending && draft.repository === 'alejoherrera05-del/Maderarte:main' && Array.isArray(draft.products);
    state.products = Order.sortProducts(restorable ? draft.products : remote.products);
    state.sha = restorable ? draft.baseSha : remote.sha;
    state.pending = Boolean(restorable); state.conflict = Boolean(restorable && draft.baseSha !== remote.sha);
    if (state.conflict) status(new Store.ConflictError().message, 'error');
    else if (state.pending) status('Borrador recuperado en este dispositivo. Tiene cambios pendientes de publicar.', 'pending');
    else status('Catálogo cargado desde GitHub. Cada producto se ordena automáticamente en su categoría.', 'ok');
    state.legacy = await legacyDraft();
    $('recovery').hidden = !state.legacy || JSON.stringify(Order.sortProducts(state.legacy)) === JSON.stringify(Order.sortProducts(remote.products));
    if (!restorable) await persist();
    render();
  }
  async function connect(token) {
    $('connect').disabled = true; $('login-status').className = 'status'; $('login-status').textContent = 'Verificando acceso y cargando el catálogo…';
    try {
      const repository = new Store.Repository({ token }); await repository.verifyAccess();
      state.repository = repository; state.readonly = false;
      await loadAuthenticated();
      sessionStorage.setItem(SESSION_KEY, token); $('access-token').value = '';
      $('login-panel').hidden = true; $('workspace').hidden = false; $('logout').hidden = false;
      render();
    } catch (error) {
      state.repository = null; sessionStorage.removeItem(SESSION_KEY);
      $('login-status').textContent = error.message; $('login-status').className = 'status error';
    } finally { $('connect').disabled = false; }
  }
  async function readOnly() {
    $('read-only').disabled = true;
    try {
      const response = await fetch('/data/productos-publicos.json?t=' + Date.now(), { cache: 'no-store' });
      if (!response.ok) throw new Error('No se pudo cargar el catálogo público.');
      state.products = Order.sortProducts(await response.json()); state.readonly = true; state.pending = false;
      $('login-panel').hidden = true; $('workspace').hidden = false; $('logout').hidden = false; $('logout').textContent = 'Conectar para editar';
      status('Modo de consulta. Para editar y publicar necesitas conectar el acceso de GitHub.'); render(); $('logout').disabled = false;
    } catch (error) { $('login-status').textContent = error.message; } finally { $('read-only').disabled = false; }
  }
  function categoryChanged() {
    const category = $('product-category').value;
    $('subcategory-field').hidden = category !== 'junior'; $('product-subcategory').required = category === 'junior';
    $('dining-variants').hidden = category !== 'comedores'; $('bed-variants').hidden = category !== 'alcobas';
    const junior = category === 'junior' && $('product-subcategory').value ? ' → ' + Order.sublabel($('product-subcategory').value) : '';
    $('destination').textContent = category ? `Se organizará automáticamente en ${Order.label(category)}${junior}.` : 'Selecciona la categoría: nosotros mantenemos el orden.';
  }
  function focal() {
    $('focal-controls').hidden = !state.photos.length;
    const url = state.photos[0];
    $('focal-preview').style.backgroundImage = url && Order.validImage(url) ? `url("${url.replace(/"/g, '%22')}")` : 'none';
    $('focal-preview').style.backgroundPosition = `${$('thumb-x').value}% ${$('thumb-y').value}%`;
  }
  function renderPhotos() {
    $('photo-list').innerHTML = state.photos.map((src, index) => `<div class="photo-card" draggable="true" data-photo="${index}"><img src="${escape(src)}" alt="Foto ${index + 1}"><span class="photo-caption">${index ? `Foto ${index + 1}` : 'Principal'}</span><div class="photo-tools"><button type="button" data-move="${index}" data-direction="-1" ${index === 0 ? 'disabled' : ''} aria-label="Mover foto ${index + 1} hacia el inicio">←</button><button type="button" data-move="${index}" data-direction="1" ${index === state.photos.length - 1 ? 'disabled' : ''} aria-label="Mover foto ${index + 1} hacia el final">→</button><button type="button" data-remove-photo="${index}" aria-label="Quitar foto ${index + 1}">×</button></div></div>`).join(''); focal();
  }
  function renderFinishes() {
    $('finish-list').innerHTML = state.finishes.map((color, index) => `<button class="finish-chip" type="button" data-remove-finish="${index}" aria-label="Quitar acabado ${escape(color)}"><span class="swatch" style="background:${/^#[a-f0-9]{3,8}$/i.test(color) ? color : '#ddd'}"></span>${escape(color)} ×</button>`).join('');
  }
  function openEditor(id = null) {
    if (state.readonly || state.busy) return;
    const product = id == null ? null : state.products.find(p => String(p.id) === String(id));
    if (id != null && !product) return;
    $('product-form').reset(); state.editing = product ? clone(product) : null; state.photos = [...(product?.imagenes || [])]; state.finishes = [...(product?.acabados || [])]; state.dirty = false;
    $('editor-title').textContent = product ? 'Editar producto' : 'Nuevo producto'; $('delete-product').hidden = !product; $('form-status').textContent = '';
    $('product-category').value = product?.categoria || ($('category-filter').value === 'todos' ? '' : $('category-filter').value);
    $('product-subcategory').value = product?.subcategoria || '';
    const values = { 'product-name': product?.nombre, 'product-price': product?.precio, 'product-priority': product?.orden, 'product-width': product?.ancho, 'product-height': product?.alto, 'product-depth': product?.fondo, 'product-description': product?.descripcion, 'thumb-x': product?.thumbPosX ?? 50, 'thumb-y': product?.thumbPosY ?? 50 };
    for (const [key, value] of Object.entries(values)) $(key).value = value ?? '';
    for (const key of ['p4', 'p6', 'p8']) $('price-' + key).value = product?.variantesComedor?.[key] ?? '';
    for (const key of ['a140', 'a160', 'a200']) $('price-' + key).value = product?.variantesAlcoba?.[key] ?? '';
    for (const key of MATERIALS) $('material-' + key).value = product?.materialesData?.[key] || '';
    for (const key of ['mascotas', 'antifluido']) $('cert-' + key).checked = product?.certificados?.includes(key) || false;
    $('materials-section').open = false; categoryChanged(); renderPhotos(); renderFinishes(); setBusy(false);
    $('product-dialog').showModal(); $('product-dialog').scrollTop = 0; $('product-name').focus();
  }
  function closeEditor() { if (state.busy) return; if (state.dirty && !confirm('Hay cambios en esta ficha sin guardar. ¿Cerrar sin guardar estos cambios?')) return; state.dirty = false; $('product-dialog').close(); }
  function nextId() { let id = Date.now(); const ids = new Set(state.products.map(p => String(p.id))); while (ids.has(String(id))) id++; return id; }
  function formProduct() {
    const previous = state.editing || {};
    const category = $('product-category').value;
    const variants = keys => Object.fromEntries(keys.filter(key => $('price-' + key).value !== '').map(key => [key, Number($('price-' + key).value)]));
    const comedor = variants(['p4', 'p6', 'p8']), alcoba = variants(['a140', 'a160', 'a200']);
    const materials = { ...(previous.materialesData || {}) }; for (const key of MATERIALS) { const value = $('material-' + key).value.trim(); if (value) materials[key] = value; else delete materials[key]; }
    const certs = (previous.certificados || []).filter(key => !['mascotas', 'antifluido'].includes(key)); for (const key of ['mascotas', 'antifluido']) if ($('cert-' + key).checked) certs.push(key);
    const product = { ...previous, id: previous.id ?? nextId(), categoria: category, subcategoria: category === 'junior' ? $('product-subcategory').value : null,
      nombre: $('product-name').value.trim(), precio: Number($('product-price').value || 0),
      variantesComedor: category === 'comedores' && Object.keys(comedor).length ? comedor : null,
      variantesAlcoba: category === 'alcobas' && Object.keys(alcoba).length ? alcoba : null,
      imagenes: [...state.photos], thumbPosX: $('thumb-x').value, thumbPosY: $('thumb-y').value, ajuste: previous.ajuste || 'cover',
      ancho: $('product-width').value.trim(), alto: $('product-height').value.trim(), fondo: $('product-depth').value.trim(),
      descripcion: $('product-description').value.trim(), materialesData: materials, certificados: certs, acabados: [...state.finishes] };
    if ($('product-priority').value !== '') product.orden = Number($('product-priority').value); else delete product.orden;
    return product;
  }
  async function saveProduct(publishNow) {
    if (state.busy || state.readonly || !$('product-form').reportValidity()) return;
    const product = formProduct(), errors = Order.validate([product]);
    if (errors.length) { $('form-status').textContent = errors.join('\n'); $('form-status').className = 'status error'; return; }
    setBusy(true);
    try {
      const index = state.products.findIndex(p => String(p.id) === String(product.id));
      if (index < 0) state.products.push(product); else state.products[index] = product;
      state.products = Order.sortProducts(state.products); state.pending = true;
      await persist(); state.dirty = false; $('product-dialog').close(); render();
      status('Borrador guardado en este dispositivo. Falta publicarlo para que aparezca en la web.', 'pending');
    } catch (error) { $('form-status').textContent = error.message; $('form-status').className = 'status error'; setBusy(false); return; }
    setBusy(false); if (publishNow) await publish(); else toast('Borrador guardado. Aún no está publicado.');
  }
  async function publish() {
    if (state.busy || state.readonly || !state.pending) return;
    setBusy(true); const generation = ++state.poll;
    try {
      if (state.conflict) throw new Store.ConflictError();
      const result = await state.repository.publish(state.products, state.sha, text => status(text, 'pending'));
      state.products = result.products; state.sha = result.sha; state.pending = false; state.conflict = false;
      try { await persist(); } catch { toast('Publicado en GitHub. No se pudo actualizar el respaldo local; descarga una copia.'); }
      render(); status('Guardado en GitHub. Comprobando la actualización de la web…', 'pending');
      checkDeployment(result, generation, 0);
    } catch (error) {
      if (error.name === 'ConflictError') state.conflict = true;
      status(error.message + '\nNo se ha marcado el borrador como publicado.', 'error'); toast('No se confirmó la publicación. Tus cambios siguen en el borrador.');
    } finally { setBusy(false); }
  }
  async function checkDeployment(result, generation, attempt) {
    if (generation !== state.poll || state.pending) return;
    try {
      const response = await fetch('/data/productos.json?v=' + result.commit, { cache: 'no-store' });
      if (response.ok && await Store.blobSha(await response.text()) === result.sha) {
        if (generation === state.poll && !state.pending) status('Los datos del catálogo ya están actualizados en la web. Las fichas y rutas se sincronizan automáticamente al terminar la publicación.', 'ok');
        return;
      }
    } catch { /* Deployment can be slower than the successful repository write. */ }
    if (generation !== state.poll || state.pending) return;
    if (attempt >= 11) { status('Cambios guardados en GitHub. La actualización de la web sigue en curso; abre el catálogo para comprobarla. No necesitas volver a publicar.', 'pending'); return; }
    setTimeout(() => checkDeployment(result, generation, attempt + 1), 5000);
  }
  async function deleteProduct() {
    if (!state.editing || state.busy) return;
    if (state.products.length <= 1) { $('form-status').textContent = 'Conserva al menos un producto en el catálogo publicado.'; return; }
    if (!confirm(`¿Eliminar «${state.editing.nombre}» del catálogo y publicar el cambio? Las fotos existentes no se borrarán del repositorio.`)) return;
    setBusy(true);
    try {
      state.products = state.products.filter(p => String(p.id) !== String(state.editing.id)); state.pending = true;
      await persist(); state.dirty = false; $('product-dialog').close(); render();
    } catch (error) { $('form-status').textContent = error.message; setBusy(false); return; }
    setBusy(false); await publish();
  }
  async function optimizePhoto(file) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error(`${file.name}: usa JPG, PNG o WebP.`);
    if (file.size > 20 * 1024 * 1024) throw new Error(`${file.name}: la imagen supera 20 MB.`);
    const url = URL.createObjectURL(file);
    try {
      const image = new Image(); image.src = url; await image.decode();
      const ratio = Math.min(1, 1800 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio)); canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
      const context = canvas.getContext('2d'); if (!context) throw new Error('No se pudo procesar la foto.');
      context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.88);
    } finally { URL.revokeObjectURL(url); }
  }
  async function addPhotos(event) {
    if (state.busy) return; const files = [...event.target.files]; if (!files.length) return;
    setBusy(true); const errors = [];
    for (const [index, file] of files.entries()) {
      $('form-status').textContent = `Preparando foto ${index + 1} de ${files.length}…`;
      try { state.photos.push(await optimizePhoto(file)); state.dirty = true; } catch (error) { errors.push(error.message); }
    }
    event.target.value = ''; renderPhotos(); $('form-status').textContent = errors.join('\n'); $('form-status').className = errors.length ? 'status error' : 'status'; setBusy(false);
  }
  function movePhoto(from, to) { if (state.busy || to < 0 || from < 0 || to >= state.photos.length || from === to) return; const [image] = state.photos.splice(from, 1); state.photos.splice(to, 0, image); state.dirty = true; renderPhotos(); }
  for (const target of ['category-filter', 'product-category']) for (const category of Order.categories) $(target).add(new Option(category.label, category.key));
  for (const sub of Order.junior) $('product-subcategory').add(new Option(sub.label, sub.key));
  $('login-form').addEventListener('submit', event => { event.preventDefault(); connect($('access-token').value.trim()); });
  $('read-only').addEventListener('click', readOnly);
  $('logout').addEventListener('click', () => {
    if (state.busy) return;
    if (state.dirty && !confirm('¿Cerrar sin guardar los cambios de esta ficha?')) return;
    state.poll++; sessionStorage.removeItem(SESSION_KEY); state.repository = null; state.dirty = false;
    $('workspace').hidden = true; $('login-panel').hidden = false; $('logout').hidden = true; $('logout').textContent = 'Cerrar sesión'; $('login-status').textContent = 'Conecta tu acceso para editar. Los borradores guardados se conservan en este dispositivo.';
  });
  $('search').addEventListener('input', render); $('category-filter').addEventListener('change', render);
  $('catalog-list').addEventListener('click', event => { const button = event.target.closest('[data-edit]'); if (button) openEditor(button.dataset.edit); });
  $('new-product').addEventListener('click', () => openEditor()); $('close-editor').addEventListener('click', closeEditor);
  $('product-dialog').addEventListener('cancel', event => { event.preventDefault(); closeEditor(); });
  $('product-form').addEventListener('input', () => { state.dirty = true; });
  $('product-category').addEventListener('change', categoryChanged); $('product-subcategory').addEventListener('change', categoryChanged);
  $('product-form').addEventListener('submit', event => { event.preventDefault(); saveProduct(true); });
  $('save-draft').addEventListener('click', () => saveProduct(false)); $('delete-product').addEventListener('click', deleteProduct);
  $('publish').addEventListener('click', publish); $('product-images').addEventListener('change', addPhotos);
  for (const id of ['thumb-x', 'thumb-y']) $(id).addEventListener('input', focal);
  $('photo-list').addEventListener('click', event => {
    if (state.busy) return; const move = event.target.closest('[data-move]'), remove = event.target.closest('[data-remove-photo]');
    if (move) movePhoto(Number(move.dataset.move), Number(move.dataset.move) + Number(move.dataset.direction));
    if (remove) { state.photos.splice(Number(remove.dataset.removePhoto), 1); state.dirty = true; renderPhotos(); }
  });
  $('photo-list').addEventListener('dragstart', event => { const card = event.target.closest('[data-photo]'); if (!card || state.busy) return; dragPhoto = Number(card.dataset.photo); event.dataTransfer.setData('text/plain', String(dragPhoto)); card.classList.add('dragging'); });
  $('photo-list').addEventListener('dragover', event => { if (event.target.closest('[data-photo]')) event.preventDefault(); });
  $('photo-list').addEventListener('drop', event => { const card = event.target.closest('[data-photo]'); if (!card || dragPhoto == null) return; event.preventDefault(); movePhoto(dragPhoto, Number(card.dataset.photo)); dragPhoto = null; });
  $('photo-list').addEventListener('dragend', () => { dragPhoto = null; document.querySelectorAll('.dragging').forEach(item => item.classList.remove('dragging')); });
  $('add-finish').addEventListener('click', () => { const color = $('finish-color').value; if (!state.finishes.includes(color)) { state.finishes.push(color); state.dirty = true; renderFinishes(); } });
  $('finish-list').addEventListener('click', event => { const button = event.target.closest('[data-remove-finish]'); if (button) { state.finishes.splice(Number(button.dataset.removeFinish), 1); state.dirty = true; renderFinishes(); } });
  $('export').addEventListener('click', () => exportData(state.products)); $('export-legacy').addEventListener('click', () => exportData(state.legacy, 'maderarte-borrador-anterior'));
  $('reload').addEventListener('click', async () => {
    if (state.busy) return;
    if ((state.pending || state.dirty) && !confirm('Recargar reemplazará el borrador de este dispositivo por lo publicado. Descarga un respaldo primero para conservarlo. ¿Continuar?')) return;
    setBusy(true); state.poll++;
    try { if (state.readonly) await readOnly(); else await loadAuthenticated(true); } catch (error) { status(error.message, 'error'); } finally { setBusy(false); }
  });
  window.addEventListener('beforeunload', event => { if (state.dirty || state.busy) { event.preventDefault(); event.returnValue = ''; } });
  // Migrate only the matching public-site connection. Never use credentials for another app.
  let token = '';
  try {
    token = sessionStorage.getItem(SESSION_KEY) || '';
    const legacy = JSON.parse(localStorage.getItem('maderarte_gh') || '{}');
    if (legacy.token && legacy.owner === 'alejoherrera05-del' && legacy.repo === 'Maderarte') {
      token ||= legacy.token; delete legacy.token; localStorage.setItem('maderarte_gh', JSON.stringify(legacy)); sessionStorage.setItem(SESSION_KEY, token);
    }
  } catch { /* Storage restrictions are explained at login, never bypass authentication. */ }
  if (token) connect(token);
})();
