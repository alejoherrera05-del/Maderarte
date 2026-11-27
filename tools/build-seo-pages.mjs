import fs from "node:fs/promises";
import CatalogOrder from "../assets/catalog-order.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(toolsDir, "..");
const baseUrl = "https://maderartepopayan.com";

function withTrailingSlash(value) {
  if (!value || value === "/") return "/";
  return `/${String(value).replace(/^\/+|\/+$/g, "")}/`;
}

function publicUrl(value) {
  return `${baseUrl}${withTrailingSlash(value)}`;
}
const source = (await fs.readFile(path.join(root, "index.html"), "utf8"))
  .replace(/^\uFEFF/, "")
  .replace(/\r\n?/g, "\n");
const products = CatalogOrder.sortProducts(JSON.parse(await fs.readFile(path.join(root, "data", "productos-publicos.json"), "utf8")));
const today = new Date().toISOString().slice(0, 10);

const categories = {
  salas: {
    path: "salas",
    label: "Salas",
    title: "Salas en Popayán | Maderarte",
    heading: "Salas en Popayán, pensadas para vivirlas.",
    description: "Descubre salas, sofás y modulares Maderarte en Popayán. Configura medidas, telas y acabados con asesoría personalizada."
  },
  comedores: {
    path: "comedores",
    label: "Comedores",
    title: "Comedores en Popayán | Maderarte",
    heading: "Comedores en Popayán para encuentros que se quedan.",
    description: "Explora comedores, mesas y sillas Maderarte en Popayán, con materiales y acabados elegidos para tu espacio."
  },
  alcobas: {
    path: "alcobas",
    label: "Alcobas",
    title: "Alcobas en Popayán | Maderarte",
    heading: "Alcobas en Popayán para descansar a tu manera.",
    description: "Conoce alcobas, camas, cabeceros y mesas de noche Maderarte en Popayán, diseñados con asesoría personal."
  },
  sofacamas: {
    path: "sofa-camas",
    label: "Sofá camas",
    title: "Sofá camas en Popayán | Maderarte",
    heading: "Sofá camas en Popayán para espacios que cambian contigo.",
    description: "Descubre sofá camas Maderarte en Popayán: piezas versátiles configurables en medida, tapizado y funcionalidad."
  },
  junior: {
    path: "junior",
    label: "Junior",
    title: "Muebles infantiles en Popayán | Maderarte Junior",
    heading: "Muebles infantiles en Popayán para acompañar cada etapa.",
    description: "Explora cunas convertibles, cama cunas y mobiliario Junior Maderarte en Popayán, con atención personalizada."
  }
};

const pages = [
  {
    output: "catalogo/index.html",
    url: "/catalogo",
    title: "Catálogo de muebles en Popayán | Maderarte",
    description: "Explora el catálogo Maderarte: salas, comedores, alcobas, sofá camas y línea Junior en Popayán, con asesoría personalizada.",
    image: "/catalogo-maderarte-share-v1.png",
    imageAlt: "Catálogo de muebles y decoración Maderarte Popayán",
    pageType: "CollectionPage",
    breadcrumb: [["Inicio", "/"], ["Catálogo", "/catalogo"]],
    keepSections: ["catalogo"],
    bodyRoute: "catalog",
    intro: catalogIntroMarkup()
  },
  {
    output: "colecciones/index.html",
    url: "/colecciones",
    canonical: "/catalogo",
    robots: "noindex, follow",
    title: "Colecciones de muebles | Maderarte Popayán",
    description: "Explora las colecciones de salas, comedores, alcobas, sofá camas y línea Junior de Maderarte Popayán.",
    image: "/catalogo-maderarte-share-v1.png",
    imageAlt: "Colecciones Maderarte Popayán",
    pageType: "CollectionPage",
    breadcrumb: [["Inicio", "/"], ["Catálogo", "/catalogo"]],
    keepSections: ["catalogo"],
    bodyRoute: "catalog",
    intro: catalogIntroMarkup()
  },
  {
    output: "proceso/index.html",
    url: "/proceso",
    title: "Diseño y asesoría de muebles en Popayán | Maderarte",
    description: "Conoce cómo Maderarte acompaña la elección de proporciones, texturas, materiales y acabados para tu hogar en Popayán.",
    image: "/proceso-moodboard.png",
    imageAlt: "Proceso de diseño y selección de materiales Maderarte",
    pageType: "WebPage",
    breadcrumb: [["Inicio", "/"], ["Proceso", "/proceso"]],
    keepSections: ["proceso"],
    bodyRoute: "content",
    routeLead: {
      kicker: "Asesoría personalizada",
      heading: "Diseño y asesoría de muebles en Popayán",
      description: "Te acompañamos a elegir proporciones, telas, maderas y acabados para crear muebles que funcionen en tu espacio."
    }
  },
  {
    output: "historia/index.html",
    url: "/historia",
    title: "Historia de Maderarte | Más de 20 años en Popayán",
    description: "Conoce la evolución de Maderarte: más de 20 años acompañando hogares, dos sedes en Popayán y fabricación propia.",
    image: "/images/history/maderarte-hoy.webp",
    imageAlt: "Showroom actual de Maderarte en Popayán",
    pageType: "AboutPage",
    breadcrumb: [["Inicio", "/"], ["Historia", "/historia"]],
    keepSections: ["historia"],
    bodyRoute: "content",
    routeLead: {
      kicker: "Nuestra historia",
      heading: "Maderarte: más de 20 años amoblando hogares en Popayán",
      description: "Conoce cómo una pequeña exhibición se convirtió en dos showrooms de muebles y decoración en Popayán."
    }
  },
  {
    output: "contacto/index.html",
    url: "/contacto",
    title: "Contacto y showrooms Maderarte Popayán",
    description: "Visita las sedes Maderarte en Popayán o conversa con un asesor para elegir muebles, medidas, telas y acabados.",
    image: "/Portada.png",
    imageAlt: "Maderarte muebles y decoración en Popayán",
    pageType: "ContactPage",
    breadcrumb: [["Inicio", "/"], ["Contacto", "/contacto"]],
    keepSections: ["contacto"],
    bodyRoute: "content",
    routeLead: {
      kicker: "Dos sedes en Popayán",
      heading: "Visita Maderarte en Popayán",
      description: "Encuentra muebles, decoración y asesoría personalizada en nuestra sede principal y en Terraplaza."
    }
  },
  {
    output: "inicio/index.html",
    url: "/inicio",
    canonical: "/",
    robots: "noindex, follow",
    title: "Maderarte Popayán | Muebles & decoración",
    description: "Muebles y decoración en Popayán con más de 20 años de experiencia. Salas, comedores, alcobas, sofá camas y línea Junior.",
    image: "/Portada.png",
    imageAlt: "Ambiente de sala diseñado por Maderarte en Popayán",
    pageType: "WebPage",
    breadcrumb: [["Inicio", "/"]]
  },
  {
    output: "404.html",
    url: "/404",
    canonical: "/",
    robots: "noindex, follow",
    title: "Página no encontrada | Maderarte",
    description: "La página solicitada no está disponible. Regresa al catálogo de Maderarte Popayán.",
    image: "/Portada.png",
    imageAlt: "Maderarte Popayán",
    pageType: "WebPage",
    breadcrumb: [["Inicio", "/"]]
  }
];

function slugify(value) {
  return String(value || "pieza")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeCategory(category) {
  return category === "sofa-camas" ? "sofacamas" : category;
}

function productPath(product) {
  return `/catalogo/producto/${slugify(product.nombre)}-${product.id}/`;
}

function limitDescription(value, maxLength = 165) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  const shortened = normalized.slice(0, maxLength - 1).replace(/\s+\S*$/, "").replace(/[.,;:!?-]+$/, "");
  return `${shortened}.`;
}

function productSeoDescription(product, category) {
  const detail = String(product.descripcion || `Pieza de ${category?.label || "mobiliario"} configurable`)
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!?]+$/, "");
  return limitDescription(
    `${product.nombre}: ${detail}. Conoce sus fotos y solicita asesoría personalizada con Maderarte en Popayán.`
  );
}

function absolute(value) {
  if (!value) return `${baseUrl}/Portada.png`;
  if (/^https?:\/\//i.test(value)) return value;
  return `${baseUrl}${value.startsWith("/") ? "" : "/"}${value}`;
}

// Read the real image headers: route pages must not inherit the home cover's size.
const imageInfoCache = new Map();
async function imageInfo(value) {
  const url = new URL(value, baseUrl);
  if (url.origin !== baseUrl) return null;
  if (imageInfoCache.has(url.pathname)) return imageInfoCache.get(url.pathname);
  const file = path.resolve(root, `.${decodeURIComponent(url.pathname)}`);
  if (!file.startsWith(`${root}${path.sep}`)) throw new Error(`Imagen fuera del sitio: ${value}`);
  const bytes = await fs.readFile(file);
  let result = null;
  if (bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    result = { type: "image/png", width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  } else if (bytes.length >= 4 && bytes.readUInt16BE(0) === 0xffd8) {
    for (let offset = 2; offset + 3 < bytes.length;) {
      if (bytes[offset++] !== 0xff) break;
      while (offset < bytes.length && bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++];
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > bytes.length) break;
      const length = bytes.readUInt16BE(offset);
      if (length < 2 || offset + length > bytes.length) break;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker) && length >= 7) {
        result = { type: "image/jpeg", width: bytes.readUInt16BE(offset + 5), height: bytes.readUInt16BE(offset + 3) };
        break;
      }
      offset += length;
    }
  } else if (bytes.length >= 30 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") {
    const chunk = bytes.toString("ascii", 12, 16);
    if (chunk === "VP8X") result = { type: "image/webp", width: 1 + bytes.readUIntLE(24, 3), height: 1 + bytes.readUIntLE(27, 3) };
    if (chunk === "VP8 " && bytes.toString("hex", 23, 26) === "9d012a") result = { type: "image/webp", width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
    if (chunk === "VP8L" && bytes[20] === 0x2f) result = { type: "image/webp", width: 1 + (((bytes[22] & 0x3f) << 8) | bytes[21]), height: 1 + (((bytes[24] & 0x0f) << 10) | (bytes[23] << 2) | (bytes[22] >> 6)) };
  }
  imageInfoCache.set(url.pathname, result);
  return result;
}

function xml(value) {
  return String(value).replace(/[<>&'"]/g, (char) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;"
  })[char]);
}

function htmlText(value) {
  return String(value ?? "").replace(/[<>&'\"]/g, (char) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&#39;", '"': "&quot;"
  })[char]);
}

function replaceTitle(html, value) {
  return html.replace(/<title>[\s\S]*?<\/title>/i, () => `<title>${htmlText(value)}</title>`);
}

function replaceMeta(html, selector, value, attribute = "name") {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<meta\\s+${attribute}="${escaped}"\\s+content="[^"]*"\\s*\\/?>`, "i");
  const tag = `<meta ${attribute}="${selector}" content="${htmlText(value)}">`;
  if (!pattern.test(html) && attribute === "property" && selector.startsWith("og:image:")) {
    // Keep image details beside og:image, before the large inline stylesheet.
    return html.replace(/<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i, anchor => `${anchor}\n${tag}`);
  }
  return pattern.test(html) ? html.replace(pattern, () => tag) : html.replace("</head>", () => `${tag}\n</head>`);
}

function replaceLink(html, rel, value) {
  const pattern = new RegExp(`<link\\s+rel="${rel}"[^>]*>`, "i");
  const tag = `<link rel="${rel}" href="${value}">`;
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace("</head>", `${tag}\n</head>`);
}

function breadcrumbSchema(items) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map(([name, url], index) => ({
      "@type": "ListItem",
      position: index + 1,
      name,
      item: publicUrl(url)
    }))
  };
}

function routeSchema(config) {
  const canonical = withTrailingSlash(config.canonical || config.url);
  const graph = [
    {
      "@type": config.pageType || "WebPage",
      "@id": `${baseUrl}${canonical}#page`,
      url: `${baseUrl}${canonical}`,
      name: config.title,
      description: config.description,
      inLanguage: "es-CO",
      isPartOf: { "@id": `${baseUrl}/#website` },
      about: { "@id": `${baseUrl}/#principal` }
    },
    breadcrumbSchema(config.breadcrumb || [["Inicio", "/"]])
  ];
  if (config.items?.length) {
    graph[0].mainEntity = {
      "@type": "ItemList",
      numberOfItems: config.items.length,
      itemListElement: config.items.map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${baseUrl}${productPath(product)}`
      }))
    };
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

function productSchema(product) {
  const category = categories[normalizeCategory(product.categoria)];
  const url = productPath(product);
  const images = (product.imagenes || []).map(absolute);
  const description = productSeoDescription(product, category);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": `${baseUrl}${url}#product`,
        url: `${baseUrl}${url}`,
        name: product.nombre,
        sku: String(product.id),
        description,
        image: images,
        category: category?.label || product.categoria,
        brand: { "@type": "Brand", name: "Maderarte" },
        manufacturer: { "@id": `${baseUrl}/#principal` },
        areaServed: { "@type": "City", name: "Popayán" }
      },
      {
        "@type": "WebPage",
        "@id": `${baseUrl}${url}#page`,
        url: `${baseUrl}${url}`,
        name: `${product.nombre} | Maderarte Popayán`,
        description,
        inLanguage: "es-CO",
        mainEntity: { "@id": `${baseUrl}${url}#product` },
        isPartOf: { "@id": `${baseUrl}/#website` }
      },
      breadcrumbSchema([
        ["Inicio", "/"],
        ["Catálogo", "/catalogo"],
        [category?.label || "Colección", `/catalogo/${category?.path || ""}`],
        [product.nombre, url]
      ])
    ]
  };
}

function introMarkup(category) {
  return `<div id="catalog-route-intro" class="catalog-route-intro">
        <nav class="catalog-breadcrumb" aria-label="Migas de pan">
          <a href="/catalogo/">Catálogo</a><span aria-hidden="true">/</span><span>${category.label}</span>
        </nav>
        <div class="catalog-route-copy">
          <h1>${category.heading}</h1>
          <p>${category.description}</p>
        </div>
      </div>`;
}

function catalogIntroMarkup() {
  return `<div id="catalog-route-intro" class="catalog-route-intro">
        <nav class="catalog-breadcrumb" aria-label="Migas de pan">
          <a href="/">Inicio</a><span aria-hidden="true">/</span><span>Catálogo</span>
        </nav>
        <div class="catalog-route-copy">
          <h1>Catálogo de muebles en Popayán</h1>
          <p>Explora salas, comedores, alcobas, sofá camas y muebles infantiles. Cada pieza se configura contigo en medidas, telas y acabados.</p>
        </div>
      </div>`;
}

function productIntroMarkup(product, category) {
  const materialLabels = { estructura: "Estructura", tela: "Tela", espuma: "Espuma" };
  const facts = Object.entries(product.materialesData || {})
    .filter(([, value]) => String(value || "").trim())
    .map(([key, value]) => `<li>${htmlText(materialLabels[key] || key)}: ${htmlText(value)}</li>`)
    .join("");
  const factsMarkup = facts
    ? `\n            <ul class="seo-product-facts" aria-label="Materiales principales">${facts}</ul>`
    : "";
  const description = String(product.descripcion || `Pieza de ${category.label} configurable`)
    .replace(/\s+/g, " ")
    .trim();
  return `<div id="catalog-route-intro" class="catalog-route-intro seo-product-intro">
        <nav class="catalog-breadcrumb" aria-label="Migas de pan">
          <a href="/">Inicio</a><span aria-hidden="true">/</span>
          <a href="/catalogo/">Catálogo</a><span aria-hidden="true">/</span>
          <a href="/catalogo/${category.path}/">${htmlText(category.label)}</a><span aria-hidden="true">/</span>
          <span>${htmlText(product.nombre)}</span>
        </nav>
        <div class="catalog-route-copy">
          <h1>${htmlText(product.nombre)} en Popayán</h1>
          <div class="seo-product-summary">
            <p>${htmlText(description)} Solicita asesoría para elegir medidas, tapizado y acabados en Maderarte Popayán.</p>${factsMarkup}
          </div>
        </div>
      </div>`;
}

function routeLeadMarkup(lead) {
  return `<section class="catalog-route-intro route-page-intro" aria-labelledby="route-page-title">
      <div class="catalog-route-copy">
        <div>
          <span class="section-kicker">${htmlText(lead.kicker)}</span>
          <h1 id="route-page-title">${htmlText(lead.heading)}</h1>
        </div>
        <p>${htmlText(lead.description)}</p>
      </div>
    </section>`;
}

function pruneSections(html, keepSections) {
  const sectionIds = ["inicio", "proceso", "colecciones", "catalogo", "historia", "garantia", "contacto"];
  const keep = new Set(keepSections || []);
  let pruned = html;
  for (const id of sectionIds) {
    if (keep.has(id)) continue;
    const pattern = new RegExp(`\\s*<section\\b[^>]*\\bid="${id}"[^>]*>[\\s\\S]*?<\\/section>\\s*`, "i");
    pruned = pruned.replace(pattern, "\n");
  }
  return pruned;
}

async function render(config) {
  const canonicalPath = withTrailingSlash(config.canonical || config.url);
  const canonical = `${baseUrl}${canonicalPath}`;
  const image = absolute(config.image);
  const info = await imageInfo(image);
  let html = source;
  html = replaceTitle(html, config.title);
  html = replaceMeta(html, "description", config.description);
  html = replaceMeta(html, "robots", config.robots || "index, follow, max-image-preview:large");
  html = replaceLink(html, "canonical", canonical);
  html = html.replace(/<link rel="alternate" hreflang="es-CO"[^>]*>/i, `<link rel="alternate" hreflang="es-CO" href="${canonical}">`);
  html = html.replace(/<link rel="alternate" hreflang="x-default"[^>]*>/i, `<link rel="alternate" hreflang="x-default" href="${canonical}">`);
  html = replaceMeta(html, "og:title", config.title, "property");
  html = replaceMeta(html, "og:description", config.description, "property");
  html = replaceMeta(html, "og:url", canonical, "property");
  html = replaceMeta(html, "og:image", image, "property");
  html = replaceMeta(html, "og:image:secure_url", image, "property");
  html = html.replace(/<meta\s+property="og:image:(?:width|height|type)"[^>]*>\s*/gi, "");
  if (info) {
    html = replaceMeta(html, "og:image:type", info.type, "property");
    html = replaceMeta(html, "og:image:width", info.width, "property");
    html = replaceMeta(html, "og:image:height", info.height, "property");
  }
  html = replaceMeta(html, "og:image:alt", config.imageAlt || config.title, "property");
  html = replaceMeta(html, "twitter:title", config.title);
  html = replaceMeta(html, "twitter:description", config.description);
  html = replaceMeta(html, "twitter:image", image);
  html = replaceMeta(html, "twitter:image:alt", config.imageAlt || config.title);
  const schema = JSON.stringify(config.schema || routeSchema(config)).replace(/</g, "\\u003c");
  html = html.replace("<!-- SEO_ROUTE_SCHEMA -->", `<script type="application/ld+json" id="seo-route-schema">${schema}</script>`);
  if (config.intro) {
    html = html.replace('<div id="catalog-route-intro" class="catalog-route-intro" hidden></div>', config.intro);
  }
  if (config.routeLead) {
    html = html.replace("<main>", `<main>\n    ${routeLeadMarkup(config.routeLead)}`);
  }
  if (config.keepSections) {
    html = pruneSections(html, config.keepSections);
  }
  const removesHero = config.keepSections && !config.keepSections.includes("inicio");
  if (config.bodyRoute || removesHero) {
    html = html.replace(/<body\b([^>]*)>/i, (_, attributes) => {
      const classPattern = /(\s)class\s*=\s*(["'])(.*?)\2/is;
      const classMatch = attributes.match(classPattern);
      const classes = new Set((classMatch?.[3] || "").split(/\s+/).filter(Boolean));
      if (removesHero) classes.delete("black-friday-mode");
      if (config.bodyRoute) {
        classes.add(config.bodyRoute === "product" ? "seo-product-route" : "seo-content-route");
      }
      const classAttribute = `class="${htmlText([...classes].join(" "))}"`;
      let updated = classMatch
        ? attributes.replace(classPattern, (_, whitespace) => `${whitespace}${classAttribute}`)
        : `${attributes} ${classAttribute}`;
      if (config.bodyRoute) {
        updated = updated.replace(/\s+data-seo-route\s*=\s*(["'])(.*?)\1/i, "");
        updated += ` data-seo-route="${htmlText(config.bodyRoute)}"`;
      }
      return `<body${updated}>`;
    });
  }
  return html;
}

async function write(relativePath, content) {
  const target = path.join(root, relativePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content, "utf8");
}

for (const config of pages) {
  await write(config.output, await render(config));
}

for (const [key, category] of Object.entries(categories)) {
  const items = products.filter((product) => normalizeCategory(product.categoria) === key);
  const config = {
    output: `catalogo/${category.path}/index.html`,
    url: `/catalogo/${category.path}`,
    title: category.title,
    description: category.description,
    image: items[0]?.imagenes?.[0] || "/catalogo-maderarte-share-v1.png",
    imageAlt: `${category.label} Maderarte en Popayán`,
    pageType: "CollectionPage",
    breadcrumb: [["Inicio", "/"], ["Catálogo", "/catalogo"], [category.label, `/catalogo/${category.path}`]],
    items,
    intro: introMarkup(category),
    keepSections: ["catalogo"],
    bodyRoute: "catalog"
  };
  await write(config.output, await render(config));
}

const productRoot = path.join(root, "catalogo", "producto");
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
  const category = categories[normalizeCategory(product.categoria)] || categories.salas;
  const url = productPath(product);
  const description = productSeoDescription(product, category);
  const config = {
    output: `${url.replace(/^\/+|\/+$/g, "")}/index.html`,
    url,
    title: `${product.nombre} | Maderarte Popayán`,
    description,
    image: product.imagenes?.[0] || "/catalogo-maderarte-share-v1.png",
    imageAlt: `${product.nombre} de Maderarte Popayán`,
    schema: productSchema(product),
    intro: productIntroMarkup(product, category),
    keepSections: ["catalogo"],
    bodyRoute: "product"
  };
  await write(config.output, await render(config));
}

const sitemapEntries = [
  { url: "/", priority: "1.0" },
  { url: "/catalogo", priority: "0.9" },
  { url: "/proceso", priority: "0.7" },
  { url: "/historia", priority: "0.7" },
  { url: "/contacto", priority: "0.8" },
  ...Object.values(categories).map((category) => ({ url: `/catalogo/${category.path}`, priority: "0.8" })),
  ...products.map((product) => ({
    url: productPath(product),
    priority: "0.7",
    image: product.imagenes?.[0],
    imageTitle: product.nombre
  }))
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${sitemapEntries.map((entry) => `  <url>
    <loc>${xml(publicUrl(entry.url))}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${entry.url === "/" || entry.url === "/catalogo" ? "weekly" : "monthly"}</changefreq>
    <priority>${entry.priority}</priority>${entry.image ? `
    <image:image>
      <image:loc>${xml(absolute(entry.image))}</image:loc>
      <image:title>${xml(entry.imageTitle)}</image:title>
    </image:image>` : ""}
  </url>`).join("\n")}
</urlset>
`;
await write("sitemap.xml", sitemap);

const llms = `# Maderarte Popayán

Maderarte es una tienda de muebles y decoración con más de 20 años acompañando hogares en Popayán, Cauca, Colombia.

Sitio oficial: ${baseUrl}/
Catálogo público: ${baseUrl}/catalogo/
Contacto y sedes: ${baseUrl}/contacto/

## Qué ofrece

- Salas, sofás y modulares
- Comedores, mesas y sillas
- Alcobas, camas, cabeceros y mesas de noche
- Sofá camas
- Línea Junior: cama cunas y cunas convertibles
- Asesoría personalizada en medidas, telas, materiales y acabados

## Presencia local

- Sede principal: Transversal 9 # 6N-26, Popayán
- Sede Terraplaza: Centro Comercial Terraplaza, local 113, Popayán
- WhatsApp y teléfono: +57 311 747 6465

La información vigente sobre productos, sedes y atención se encuentra en el sitio oficial. Los precios no se publican en el catálogo abierto porque cada configuración se revisa con asesoría.
`;
await write("llms.txt", llms);

console.log(`SEO generado: ${Object.keys(categories).length} categorías, ${products.length} productos y sitemap.xml.`);
