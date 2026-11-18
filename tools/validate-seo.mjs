import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = "https://maderartepopayan.com";
const failures = [];
const titles = new Map();
const descriptions = new Map();
const products = JSON.parse(await fs.readFile(path.join(root, "data/productos-publicos.json"), "utf8"));

function fail(message) {
  failures.push(message);
}

function match(html, expression, label, file) {
  const value = html.match(expression)?.[1]?.trim();
  if (!value) fail(`${file}: falta ${label}`);
  return String(value || "").replace(/&(?:quot|apos|lt|gt|amp|#39);/g, entity => ({
    "&quot;": '"', "&apos;": "'", "&#39;": "'", "&lt;": "<", "&gt;": ">", "&amp;": "&"
  })[entity]);
}

function productUrl(product) {
  const slug = String(product.nombre || "pieza").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${baseUrl}/catalogo/producto/${slug}-${product.id}/`;
}

async function validateImage(value, label) {
  let url;
  try { url = new URL(value); } catch { fail(`${label}: URL de imagen inválida`); return; }
  if (url.protocol !== "https:") fail(`${label}: la imagen debe usar HTTPS`);
  if (url.origin === baseUrl && !await exists(localPathFromUrl(value))) fail(`${label}: no existe ${url.pathname}`);
}

function localPathFromUrl(value) {
  const url = new URL(value, baseUrl);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") return "index.html";
  pathname = pathname.replace(/^\/+|\/+$/g, "");
  return path.extname(pathname) ? pathname : path.join(pathname, "index.html");
}

async function exists(relativePath) {
  try {
    await fs.access(path.join(root, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function collectHtml(directory = root) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if ([".git", "node_modules", "tools", "img", "icons", "fonts", "backup-estable"].includes(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectHtml(absolute));
    if (entry.isFile() && entry.name === "index.html") files.push(absolute);
  }
  return files;
}

function registerUnique(map, value, file, label) {
  if (!value) return;
  const existing = map.get(value);
  if (existing && existing !== file) {
    fail(`${file}: ${label} duplicado con ${existing}`);
  } else {
    map.set(value, file);
  }
}

async function validateHtml(file) {
  const relative = path.relative(root, file).replaceAll("\\", "/");
  const html = await fs.readFile(file, "utf8");
  const title = match(html, /<title>([\s\S]*?)<\/title>/i, "title", relative);
  const description = match(
    html,
    /<meta\s+name="description"\s+content="([^"]+)"/i,
    "meta description",
    relative
  );
  const canonical = match(
    html,
    /<link\s+rel="canonical"\s+href="([^"]+)"/i,
    "canonical",
    relative
  );
  const robots = match(
    html,
    /<meta\s+name="robots"\s+content="([^"]+)"/i,
    "robots",
    relative
  );
  const ogImage = match(
    html,
    /<meta\s+property="og:image"\s+content="([^"]+)"/i,
    "og:image",
    relative
  );

  if (title.length > 65) fail(`${relative}: title demasiado largo (${title.length})`);
  if (description.length < 70 || description.length > 170) {
    fail(`${relative}: meta description fuera de rango (${description.length})`);
  }
  if (!canonical.startsWith(baseUrl)) fail(`${relative}: canonical fuera del dominio oficial`);
  if (!ogImage.startsWith("https://")) fail(`${relative}: og:image no es absoluta`);
  await validateImage(ogImage, `${relative}: og:image`);
  const ogUrl = match(html, /<meta\s+property="og:url"\s+content="([^"]+)"/i, "og:url", relative);
  const twitterImage = match(html, /<meta\s+name="twitter:image"\s+content="([^"]+)"/i, "twitter:image", relative);
  if (ogUrl !== canonical) fail(`${relative}: og:url no coincide con canonical`);
  if (twitterImage !== ogImage) fail(`${relative}: twitter:image no coincide con la portada Open Graph`);

  if (!/noindex/i.test(robots)) {
    const expectedPath = relative === "index.html"
      ? "/"
      : `/${path.dirname(relative).replaceAll("\\", "/").replace(/^\/+|\/+$/g, "")}/`;
    const expectedCanonical = `${baseUrl}${expectedPath}`;
    if (canonical !== expectedCanonical) {
      fail(`${relative}: canonical ${canonical} no coincide con la URL pública ${expectedCanonical}`);
    }
    const headings = [...html.matchAll(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi)];
    if (headings.length !== 1) fail(`${relative}: debe contener exactamente un H1 (encontrados ${headings.length})`);
  }

  registerUnique(titles, title, relative, "title");
  registerUnique(descriptions, description, relative, "meta description");

  const schemas = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  if (!schemas.length) fail(`${relative}: no contiene datos estructurados`);
  for (const [index, schema] of schemas.entries()) {
    try {
      JSON.parse(schema[1]);
    } catch (error) {
      fail(`${relative}: JSON-LD ${index + 1} inválido (${error.message})`);
    }
  }
}

async function validateSitemap() {
  const xml = await fs.readFile(path.join(root, "sitemap.xml"), "utf8");
  const locations = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  const duplicates = locations.filter((url, index) => locations.indexOf(url) !== index);
  if (duplicates.length) fail(`sitemap.xml: URLs duplicadas (${[...new Set(duplicates)].join(", ")})`);
  const expected = ["/", "/catalogo/", "/proceso/", "/historia/", "/contacto/", ...["salas", "comedores", "alcobas", "sofa-camas", "junior"].map(category => `/catalogo/${category}/`)]
    .map(route => `${baseUrl}${route}`).concat(products.map(productUrl));
  for (const url of expected) if (!locations.includes(url)) fail(`sitemap.xml: falta ${url}`);
  for (const url of locations) if (!expected.includes(url)) fail(`sitemap.xml: URL obsoleta o inesperada (${url})`);

  for (const url of locations) {
    if (!url.startsWith(baseUrl)) fail(`sitemap.xml: URL fuera del dominio (${url})`);
    if (new URL(url).pathname !== "/" && !new URL(url).pathname.endsWith("/")) {
      fail(`sitemap.xml: URL sin barra final (${url})`);
    }
    const relative = localPathFromUrl(url);
    if (!await exists(relative)) fail(`sitemap.xml: no existe ${relative}`);
  }
}

async function validateProductPages() {
  const urls = new Set();
  for (const product of products) {
    const url = productUrl(product);
    if (urls.has(url)) fail(`${product.nombre}: enlace de producto duplicado`);
    urls.add(url);
    const relative = localPathFromUrl(url);
    if (!await exists(relative)) { fail(`${product.nombre}: falta su página individual (${relative})`); continue; }
    const html = await fs.readFile(path.join(root, relative), "utf8");
    const image = new URL(product.imagenes?.[0] || "/catalogo-maderarte-share-v1.png", baseUrl).href;
    const ogImage = match(html, /<meta\s+property="og:image"\s+content="([^"]+)"/i, "og:image", relative);
    const secureImage = match(html, /<meta\s+property="og:image:secure_url"\s+content="([^"]+)"/i, "og:image:secure_url", relative);
    if (ogImage !== image || secureImage !== image) fail(`${product.nombre}: la miniatura no es su primera foto`);
    const ogTitle = match(html, /<meta\s+property="og:title"\s+content="([^"]+)"/i, "og:title", relative);
    if (ogTitle !== `${product.nombre} | Maderarte Popayán`) fail(`${product.nombre}: título social de otro producto`);
    for (const src of product.imagenes || []) await validateImage(new URL(src, baseUrl).href, `${product.nombre}: foto`);
    const routeSchema = html.match(/<script type="application\/ld\+json" id="seo-route-schema">([\s\S]*?)<\/script>/)?.[1];
    try {
      const schemaProduct = JSON.parse(routeSchema)["@graph"].find(node => node["@type"] === "Product");
      if (!schemaProduct || schemaProduct.url !== url || schemaProduct.sku !== String(product.id) || schemaProduct.image?.[0] !== image) {
        fail(`${product.nombre}: datos estructurados no corresponden al producto y su portada`);
      }
    } catch { fail(`${product.nombre}: falta el esquema de producto válido`); }
  }
}

async function validateRobotsAndLlms() {
  const robots = await fs.readFile(path.join(root, "robots.txt"), "utf8");
  if (!robots.includes("Sitemap: https://maderartepopayan.com/sitemap.xml")) {
    fail("robots.txt: falta la referencia al sitemap oficial");
  }
  if (!/User-agent:\s*\*\s*[\s\S]*Allow:\s*\//i.test(robots)) {
    fail("robots.txt: los rastreadores públicos no tienen acceso explícito");
  }

  const llms = await fs.readFile(path.join(root, "llms.txt"), "utf8");
  for (const phrase of ["Maderarte Popayán", "muebles y decoración", "Transversal 9", "Terraplaza"]) {
    if (!llms.includes(phrase)) fail(`llms.txt: falta "${phrase}"`);
  }
}

const htmlFiles = await collectHtml();
for (const file of htmlFiles) await validateHtml(file);
await validateSitemap();
await validateProductPages();
await validateRobotsAndLlms();

if (failures.length) {
  console.error("VALIDACIÓN SEO FALLIDA");
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log(`SEO OK: ${htmlFiles.length} páginas HTML, ${titles.size} títulos únicos y sitemap íntegro.`);
