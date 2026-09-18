/* Idempotent, fail-closed integration for the existing large storefront template.
   Run on an isolated branch; inspect the generated diff before merging. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function replaceOnce(text, oldText, newText, label) {
  if (text.includes(newText)) return text;
  if (text.split(oldText).length !== 2) throw new Error(`Expected exactly one unchanged ${label}; review the template before applying.`);
  return text.replace(oldText, newText);
}
const indexPath = path.join(root, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8').replace(/\r\n?/g, '\n');
html = replaceOnce(html, '</head>', '<link rel="stylesheet" href="/assets/catalog-public.css?v=20260918">\n<script src="/assets/catalog-order.js?v=20260918"></script>\n</head>', 'head');
html = replaceOnce(html, '       <span>Muebles y decoración en Popayán · atención cercana, siempre</span>', '       <span>Muebles y decoración en Popayán · atención cercana, siempre</span>\n      <a class="footer-admin" href="/admin.html" aria-label="Administrar el catálogo de Maderarte"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 14v3"/></svg><span>ADMIN</span></a>', 'footer');
html = replaceOnce(html, 'window.location.href = "admin.html?admin=1";', 'window.location.href = "/admin.html";', 'legacy admin redirect');
html = replaceOnce(html, 'catalogProducts = response.ok ? await response.json() : [];', 'catalogProducts = CatalogOrder.sortProducts(response.ok ? await response.json() : []);', 'catalogue load');
html = replaceOnce(html, '  grid.innerHTML = list.map((product, index) => {', `  const groupedView = activeCatalogFilter === "todos" || activeCatalogFilter === "favoritos";
  const categoryCounts = new Map(CatalogOrder.groups(list).map(group => [group.key, group.products.length]));
  grid.innerHTML = list.map((product, index) => {`, 'catalogue renderer');
html = replaceOnce(html, '    return `\n      <a class="product-card"', `    const beginsCategory = groupedView && (index === 0 || list[index - 1].categoria !== product.categoria);
    const groupCount = categoryCounts.get(product.categoria) || 0;
    const groupHeading = beginsCategory ? \`<div class="catalog-group-heading"><h3>\${escapeHTML(CatalogOrder.label(product.categoria))}</h3><span>\${groupCount} \${groupCount === 1 ? "diseño" : "diseños"}</span></div>\` : "";
    return \`\${groupHeading}
      <a class="product-card"`, 'product markup');
fs.writeFileSync(indexPath, html);
const builderPath = path.join(root, 'tools/build-seo-pages.mjs');
let builder = fs.readFileSync(builderPath, 'utf8').replace(/\r\n?/g, '\n');
builder = replaceOnce(builder, 'import fs from "node:fs/promises";', 'import fs from "node:fs/promises";\nimport CatalogOrder from "../assets/catalog-order.js";', 'SEO imports');
builder = replaceOnce(builder, 'const products = JSON.parse(await fs.readFile(path.join(root, "data", "productos-publicos.json"), "utf8"));', 'const products = CatalogOrder.sortProducts(JSON.parse(await fs.readFile(path.join(root, "data", "productos-publicos.json"), "utf8")));', 'SEO ordering');
// Remove only generated product HTML that no longer belongs to the current catalogue.
// Uploaded images and unrelated files are never deleted.
builder = replaceOnce(builder, 'for (const product of products) {\n  const category = categories[normalizeCategory(product.categoria)] || categories.salas;', `const productRoot = path.join(root, "catalogo", "producto");
const expectedProductFolders = new Set(products.map(product => productPath(product).split("/").filter(Boolean).pop()));
for (const entry of await fs.readdir(productRoot, { withFileTypes: true }).catch(error => { if (error.code === "ENOENT") return []; throw error; })) {
  if (!entry.isDirectory() || expectedProductFolders.has(entry.name)) continue;
  const oldPage = path.join(productRoot, entry.name, "index.html");
  const oldMarkup = await fs.readFile(oldPage, "utf8").catch(error => { if (error.code === "ENOENT") return ""; throw error; });
  if (oldMarkup.includes('data-seo-route="product"')) {
    await fs.unlink(oldPage);
    await fs.rmdir(path.dirname(oldPage)).catch(error => { if (error.code !== "ENOTEMPTY") throw error; });
  }
}

for (const product of products) {
  const category = categories[normalizeCategory(product.categoria)] || categories.salas;`, 'stale generated routes');
fs.writeFileSync(builderPath, builder);
console.log('Catalogue integration applied without changing product records or uploaded images.');
