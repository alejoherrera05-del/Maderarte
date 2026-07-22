const fs = require("fs");
const http = require("http");
const path = require("path");

const root = path.resolve(__dirname, "..");
const htmlPath = path.join(root, "index.html");
const html = fs.readFileSync(htmlPath, "utf8");
const failures = [];
const warnings = [];

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function readJson(relativePath) {
  try {
    const text = fs.readFileSync(path.join(root, relativePath), "utf8").replace(/^\uFEFF/, "");
    return JSON.parse(text);
  } catch (error) {
    fail(`${relativePath}: JSON invalido (${error.message})`);
    return [];
  }
}

function sameFile(a, b) {
  const left = fs.readFileSync(path.join(root, a), "utf8");
  const right = fs.readFileSync(path.join(root, b), "utf8");
  return left === right;
}

function checkStaticFiles() {
  const requiredFiles = [
    "index.html",
    "404.html",
    "admin.html",
    "data/productos.json",
    "data/productos-publicos.json",
    "logomaderarte2026.png",
    "favicon-32.png",
    "apple-touch-icon.png",
    "Portada.png",
    "Portada-mobile.jpg",
    "Sala.png",
    "comedores.png",
    "Alcobas.png",
    "sofacamas.png",
    "junior.png",
    "origen.png",
    "proceso-moodboard.png",
    "icons/tape-measure.webp",
    "icons/material-moodboard.webp",
    "icons/design-proposal.webp",
    "icons/maderarte-cat-salas.png",
    "icons/maderarte-cat-comedores.png",
    "icons/maderarte-cat-alcobas.png",
    "icons/maderarte-cat-sofacamas.png",
    "icons/maderarte-cat-junior.png"
  ];

  requiredFiles.forEach((file) => {
    if (!exists(file)) fail(`Falta archivo esencial: ${file}`);
  });

  const routeCopies = [
    "404.html",
    "catalogo/index.html",
    "colecciones/index.html",
    "proceso/index.html",
    "historia/index.html",
    "contacto/index.html",
    "inicio/index.html"
  ];

  routeCopies.forEach((file) => {
    if (!exists(file)) {
      fail(`Falta ruta limpia: ${file}`);
      return;
    }
    if (!sameFile("index.html", file)) {
      fail(`${file} no esta sincronizado con index.html. Ejecuta tools/sync-routes.ps1`);
    }
  });
}

function checkHtmlContracts() {
  const contracts = [
    ["Catalogo publico absoluto", /const catalogFile = showPrices \? "\/data\/productos\.json" : "\/data\/productos-publicos\.json";/],
    ["Render de productos conserva index", /list\.map\(\(product, index\) =>/],
    ["Modal tiene imagen segura inicial", /id="dialog-image" src="data:image\/gif;base64/],
    ["Lightbox tiene imagen segura inicial", /id="image-lightbox-img" src="data:image\/gif;base64/],
    ["SEO local Popayan", /muebles (?:y|&) decoraci[oó]n en popay[aá]n/i],
    ["Ruta catalogo limpia", /catalogo:\s*"\/catalogo"/],
    ["Ruta colecciones limpia", /colecciones:\s*"\/colecciones"/]
  ];

  contracts.forEach(([label, pattern]) => {
    if (!pattern.test(html)) fail(`Contrato roto: ${label}`);
  });

  if (/src=""/.test(html) || /href=""/.test(html)) {
    fail("Hay src/href vacios en index.html");
  }

  const relativeSrc = [...html.matchAll(/\s(?:src|href)=["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter((value) => {
      if (/^(\/|#|https?:|mailto:|tel:|whatsapp:|data:|javascript:)/i.test(value)) return false;
      if (value.includes("${")) return false;
      return true;
    });

  if (relativeSrc.length) {
    fail(`Rutas relativas peligrosas en src/href: ${relativeSrc.slice(0, 8).join(", ")}`);
  }

  const relativeCssUrls = [...html.matchAll(/url\((["']?)([^"')]+)\1\)/g)]
    .map((match) => match[2])
    .filter((value) => {
      if (/^(\/|https?:|data:)/i.test(value)) return false;
      return true;
    });

  if (relativeCssUrls.length) {
    fail(`Rutas relativas peligrosas en CSS url(): ${relativeCssUrls.slice(0, 8).join(", ")}`);
  }
}

function checkCatalogData() {
  const privateProducts = readJson("data/productos.json");
  const publicProducts = readJson("data/productos-publicos.json");
  const allowedCategories = new Set(["salas", "comedores", "alcobas", "sofa-camas", "sofacamas", "junior"]);

  if (!Array.isArray(privateProducts) || privateProducts.length < 1) {
    fail("data/productos.json no tiene productos");
  }
  if (!Array.isArray(publicProducts) || publicProducts.length < 1) {
    fail("data/productos-publicos.json no tiene productos");
  }
  if (privateProducts.length !== publicProducts.length) {
    fail(`Catalogos desalineados: privado ${privateProducts.length}, publico ${publicProducts.length}`);
  }

  const publicIds = new Set(publicProducts.map((product) => String(product.id)));
  privateProducts.forEach((product, index) => {
    const label = product.nombre || `producto ${index + 1}`;
    if (!product.id) fail(`${label}: falta id`);
    if (!product.nombre) fail(`${label}: falta nombre`);
    if (!allowedCategories.has(product.categoria)) fail(`${label}: categoria inesperada (${product.categoria})`);
    if (!Array.isArray(product.imagenes) || product.imagenes.length < 1) fail(`${label}: sin imagenes`);
    if (!publicIds.has(String(product.id))) fail(`${label}: no existe en catalogo publico`);
    (product.imagenes || []).forEach((image) => {
      if (!/^(https?:\/\/|\/)/.test(image)) fail(`${label}: imagen con ruta no segura (${image})`);
    });
  });

  publicProducts.forEach((product) => {
    if (Object.prototype.hasOwnProperty.call(product, "precio")) {
      fail(`${product.nombre}: el catalogo publico no debe mostrar precio`);
    }
  });
}

function contentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".svg": "image/svg+xml; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".ttf": "font/ttf"
  }[extension] || "application/octet-stream";
}

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, "http://127.0.0.1");
      let pathname = decodeURIComponent(url.pathname);
      if (pathname === "/") pathname = "/index.html";
      const filePath = path.normalize(path.join(root, pathname));

      if (!filePath.startsWith(root)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }

      fs.readFile(filePath, (error, data) => {
        if (error) {
          fs.readFile(htmlPath, (fallbackError, fallbackData) => {
            if (fallbackError) {
              res.writeHead(404);
              res.end("Not found");
              return;
            }
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
            res.end(fallbackData);
          });
          return;
        }
        res.writeHead(200, { "Content-Type": contentType(filePath), "Cache-Control": "no-store" });
        res.end(data);
      });
    });

    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${address.port}` });
    });
  });
}

async function checkBrowser() {
  let chromium;
  try {
    chromium = require("playwright").chromium;
  } catch (error) {
    warn("Prueba visual omitida: Playwright no esta disponible en este entorno");
    return;
  }

  const { server, baseUrl } = await startServer();
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH || undefined
  });

  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true
    });
    const errors = [];
    const failed = [];

    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (response) => {
      if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`);
    });

    await page.goto(`${baseUrl}/catalogo/`, { waitUntil: "networkidle", timeout: 60000 });
    await page.locator("#catalogo").scrollIntoViewIfNeeded();
    await page.waitForTimeout(2500);

    const publicMetrics = await page.evaluate(() => ({
      cards: document.querySelectorAll(".product-card").length,
      hasPrices: [...document.querySelectorAll(".product-card")].some((card) => /\$\s?[\d.]+/.test(card.innerText)),
      broken: [...document.images].filter((img) => img.complete && img.naturalWidth === 0).map((img) => img.currentSrc || img.src),
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth
    }));

    if (publicMetrics.cards < 1) fail("Navegador movil: el catalogo publico no renderiza productos");
    if (publicMetrics.hasPrices) fail("Navegador movil: el catalogo publico esta mostrando precios");
    if (publicMetrics.broken.length) fail(`Navegador movil: imagenes rotas (${publicMetrics.broken.slice(0, 5).join(", ")})`);
    if (publicMetrics.scrollWidth > publicMetrics.innerWidth + 1) fail(`Navegador movil: hay scroll horizontal (${publicMetrics.scrollWidth}/${publicMetrics.innerWidth})`);

    await page.goto(`${baseUrl}/catalogo/?precios=maderarte2026`, { waitUntil: "networkidle", timeout: 60000 });
    await page.locator("#catalogo").scrollIntoViewIfNeeded();
    await page.waitForTimeout(2500);

    const privateMetrics = await page.evaluate(() => ({
      cards: document.querySelectorAll(".product-card").length,
      hasPrices: [...document.querySelectorAll(".product-card")].some((card) => /\$\s?[\d.]+/.test(card.innerText)),
      broken: [...document.images].filter((img) => img.complete && img.naturalWidth === 0).map((img) => img.currentSrc || img.src),
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth
    }));

    if (privateMetrics.cards < 1) fail("Navegador movil: el catalogo con precios no renderiza productos");
    if (!privateMetrics.hasPrices) fail("Navegador movil: el link con precios no muestra precios");
    if (privateMetrics.broken.length) fail(`Navegador movil con precios: imagenes rotas (${privateMetrics.broken.slice(0, 5).join(", ")})`);
    if (privateMetrics.scrollWidth > privateMetrics.innerWidth + 1) fail(`Navegador movil con precios: hay scroll horizontal (${privateMetrics.scrollWidth}/${privateMetrics.innerWidth})`);

    if (errors.length) fail(`Errores JS en navegador: ${errors.join(" | ")}`);
    if (failed.length) fail(`Recursos fallidos en navegador: ${failed.slice(0, 8).join(" | ")}`);
  } finally {
    await browser.close();
    server.close();
  }
}

async function main() {
  checkStaticFiles();
  checkHtmlContracts();
  checkCatalogData();
  await checkBrowser();

  if (warnings.length) {
    console.log("\nAvisos:");
    warnings.forEach((message) => console.log(`- ${message}`));
  }

  if (failures.length) {
    console.error("\nBLINDAJE FALLIDO");
    failures.forEach((message) => console.error(`- ${message}`));
    process.exit(1);
  }

  console.log("BLINDAJE OK: rutas, catalogo, imagenes y vista movil esenciales estan sanos.");
}

main().catch((error) => {
  console.error("BLINDAJE FALLIDO");
  console.error(error);
  process.exit(1);
});
