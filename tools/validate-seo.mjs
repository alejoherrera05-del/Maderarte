import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = "https://maderartepopayan.com";
const failures = [];
const titles = new Map();
const descriptions = new Map();

function fail(message) {
  failures.push(message);
}

function match(html, expression, label, file) {
  const value = html.match(expression)?.[1]?.trim();
  if (!value) fail(`${file}: falta ${label}`);
  return value || "";
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
    if ([".git", "tools", "img", "icons", "fonts", "backup-estable"].includes(entry.name)) continue;
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
  if (locations.length < 40) fail(`sitemap.xml: solo contiene ${locations.length} URLs`);

  for (const url of locations) {
    if (!url.startsWith(baseUrl)) fail(`sitemap.xml: URL fuera del dominio (${url})`);
    if (new URL(url).pathname !== "/" && !new URL(url).pathname.endsWith("/")) {
      fail(`sitemap.xml: URL sin barra final (${url})`);
    }
    const relative = localPathFromUrl(url);
    if (!await exists(relative)) fail(`sitemap.xml: no existe ${relative}`);
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
await validateRobotsAndLlms();

if (failures.length) {
  console.error("VALIDACIÓN SEO FALLIDA");
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log(`SEO OK: ${htmlFiles.length} páginas HTML, ${titles.size} títulos únicos y sitemap íntegro.`);
