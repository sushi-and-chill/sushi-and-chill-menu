/*
 * Збірка QR-menu: prerender сторінок меню у статичний HTML.
 *
 *   npm install
 *   npm run build
 *
 * Що робить:
 *  1. Бере tools/template.html + тексти з public/assets/js/i18n.js.
 *  2. Запускає справжній public/assets/js/app.js у jsdom з public/data/menu.json,
 *     тож готовий HTML збігається з тим, що малює браузер.
 *  3. Записує public/menu/index.html (PL), public/menu/ua/index.html (UK),
 *     public/menu/en/index.html (EN), sitemap.xml і robots.txt.
 *  4. Ставить у посиланнях на css/js версію за хешем вмісту.
 *
 * Налаштування (домен, телефон, реквізити, індексація): tools/site.config.json.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(root, "public");
const config = JSON.parse(readFileSync(join(root, "tools/site.config.json"), "utf8"));
const template = readFileSync(join(root, "tools/template.html"), "utf8");
const menuText = readFileSync(join(publicDir, "data/menu.json"), "utf8");
const i18nSource = readFileSync(join(publicDir, "assets/js/i18n.js"), "utf8");
const appSource = readFileSync(join(publicDir, "assets/js/app.js"), "utf8");
const cssSource = readFileSync(join(publicDir, "assets/css/style.css"), "utf8");

const LANGS = ["pl", "uk", "en"];
const outFile = { pl: "menu/index.html", uk: "menu/ua/index.html", en: "menu/en/index.html" };

const hash = (text) => createHash("sha1").update(text).digest("hex").slice(0, 10);
const esc = (text) =>
  String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Тексти для <head> читаємо з i18n.js.
const sandbox = {};
new Function("window", i18nSource)(sandbox);
const I18N = sandbox.QR_I18N;

const origin = config.origin.replace(/\/$/, "");
const url = (lang) => origin + I18N[lang].path;
const mapsUrl =
  "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(config.mapsQuery);

function jsonLd(lang) {
  const t = I18N[lang];
  const data = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": origin + "/menu/#restaurant",
    name: config.name,
    url: url(lang),
    image: origin + "/assets/images/og-image.png",
    telephone: config.phone,
    slogan: t.tagline,
    servesCuisine: ["Sushi", "Japanese"],
    currenciesAccepted: "PLN",
    address: {
      "@type": "PostalAddress",
      streetAddress: config.street,
      addressLocality: config.city,
      addressCountry: config.country,
    },
    hasMap: mapsUrl,
    sameAs: [config.instagram, config.facebook].filter(Boolean).map((u) => new URL(u).href),
  };

  if (config.postalCode) data.address.postalCode = config.postalCode;
  if (config.priceRange) data.priceRange = config.priceRange;
  if (config.openingHours.length) {
    data.openingHoursSpecification = config.openingHours.map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: h.days,
      opens: h.opens,
      closes: h.closes,
    }));
  }

  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function legalFooter(lang) {
  const { companyName, nip, address, email } = config.legal;
  const t = I18N[lang];
  const parts = [];

  if (companyName) parts.push(esc(companyName));
  if (address) parts.push(esc(address));
  if (nip) parts.push(`${esc(t.nip)} ${esc(nip)}`);
  if (email) parts.push(`<a href="mailto:${esc(email)}">${esc(email)}</a>`);

  return parts.length ? `    <p class="legal">${parts.join(" · ")}</p>` : "";
}

function langLinks() {
  return LANGS.map(
    (lang) =>
      `        <a href="${I18N[lang].path}" data-lang="${lang}" hreflang="${lang}" lang="${lang}" title="${esc(I18N[lang].langName)}">${lang === "uk" ? "UA" : lang.toUpperCase()}</a>`
  ).join("\n");
}

function hreflangs() {
  return [
    ...LANGS.map((l) => `  <link rel="alternate" hreflang="${l}" href="${url(l)}">`),
    `  <link rel="alternate" hreflang="x-default" href="${url("pl")}">`,
  ].join("\n");
}

function fillTemplate(lang) {
  const t = I18N[lang];
  const values = {
    LANG: lang,
    TITLE: esc(t.pageTitle),
    DESCRIPTION: esc(t.metaDescription),
    OG_DESCRIPTION: esc(t.ogDescription),
    OG_LOCALE: t.ogLocale,
    OG_ALTERNATES: LANGS.filter((l) => l !== lang)
      .map((l) => `  <meta property="og:locale:alternate" content="${I18N[l].ogLocale}">`)
      .join("\n"),
    ROBOTS: config.allowIndexing
      ? "index, follow, max-image-preview:large"
      : "noindex, nofollow",
    CANONICAL: url(lang),
    HREFLANGS: hreflangs(),
    OG_IMAGE: origin + "/assets/images/og-image.png",
    JSONLD: jsonLd(lang),
    CSS_VERSION: hash(cssSource),
    I18N_VERSION: hash(i18nSource),
    JS_VERSION: hash(appSource),
    BODY_ATTRS: lang === "pl" ? " data-entry" : "",
    HOME_PATH: t.path,
    PHONE: config.phone,
    PHONE_DISPLAY: esc(config.phoneDisplay),
    INSTAGRAM: esc(config.instagram),
    FACEBOOK_LINK: config.facebook
      ? `        <a href="${esc(new URL(config.facebook).href)}" target="_blank" rel="noopener noreferrer">Facebook</a>`
      : "",
    MAPS_URL: esc(mapsUrl),
    LANG_LINKS: langLinks(),
    LEGAL_FOOTER: legalFooter(lang),
  };

  return template.replace(/\{\{([A-Z_]+)\}\}/g, (match, key) => {
    if (!(key in values)) throw new Error(`Unknown placeholder ${match}`);
    return values[key];
  });
}

function applyTranslations(document, lang) {
  const t = I18N[lang];
  const attrs = [
    ["data-i18n", (el, v) => (el.textContent = v)],
    ["data-i18n-label", (el, v) => el.setAttribute("aria-label", v)],
    ["data-i18n-placeholder", (el, v) => el.setAttribute("placeholder", v)],
    ["data-i18n-title", (el, v) => el.setAttribute("title", v)],
  ];

  for (const [attr, apply] of attrs) {
    for (const el of document.querySelectorAll(`[${attr}]`)) {
      const key = el.getAttribute(attr);
      if (!(key in t)) throw new Error(`Missing translation key "${key}" for ${lang}`);
      apply(el, t[key]);
      el.removeAttribute(attr);
    }
  }
}

async function renderPage(lang) {
  const dom = new JSDOM(fillTemplate(lang), {
    url: url(lang),
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  const { window } = dom;

  window.fetch = async () => ({
    ok: true,
    status: 200,
    text: async () => menuText,
  });
  window.QR_MENU_BUILD = {
    photoExists: (src) => src.startsWith("/") && existsSync(join(publicDir, src.split("?")[0])),
  };

  window.eval(i18nSource);
  window.eval(appSource);
  await window.QR_MENU.ready;

  const { document } = window;
  const content = document.querySelector("#menu-content");

  if (!content.querySelector(".category-section")) {
    throw new Error(`Prerender produced no menu sections for "${lang}"`);
  }

  applyTranslations(document, lang);
  content.setAttribute("aria-busy", "false");

  const html = dom.serialize();
  window.close();

  return html;
}

function writeOut(relative, content) {
  const file = join(publicDir, relative);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

const today = new Date().toISOString().slice(0, 10);

for (const lang of LANGS) {
  const html = await renderPage(lang);
  writeOut(outFile[lang], html);
  console.log(`✓ ${outFile[lang]}  (${(html.length / 1024).toFixed(0)} KB)`);
}

const alternates = LANGS.map(
  (l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${url(l)}"/>`
)
  .concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${url("pl")}"/>`)
  .join("\n");

writeOut(
  "sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${LANGS.map(
  (l) => `  <url>
    <loc>${url(l)}</loc>
    <lastmod>${today}</lastmod>
${alternates}
  </url>`
).join("\n")}
</urlset>
`
);

writeOut(
  "robots.txt",
  config.allowIndexing
    ? `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`
    : `# Індексацію вимкнено (tools/site.config.json -> allowIndexing). Сторінки мають noindex.\nUser-agent: *\nAllow: /\n`
);

console.log(
  `✓ sitemap.xml, robots.txt  (indexing: ${config.allowIndexing ? "ON" : "OFF — noindex"})`
);
