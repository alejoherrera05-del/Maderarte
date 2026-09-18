/* Shared by the storefront, catalogue editor and SEO builder. No upload-date sorting. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CatalogOrder = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const categories = Object.freeze([
    { key: 'salas', label: 'Salas' }, { key: 'comedores', label: 'Comedores' },
    { key: 'alcobas', label: 'Alcobas' }, { key: 'sofacamas', label: 'Sofá camas' },
    { key: 'junior', label: 'Maderarte Junior' }
  ]);
  const junior = Object.freeze([
    { key: 'cama_cunas', label: 'Cama cunas' }, { key: 'cunas_convertibles', label: 'Cunas convertibles' },
    { key: 'montessori', label: 'Montessori' }, { key: 'alcobas_juveniles', label: 'Alcobas juveniles' },
    { key: 'armarios_cambiadores', label: 'Armarios y cambiadores' }, { key: 'lencerias', label: 'Lencerías' }
  ]);
  const collator = new Intl.Collator('es-CO', { sensitivity: 'base', numeric: true });
  const fold = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const aliases = { sala: 'salas', comedor: 'comedores', alcoba: 'alcobas', cama: 'alcobas', camas: 'alcobas', sofa_camas: 'sofacamas', sofa_cama: 'sofacamas', sofacama: 'sofacamas', maderarte_junior: 'junior' };
  function categoryKey(value) { const key = fold(value).replace(/[\s-]+/g, '_'); return aliases[key] || key; }
  function rank(list, key) { const i = list.findIndex(item => item.key === key); return i < 0 ? list.length : i; }
  function priority(product) {
    const value = product.orden;
    return value !== '' && value != null && Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : Number.MAX_SAFE_INTEGER;
  }
  function compare(a, b) {
    const ca = categoryKey(a.categoria), cb = categoryKey(b.categoria);
    const category = rank(categories, ca) - rank(categories, cb) || collator.compare(ca, cb);
    if (category) return category;
    if (ca === 'junior') {
      const subgroup = rank(junior, a.subcategoria) - rank(junior, b.subcategoria) || collator.compare(a.subcategoria || '', b.subcategoria || '');
      if (subgroup) return subgroup;
    }
    return priority(a) - priority(b) || collator.compare(a.nombre || '', b.nombre || '') || collator.compare(String(a.id), String(b.id));
  }
  function sortProducts(items) {
    if (!Array.isArray(items)) return [];
    return items.filter(item => item && typeof item === 'object' && !Array.isArray(item)).map(item => {
      const key = categoryKey(item.categoria);
      return key === item.categoria ? item : { ...item, categoria: key };
    }).sort(compare);
  }
  function label(key) { return categories.find(item => item.key === categoryKey(key))?.label || 'Otras categorías'; }
  function sublabel(key) { return junior.find(item => item.key === key)?.label || key || ''; }
  function groups(items) {
    const result = [];
    for (const product of sortProducts(items)) {
      const key = categoryKey(product.categoria);
      let group = result[result.length - 1];
      if (!group || group.key !== key) { group = { key, label: label(key), products: [] }; result.push(group); }
      group.products.push(product);
    }
    return result;
  }
  function publicProducts(value) {
    if (Array.isArray(value)) return value.map(publicProducts);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
      .filter(([key]) => !/(precio|price|valor|variantesComedor|variantesAlcoba)/i.test(key))
      .map(([key, item]) => [key, publicProducts(item)]));
    return value;
  }
  function validImage(src) {
    return typeof src === 'string' && (/^\/(?!\/)[^<>"\s]+$/.test(src) || /^https:\/\/[^<>"\s]+$/.test(src) || /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=\s]+$/.test(src));
  }
  function validate(items) {
    const errors = [], ids = new Set();
    if (!Array.isArray(items)) return ['El catálogo debe ser una lista de productos.'];
    if (!items.length) return ['Conserva al menos un producto antes de publicar el catálogo.'];
    for (const [i, p] of items.entries()) {
      const prefix = `Producto ${i + 1}`;
      if (!p || typeof p !== 'object' || Array.isArray(p)) { errors.push(`${prefix}: registro inválido.`); continue; }
      const name = String(p.nombre || '').trim() || prefix;
      if (p.id == null || !/^\d+$/.test(String(p.id)) || ids.has(String(p.id))) errors.push(`${name}: identificador ausente, inválido o repetido.`);
      ids.add(String(p.id));
      if (!String(p.nombre || '').trim()) errors.push(`${prefix}: falta el nombre.`);
      if (!categories.some(c => c.key === categoryKey(p.categoria))) errors.push(`${name}: selecciona una categoría válida.`);
      if (categoryKey(p.categoria) === 'junior' && !junior.some(c => c.key === p.subcategoria)) errors.push(`${name}: selecciona una subcategoría Junior.`);
      if (!Array.isArray(p.imagenes) || !p.imagenes.length || p.imagenes.some(src => !validImage(src))) errors.push(`${name}: revisa las fotos (JPG, PNG o WebP).`);
      const prices = [p.precio, ...Object.values(p.variantesAlcoba || {}), ...Object.values(p.variantesComedor || {})];
      if (prices.some(n => n != null && n !== '' && (!Number.isFinite(Number(n)) || Number(n) < 0))) errors.push(`${name}: los precios no pueden ser negativos ni inválidos.`);
      if (p.orden != null && p.orden !== '' && (!Number.isFinite(Number(p.orden)) || Number(p.orden) < 0)) errors.push(`${name}: revisa la prioridad.`);
    }
    return errors;
  }
  return Object.freeze({ categories, junior, fold, categoryKey, compare, sortProducts, groups, label, sublabel, publicProducts, validImage, validate });
});
