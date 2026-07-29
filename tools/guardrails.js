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

function slugify(value) {
  return String(value || "pieza")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function checkStaticFiles() {
  const requiredFiles = [
    "index.html",
    "404.html",
    "admin.html",
    "sitemap.xml",
    "robots.txt",
    "llms.txt",
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
    "icons/tape-measure-clean.webp",
    "icons/tape-measure-mobile.webp",
    "icons/material-moodboard-clean.webp",
    "icons/material-moodboard-mobile.webp",
    "icons/design-proposal-clean.webp",
    "icons/design-proposal-mobile.webp",
    "icons/maderarte-cat-salas.png",
    "icons/maderarte-cat-comedores.png",
    "icons/maderarte-cat-alcobas.png",
    "icons/maderarte-cat-sofacamas.png",
    "icons/maderarte-cat-junior.png"
  ];

  requiredFiles.forEach((file) => {
    if (!exists(file)) fail(`Falta archivo esencial: ${file}`);
  });

  const requiredRoutes = [
    "404.html",
    "catalogo/index.html",
    "catalogo/salas/index.html",
    "catalogo/comedores/index.html",
    "catalogo/alcobas/index.html",
    "catalogo/sofa-camas/index.html",
    "catalogo/junior/index.html",
    "colecciones/index.html",
    "proceso/index.html",
    "historia/index.html",
    "contacto/index.html",
    "inicio/index.html"
  ];

  requiredRoutes.forEach((file) => {
    if (!exists(file)) fail(`Falta ruta indexable: ${file}`);
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
    ["Ruta colecciones limpia", /colecciones:\s*"\/colecciones"/],
    ["Productos con enlaces rastreables", /<a class="product-card" href="\$\{escapeHTML\(productPublicPath\(product\)\)\}"/],
    ["Rutas de producto legibles", /function productPublicPath\(product\)/],
    ["Precios privados sin indexacion", /noindex, nofollow, noarchive/]
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
    const productRoute = `catalogo/producto/${slugify(product.nombre)}-${product.id}/index.html`;
    if (!exists(productRoute)) fail(`${product.nombre}: falta su pagina SEO (${productRoute})`);
  });

  const sitemap = exists("sitemap.xml") ? fs.readFileSync(path.join(root, "sitemap.xml"), "utf8") : "";
  if (!sitemap.includes("https://maderartepopayan.com/catalogo/salas")) {
    fail("El sitemap no contiene las categorias del catalogo");
  }
  publicProducts.forEach((product) => {
    const url = `https://maderartepopayan.com/catalogo/producto/${slugify(product.nombre)}-${product.id}`;
    if (!sitemap.includes(url)) fail(`${product.nombre}: falta en sitemap.xml`);
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
      let filePath = path.normalize(path.join(root, pathname));
      if (pathname.endsWith("/")) {
        filePath = path.join(filePath, "index.html");
      } else if (!path.extname(filePath) && fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, "index.html");
      }

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
  const screenshotDir = process.env.REVIEW_SCREENSHOT_DIR
    ? path.resolve(process.env.REVIEW_SCREENSHOT_DIR)
    : "";
  if (screenshotDir) fs.mkdirSync(screenshotDir, { recursive: true });
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

    await page.goto(`${baseUrl}/catalogo/salas/`, { waitUntil: "networkidle", timeout: 60000 });
    await page.locator("#catalogo").scrollIntoViewIfNeeded();
    await page.waitForTimeout(2500);
    if (screenshotDir) {
      await page.screenshot({ path: path.join(screenshotDir, "categoria-salas-mobile.png"), fullPage: true });
    }

    const publicMetrics = await page.evaluate(() => ({
      cards: document.querySelectorAll(".product-card").length,
      hasPrices: [...document.querySelectorAll(".product-card")].some((card) => /\$\s?[\d.]+/.test(card.innerText)),
      broken: [...document.images].filter((img) => img.complete && img.naturalWidth === 0).map((img) => img.currentSrc || img.src),
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      intro: document.querySelector(".catalog-route-intro h1")?.textContent || "",
      anchors: document.querySelectorAll('a.product-card[href^="/catalogo/producto/"]').length
    }));

    if (publicMetrics.cards < 1) fail("Navegador movil: el catalogo publico no renderiza productos");
    if (publicMetrics.hasPrices) fail("Navegador movil: el catalogo publico esta mostrando precios");
    if (publicMetrics.broken.length) fail(`Navegador movil: imagenes rotas (${publicMetrics.broken.slice(0, 5).join(", ")})`);
    if (publicMetrics.scrollWidth > publicMetrics.innerWidth + 1) fail(`Navegador movil: hay scroll horizontal (${publicMetrics.scrollWidth}/${publicMetrics.innerWidth})`);
    if (!/Salas en Popayán/i.test(publicMetrics.intro)) fail("Navegador movil: la pagina de categoria no muestra su contenido local");
    if (publicMetrics.anchors < 1) fail("Navegador movil: los productos no tienen enlaces rastreables");

    const firstProduct = readJson("data/productos-publicos.json")[0];
    const productUrl = `${baseUrl}/catalogo/producto/${slugify(firstProduct.nombre)}-${firstProduct.id}/`;
    await page.goto(productUrl, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(1600);
    if (screenshotDir) {
      await page.screenshot({ path: path.join(screenshotDir, "producto-mobile.png"), fullPage: false });
    }
    if (!(await page.locator("#catalog-modal.open").count())) {
      fail("Navegador movil: la URL directa de producto no abre su ficha");
    }
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    if (!canonical?.includes(`/catalogo/producto/${slugify(firstProduct.nombre)}-${firstProduct.id}`)) {
      fail("Navegador movil: la ficha de producto no tiene canonical propio");
    }

    await page.goto(`${baseUrl}/catalogo/?precios=maderarte2026`, { waitUntil: "networkidle", timeout: 60000 });
    await page.locator("#catalogo").scrollIntoViewIfNeeded();
    await page.waitForTimeout(2500);

    const privateMetrics = await page.evaluate(() => ({
      cards: document.querySelectorAll(".product-card").length,
      hasPrices: [...document.querySelectorAll(".product-card")].some((card) => /\$\s?[\d.]+/.test(card.innerText)),
      broken: [...document.images].filter((img) => img.complete && img.naturalWidth === 0).map((img) => img.currentSrc || img.src),
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      robots: document.querySelector('meta[name="robots"]')?.content || ""
    }));

    if (privateMetrics.cards < 1) fail("Navegador movil: el catalogo con precios no renderiza productos");
    if (!privateMetrics.hasPrices) fail("Navegador movil: el link con precios no muestra precios");
    if (privateMetrics.broken.length) fail(`Navegador movil con precios: imagenes rotas (${privateMetrics.broken.slice(0, 5).join(", ")})`);
    if (privateMetrics.scrollWidth > privateMetrics.innerWidth + 1) fail(`Navegador movil con precios: hay scroll horizontal (${privateMetrics.scrollWidth}/${privateMetrics.innerWidth})`);
    if (!/noindex/i.test(privateMetrics.robots)) fail("Navegador movil: el enlace privado con precios debe permanecer fuera de Google");

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
