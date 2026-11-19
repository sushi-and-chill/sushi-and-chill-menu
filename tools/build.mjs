/*
 * Збірка QR-menu: prerender сторінок меню у статичний HTML.
 *
 *   npm install
 *   npm run build      (спершу робить мініатюри фото, потім збирає сторінки)
 *
 * Що робить:
 *  1. Бере tools/template.html + тексти з public/assets/js/i18n.js.
 *  2. Запускає справжній public/assets/js/app.js у jsdom з public/data/menu.json
 *     і public/data/category-notes.json, тож готовий HTML збігається з тим,
 *     що малює браузер.
 *  3. Записує public/menu/index.html (PL), public/menu/ua/index.html (UK),
 *     public/menu/en/index.html (EN), sitemap.xml і robots.txt.
 *  4. Ставить у посиланнях на css/js версію за хешем вмісту.
 *
 * Налаштування (домен, телефон, графік роботи, реквізити, індексація):
 * tools/site.config.json.
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
const notesFile = join(publicDir, "data/category-notes.json");
const notesText = existsSync(notesFile) ? readFileSync(notesFile, "utf8") : "{}";
const i18nSource = readFileSync(join(publicDir, "assets/js/i18n.js"), "utf8");
const appSource = readFileSync(join(publicDir, "assets/js/app.js"), "utf8");
const cssSource = readFileSync(join(publicDir, "assets/css/style.css"), "utf8");

const LANGS = ["pl", "uk", "en"];
const outFile = { pl: "menu/index.html", uk: "menu/ua/index.html", en: "menu/en/index.html" };
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

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
const mapsUrl = config.mapsUrl;

/* ---------- Іконки (контурні, 24×24, колір береться з тексту кнопки) ---------- */

const icon = (paths) =>
  `<svg class="icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">${paths}</svg>`;

const ICONS = {
  phone: icon(
    '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>'
  ),
  instagram: icon(
    '<rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><path d="M17.5 6.5h.01"/>'
  ),
  facebook: icon('<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>'),
  maps: icon('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>'),
  close: icon('<path d="M18 6 6 18M6 6l12 12"/>'),
};

/* ---------- Розміри фото (для width/height і srcset, без залежностей) ---------- */

function webpSize(file) {
  const b = readFileSync(file);

  if (b.length < 30 || b.toString("ascii", 0, 4) !== "RIFF" || b.toString("ascii", 8, 12) !== "WEBP") {
    return null;
  }

  const type = b.toString("ascii", 12, 16);

  if (type === "VP8X") {
    return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
  }

  if (type === "VP8 ") {
    return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
  }

  if (type === "VP8L") {
    const bits = b.readUInt32LE(21);

    return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 };
  }

  return null;
}

const photoCache = new Map();

/* src виду "/assets/images/menu/101.webp" -> { w, h, small?: { src, w } } */
function photoMeta(src) {
  if (photoCache.has(src)) return photoCache.get(src);

  let meta = null;
  const clean = src.split("?")[0];
  const file = join(publicDir, clean);

  if (clean.startsWith("/") && /\.webp$/i.test(clean) && existsSync(file)) {
    const size = webpSize(file);

    if (size) {
      meta = { w: size.w, h: size.h };

      const smallSrc = clean.replace("/assets/images/menu/", "/assets/images/menu/sm/");
      const smallFile = join(publicDir, smallSrc);

      if (smallSrc !== clean && existsSync(smallFile)) {
        const small = webpSize(smallFile);

        if (small) meta.small = { src: smallSrc, w: small.w };
      }
    }
  }

  photoCache.set(src, meta);

  return meta;
}

/* ---------- Графік роботи ---------- */

function formatDays(days, t) {
  const idx = days
    .map((day) => DAY_NAMES.indexOf(day))
    .filter((i) => i >= 0)
    .sort((a, b) => a - b);

  if (idx.length === 7) return t.daily;

  const consecutive = idx.every((value, i) => i === 0 || value === idx[i - 1] + 1);

  if (idx.length > 2 && consecutive) {
    return `${t.days[idx[0]]} – ${t.days[idx[idx.length - 1]]}`;
  }

  return idx.map((i) => t.days[i]).join(", ");
}

function hoursFooter(lang) {
  const t = I18N[lang];

  if (!config.openingHours || !config.openingHours.length) return "";

  const rows = config.openingHours
    .map(
      (h) =>
        `        <li><span class="hours-days">${esc(formatDays(h.days, t))}</span> <span class="hours-time">${esc(h.opens)}–${esc(h.closes)}</span></li>`
    )
    .join("\n");

  return `    <section class="footer-hours" aria-labelledby="footer-hours-title">
      <h2 class="footer-title" id="footer-hours-title">${esc(t.hoursTitle)}</h2>
      <ul class="hours-list">
${rows}
      </ul>
    </section>`;
}

/* ---------- Структуровані дані ---------- */

function jsonLd(lang) {
  const t = I18N[lang];
  const data = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": origin + "/#restaurant",
    name: config.name,
    url: url(lang),
    image: [origin + "/assets/images/og-image.png"],
    logo: origin + "/assets/images/logo.png",
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
    menu: url(lang),
    sameAs: [config.instagram, config.facebook].filter(Boolean).map((u) => new URL(u).href),
  };

  if (config.postalCode) data.address.postalCode = config.postalCode;
  if (config.priceRange) data.priceRange = config.priceRange;
  if (config.legal && config.legal.companyName) data.legalName = config.legal.companyName;
  if (config.legal && config.legal.email) data.email = config.legal.email;
  if (config.geo && config.geo.latitude && config.geo.longitude) {
    data.geo = {
      "@type": "GeoCoordinates",
      latitude: config.geo.latitude,
      longitude: config.geo.longitude,
    };
  }
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
  const { companyName, nip, address, email, krs, registryCourt, shareCapitalPLN } = config.legal;
  const t = I18N[lang];
  const parts = [];

  if (companyName) parts.push(esc(companyName));
  if (address) parts.push(esc(address));
  if (nip) parts.push(`${esc(t.nip)} ${esc(nip)}`);
  if (email) parts.push(`<a href="mailto:${esc(email)}">${esc(email)}</a>`);
  if (registryCourt) parts.push(esc(registryCourt));
  if (krs) parts.push(`KRS ${esc(krs)}`);
  if (shareCapitalPLN) parts.push(`${esc(t.shareCapital)} ${esc(shareCapitalPLN)} PLN`);

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
      ? "index, follow, max-image-preview:large, max-snippet:-1"
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
      ? `        <a class="social-link" href="${esc(new URL(config.facebook).href)}" target="_blank" rel="noopener noreferrer">${ICONS.facebook}<span class="btn-label">Facebook</span></a>`
      : "",
    MAPS_URL: esc(mapsUrl),
    LANG_LINKS: langLinks(),
    HOURS_FOOTER: hoursFooter(lang),
    LEGAL_FOOTER: legalFooter(lang),
    ICON_PHONE: ICONS.phone,
    ICON_INSTAGRAM: ICONS.instagram,
    ICON_MAPS: ICONS.maps,
    ICON_CLOSE: ICONS.close,
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

  window.fetch = async (input) => {
    const body = String(input).includes("category-notes") ? notesText : menuText;

    return { ok: true, status: 200, text: async () => body };
  };
  window.QR_MENU_BUILD = {
    photoExists: (src) => src.startsWith("/") && existsSync(join(publicDir, src.split("?")[0])),
    photoMeta,
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

/*
 * Дата lastmod для sitemap змінюється лише тоді, коли змінився вміст сайту
 * (меню, коментарі, тексти, стилі, скрипти, налаштування) — так пошуковики
 * довіряють цій даті. Стан зберігається в tools/build-state.json.
 */
const statePath = join(root, "tools/build-state.json");
const stateHash = hash(
  [menuText, notesText, i18nSource, appSource, cssSource, template, JSON.stringify(config)].join("\u0000")
);
let state = {};

try {
  state = JSON.parse(readFileSync(statePath, "utf8"));
} catch (error) {
  state = {};
}

if (state.hash !== stateHash) {
  state = { hash: stateHash, lastmod: new Date().toISOString().slice(0, 10) };
  writeFileSync(statePath, JSON.stringify(state, null, 2) + "\n");
}

const lastmod = state.lastmod;

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
    <lastmod>${lastmod}</lastmod>
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

// 404.html — статична сторінка; оновлюємо версію CSS, щоб не брати застарілий кеш.
const notFoundFile = join(publicDir, "404.html");

if (existsSync(notFoundFile)) {
  const before = readFileSync(notFoundFile, "utf8");
  const after = before.replace(
    /style\.css(\?v=[a-f0-9]+)?"/,
    `style.css?v=${hash(cssSource)}"`
  );

  if (after !== before) writeFileSync(notFoundFile, after);
}

console.log(
  `✓ sitemap.xml, robots.txt  (indexing: ${config.allowIndexing ? "ON" : "OFF — noindex"}, lastmod ${lastmod})`
);
