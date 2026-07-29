import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(toolsDir, "..");
const baseUrl = "https://maderartepopayan.com";
const source = (await fs.readFile(path.join(root, "index.html"), "utf8"))
  .replace(/^\uFEFF/, "")
  .replace(/\r\n?/g, "\n");
const products = JSON.parse(await fs.readFile(path.join(root, "data", "productos-publicos.json"), "utf8"));
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
    breadcrumb: [["Inicio", "/"], ["Catálogo", "/catalogo"]]
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
    breadcrumb: [["Inicio", "/"], ["Catálogo", "/catalogo"]]
  },
  {
    output: "proceso/index.html",
    url: "/proceso",
    title: "Diseño y asesoría de muebles en Popayán | Maderarte",
    description: "Conoce cómo Maderarte acompaña la elección de proporciones, texturas, materiales y acabados para tu hogar en Popayán.",
    image: "/proceso-moodboard.png",
    imageAlt: "Proceso de diseño y selección de materiales Maderarte",
    pageType: "WebPage",
    breadcrumb: [["Inicio", "/"], ["Proceso", "/proceso"]]
  },
  {
    output: "historia/index.html",
    url: "/historia",
    title: "Historia de Maderarte | Más de 20 años en Popayán",
    description: "Conoce la evolución de Maderarte: más de 20 años acompañando hogares, dos sedes en Popayán y fabricación propia.",
    image: "/historia-actual.png",
    imageAlt: "Showroom actual de Maderarte en Popayán",
    pageType: "AboutPage",
    breadcrumb: [["Inicio", "/"], ["Historia", "/historia"]]
  },
  {
    output: "contacto/index.html",
    url: "/contacto",
    title: "Contacto y showrooms Maderarte Popayán",
    description: "Visita las sedes Maderarte en Popayán o conversa con un asesor para elegir muebles, medidas, telas y acabados.",
    image: "/Portada.png",
    imageAlt: "Maderarte muebles y decoración en Popayán",
    pageType: "ContactPage",
    breadcrumb: [["Inicio", "/"], ["Contacto", "/contacto"]]
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
  return `/catalogo/producto/${slugify(product.nombre)}-${product.id}`;
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

function xml(value) {
  return String(value).replace(/[<>&'"]/g, (char) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;"
  })[char]);
}

function replaceTitle(html, value) {
  return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${value}</title>`);
}

function replaceMeta(html, selector, value, attribute = "name") {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<meta\\s+${attribute}="${escaped}"\\s+content="[^"]*"\\s*\\/?>`, "i");
  const tag = `<meta ${attribute}="${selector}" content="${value}">`;
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace("</head>", `${tag}\n</head>`);
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
      item: `${baseUrl}${url === "/" ? "/" : url}`
    }))
  };
}

function routeSchema(config) {
  const canonical = config.canonical || config.url;
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
          <a href="/catalogo">Catálogo</a><span aria-hidden="true">/</span><span>${category.label}</span>
        </nav>
        <div class="catalog-route-copy">
          <h1>${category.heading}</h1>
          <p>${category.description}</p>
        </div>
      </div>`;
}

function render(config) {
  const canonicalPath = config.canonical || config.url;
  const canonical = `${baseUrl}${canonicalPath === "/" ? "/" : canonicalPath}`;
  const image = absolute(config.image);
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
  return html;
}

async function write(relativePath, content) {
  const target = path.join(root, relativePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content, "utf8");
}

for (const config of pages) {
  await write(config.output, render(config));
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
    intro: introMarkup(category)
  };
  await write(config.output, render(config));
}

for (const product of products) {
  const category = categories[normalizeCategory(product.categoria)] || categories.salas;
  const url = productPath(product);
  const description = productSeoDescription(product, category);
  const config = {
    output: `${url.slice(1)}/index.html`,
    url,
    title: `${product.nombre} | Maderarte Popayán`,
    description,
    image: product.imagenes?.[0] || "/catalogo-maderarte-share-v1.png",
    imageAlt: `${product.nombre} de Maderarte Popayán`,
    schema: productSchema(product)
  };
  await write(config.output, render(config));
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
    <loc>${xml(`${baseUrl}${entry.url === "/" ? "/" : entry.url}`)}</loc>
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
Catálogo público: ${baseUrl}/catalogo
Contacto y sedes: ${baseUrl}/contacto

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
