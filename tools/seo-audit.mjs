/**
 * SEO audit for generated QR Menu pages.
 *
 * Checks:
 * - robots.txt
 * - sitemap.xml
 * - canonical URLs
 * - hreflang links
 * - title and meta description
 * - meta robots
 * - H1
 * - image ALT attributes
 * - Schema.org JSON-LD
 *
 * Run: npm run seo-audit
 */

import {
  existsSync,
  readFileSync,
} from "node:fs";

import {
  dirname,
  join,
  resolve,
} from "node:path";

import {
  fileURLToPath,
} from "node:url";

import {
  JSDOM,
} from "jsdom";


const root = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);

const publicDir = join(root, "public");

const configPath = join(root, "tools/site.config.json");

const config = JSON.parse(
  readFileSync(configPath, "utf8"),
);

const origin = new URL(config.origin).origin;

const languages = {
  pl: {
    path: "/menu/",
    locale: "pl-PL",
  },
  uk: {
    path: "/menu/ua/",
    locale: "uk-UA",
  },
  en: {
    path: "/menu/en/",
    locale: "en-GB",
  },
};

const errors = [];
const warnings = [];

const error = (message) => errors.push(message);
const warn = (message) => warnings.push(message);

const expectedUrls = Object.fromEntries(
  Object.entries(languages).map(([lang, data]) => [
    lang,
    `${origin}${data.path}`,
  ]),
);

function readPublicFile(relativePath) {
  const file = join(publicDir, relativePath);

  if (!existsSync(file)) {
    error(`Missing generated file: public/${relativePath}`);
    return null;
  }

  return readFileSync(file, "utf8");
}


/* ---------- robots.txt ---------- */

function auditRobots() {
  const content = readPublicFile("robots.txt");

  if (content === null) return;

  const normalized = content.replace(/\r/g, "");

  const defaultAgent = normalized.match(
    /User-agent:\s*\*\s*\n([\s\S]*?)(?=\nUser-agent:|\nSitemap:|$)/i,
  );

  if (!defaultAgent || !/Allow:\s*\/\s*(?:\n|$)/i.test(defaultAgent[1])) {
    error("robots.txt: User-agent * must allow crawling with Allow: /.");
  }

  const openAiAgent = normalized.match(
    /User-agent:\s*OAI-SearchBot\s*\n([\s\S]*?)(?=\nUser-agent:|\nSitemap:|$)/i,
  );

  if (!openAiAgent || !/Allow:\s*\/\s*(?:\n|$)/i.test(openAiAgent[1])) {
    error("robots.txt: OAI-SearchBot must have Allow: /.");
  }

  const gptAgent = normalized.match(
    /User-agent:\s*GPTBot\s*\n([\s\S]*?)(?=\nUser-agent:|\nSitemap:|$)/i,
  );

  if (!gptAgent || !/Disallow:\s*\/\s*(?:\n|$)/i.test(gptAgent[1])) {
    error("robots.txt: GPTBot must have Disallow: /.");
  }

  const sitemapLine = normalized.match(
    /^Sitemap:\s*(\S+)\s*$/im,
  );

  if (config.allowIndexing) {
    const expectedSitemap = `${origin}/sitemap.xml`;

    if (!sitemapLine || sitemapLine[1] !== expectedSitemap) {
      error(`robots.txt: expected Sitemap: ${expectedSitemap}`);
    }
  } else if (sitemapLine) {
    error("robots.txt: Sitemap must not be declared when allowIndexing is false.");
  }
}


/* ---------- sitemap.xml ---------- */

function auditSitemap() {
  const content = readPublicFile("sitemap.xml");

  if (content === null) return;

  if (!content.includes("<urlset")) {
    error("sitemap.xml: missing urlset element.");
    return;
  }

  const urls = [
    ...content.matchAll(/<loc>(.*?)<\/loc>/g),
  ].map((match) => match[1].trim());

  if (urls.length !== 3) {
    error(`sitemap.xml: expected 3 language URLs, found ${urls.length}.`);
  }

  for (const [lang, expectedUrl] of Object.entries(expectedUrls)) {
    if (!urls.includes(expectedUrl)) {
      error(`sitemap.xml: missing ${lang} URL: ${expectedUrl}`);
    }
  }

  for (const url of urls) {
    if (!url.startsWith(`${origin}/`)) {
      error(`sitemap.xml: URL outside canonical origin: ${url}`);
    }
  }

  for (const [lang, expectedUrl] of Object.entries(expectedUrls)) {
    const urlBlock = content.match(
      new RegExp(
        `<url>\\s*<loc>${expectedUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}<\\/loc>([\\s\\S]*?)<\\/url>`,
      ),
    );

    if (!urlBlock) continue;

    for (const [alternateLang, alternateUrl] of Object.entries(expectedUrls)) {
      const expectedAlternate =
        `hreflang="${alternateLang}" href="${alternateUrl}"`;

      if (!urlBlock[1].includes(expectedAlternate)) {
        error(`sitemap.xml: ${lang} page is missing alternate ${alternateLang}.`);
      }
    }

    const defaultAlternate =
      `hreflang="x-default" href="${expectedUrls.pl}"`;

    if (!urlBlock[1].includes(defaultAlternate)) {
      error(`sitemap.xml: ${lang} page is missing x-default.`);
    }
  }
}


/* ---------- Generated HTML ---------- */

function auditPage(lang, languageConfig) {
  const relativePath = {
    pl: "menu/index.html",
    uk: "menu/ua/index.html",
    en: "menu/en/index.html",
  }[lang];

  const html = readPublicFile(relativePath);

  if (html === null) return;

  const dom = new JSDOM(html);
  const document = dom.window.document;

  const expectedUrl = expectedUrls[lang];

  // HTML language.
  const htmlLang = document.documentElement.lang;

  if (htmlLang !== lang) {
    error(`${relativePath}: expected html lang="${lang}", found "${htmlLang}".`);
  }

  // Title.
  const title = document.querySelector("title")?.textContent.trim() ?? "";

  if (!title) {
    error(`${relativePath}: missing title.`);
  } else if (title.length < 20) {
    warn(`${relativePath}: title is unusually short (${title.length} characters).`);
  } else if (title.length > 70) {
    warn(`${relativePath}: title is longer than 70 characters.`);
  }

  // Meta description.
  const description = document
    .querySelector('meta[name="description"]')
    ?.getAttribute("content")
    ?.trim() ?? "";

  if (!description) {
    error(`${relativePath}: missing meta description.`);
  } else if (description.length < 70) {
    warn(`${relativePath}: meta description is unusually short.`);
  } else if (description.length > 170) {
    warn(`${relativePath}: meta description is longer than 170 characters.`);
  }

  // Canonical.
  const canonical = document
    .querySelector('link[rel="canonical"]')
    ?.getAttribute("href");

  if (canonical !== expectedUrl) {
    error(`${relativePath}: incorrect canonical URL. Expected ${expectedUrl}`);
  }

  // Hreflang.
  const alternateLinks = [
    ...document.querySelectorAll('link[rel="alternate"][hreflang]'),
  ];

  for (const [alternateLang, alternateUrl] of Object.entries(expectedUrls)) {
    const found = alternateLinks.some(
      (link) =>
        link.getAttribute("hreflang") === alternateLang &&
        link.getAttribute("href") === alternateUrl,
    );

    if (!found) {
      error(`${relativePath}: missing hreflang ${alternateLang}.`);
    }
  }

  const xDefault = alternateLinks.some(
    (link) =>
      link.getAttribute("hreflang") === "x-default" &&
      link.getAttribute("href") === expectedUrls.pl,
  );

  if (!xDefault) {
    error(`${relativePath}: missing correct hreflang x-default.`);
  }

  // Robots meta.
  const robots = document
    .querySelector('meta[name="robots"]')
    ?.getAttribute("content")
    ?.toLowerCase() ?? "";

  if (config.allowIndexing) {
    if (!robots.includes("index") || !robots.includes("follow")) {
      error(`${relativePath}: expected index, follow in meta robots.`);
    }

    if (robots.includes("noindex") || robots.includes("nofollow")) {
      error(`${relativePath}: indexing is enabled but noindex/nofollow is present.`);
    }
  } else {
    if (!robots.includes("noindex") || !robots.includes("nofollow")) {
      error(`${relativePath}: expected noindex, nofollow in meta robots.`);
    }
  }

  // H1.
  const h1Count = document.querySelectorAll("h1").length;

  if (h1Count !== 1) {
    error(`${relativePath}: expected exactly one H1, found ${h1Count}.`);
  }

  // Image ALT.
  const imagesWithoutAlt = [
    ...document.querySelectorAll("img:not([alt])"),
  ];

  if (imagesWithoutAlt.length > 0) {
    warn(
      `${relativePath}: ${imagesWithoutAlt.length} images have no ALT attribute.`,
    );
  }

  // Open Graph.
  const ogUrl = document
    .querySelector('meta[property="og:url"]')
    ?.getAttribute("content");

  if (ogUrl !== expectedUrl) {
    error(`${relativePath}: incorrect og:url.`);
  }

  const ogImage = document
    .querySelector('meta[property="og:image"]')
    ?.getAttribute("content");

  if (!ogImage || !ogImage.startsWith(`${origin}/`)) {
    error(`${relativePath}: missing or invalid og:image.`);
  }

  // JSON-LD.
  const jsonLdElement = document.querySelector(
    'script[type="application/ld+json"]#structured-data',
  );

  if (!jsonLdElement) {
    error(`${relativePath}: missing Schema.org JSON-LD.`);
    dom.window.close();
    return;
  }

  let structuredData;

  try {
    structuredData = JSON.parse(jsonLdElement.textContent);
  } catch {
    error(`${relativePath}: invalid JSON-LD JSON.`);
    dom.window.close();
    return;
  }

  if (structuredData["@context"] !== "https://schema.org") {
    error(`${relativePath}: incorrect Schema.org context.`);
  }

  const graph = Array.isArray(structuredData["@graph"])
    ? structuredData["@graph"]
    : [];

  const restaurant = graph.find(
    (node) => node["@type"] === "Restaurant",
  );

  const website = graph.find(
    (node) => node["@type"] === "WebSite",
  );

  const webpage = graph.find(
    (node) => node["@type"] === "WebPage",
  );

  if (!restaurant) {
    error(`${relativePath}: Schema.org Restaurant entity is missing.`);
  } else {
    if (restaurant.name !== config.name) {
      error(`${relativePath}: Schema.org Restaurant name does not match config.`);
    }

    if (restaurant.telephone !== config.phone) {
      error(`${relativePath}: Schema.org telephone does not match config.`);
    }

    if (restaurant.url !== expectedUrl) {
      error(`${relativePath}: Schema.org Restaurant URL is incorrect.`);
    }

    if (
      restaurant.address?.streetAddress !== config.street ||
      restaurant.address?.addressLocality !== config.city ||
      restaurant.address?.postalCode !== config.postalCode ||
      restaurant.address?.addressCountry !== config.country
    ) {
      error(`${relativePath}: Schema.org restaurant address does not match config.`);
    }

    if (
      JSON.stringify(restaurant.openingHoursSpecification ?? []) !==
      JSON.stringify(
        (config.openingHours ?? []).map((hours) => ({
          "@type": "OpeningHoursSpecification",
          dayOfWeek: hours.days,
          opens: hours.opens,
          closes: hours.closes,
        })),
      )
    ) {
      error(`${relativePath}: Schema.org opening hours do not match config.`);
    }
  }

  if (!website) {
    error(`${relativePath}: Schema.org WebSite entity is missing.`);
  }

  if (!webpage) {
    error(`${relativePath}: Schema.org WebPage entity is missing.`);
  } else {
    if (webpage.url !== expectedUrl) {
      error(`${relativePath}: Schema.org WebPage URL is incorrect.`);
    }

    if (webpage.inLanguage !== languageConfig.locale) {
      error(`${relativePath}: Schema.org WebPage language is incorrect.`);
    }
  }

  dom.window.close();
}


/* ---------- Run audit ---------- */

console.log("SUSHI & CHILL — SEO audit");
console.log(`Origin: ${origin}`);
console.log(`Indexing: ${config.allowIndexing ? "ON" : "OFF"}`);
console.log("");

try {
  if (new URL(config.origin).protocol !== "https:") {
    error("site.config.json: origin must use HTTPS.");
  }
} catch {
  error("site.config.json: origin is not a valid URL.");
}

auditRobots();
auditSitemap();

for (const [lang, languageConfig] of Object.entries(languages)) {
  auditPage(lang, languageConfig);
}

console.log(`Errors: ${errors.length}`);
console.log(`Warnings: ${warnings.length}`);

if (errors.length > 0) {
  console.error("\nERRORS:");

  for (const message of errors) {
    console.error(`- ${message}`);
  }
}

if (warnings.length > 0) {
  console.warn("\nWARNINGS:");

  for (const message of warnings) {
    console.warn(`- ${message}`);
  }
}

if (errors.length > 0) {
  process.exitCode = 1;
} else {
  console.log("\nSEO audit completed successfully.");
}
