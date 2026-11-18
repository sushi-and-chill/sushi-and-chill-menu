"use strict";

/*
 * QR-menu SUSHI & CHILL
 *
 * Сторінки /menu/, /menu/ua/, /menu/en/ попередньо рендеряться на етапі збірки
 * (tools/build.mjs запускає цей самий скрипт у jsdom), тому пошуковики й
 * користувачі без JS бачать повне меню. У браузері скрипт перевіряє, чи
 * збігається готовий HTML із data/menu.json, і лише тоді вмикає пошук тощо.
 *
 * Мова сторінки береться з <html lang>. Тексти інтерфейсу: assets/js/i18n.js.
 * Коментарі до категорій: data/category-notes.json (порожнє поле = не показується).
 */
(function () {
  const MENU_URL = "/data/menu.json";
  const NOTES_URL = "/data/category-notes.json";
  const IMAGE_BASE = "/assets/images/menu/";
  // Ширина фото в картці: 1 колонка / 2 колонки / 2 колонки в контейнері 960px.
  const PHOTO_SIZES = "(min-width: 960px) 426px, (min-width: 640px) calc(50vw - 56px), calc(100vw - 66px)";
  const STORAGE_KEY = "qr-menu-language";
  const DEFAULT_LANGUAGE = "pl";
  const EAGER_IMAGES = 2; // перші фото вантажимо одразу (LCP)

  const I18N = window.QR_I18N;
  const BUILD = window.QR_MENU_BUILD || null; // є лише під час prerender

  const htmlLang = (document.documentElement.getAttribute("lang") || "")
    .slice(0, 2)
    .toLowerCase();
  const currentLanguage = I18N[htmlLang] ? htmlLang : DEFAULT_LANGUAGE;
  const labels = I18N[currentLanguage];

  /* Назви полів відповідають експорту QR-MM. */
  const FIELD_MAP = {
    id: "ID",
    category: "KATEGORIJA",
    namePl: "NAZWA",
    nameUk: "UKR_NAZWA",
    nameEn: "ENG_NAZWA",
    descriptionPl: "OPIS_PL",
    descriptionUk: "OPIS_UKR",
    descriptionEn: "OPIS_ENG",
    weight: "WAGA DANIA",
    pieces: "SZT",
    price: "CENA PLN",
    ingredients: "INGR. GRAMY",
    active: "ACTIVE",
    sortOrder: "SORT_ORDER",
    allergens: "ALERGEN",
    photo: "IMAGE",
    photoLegacy: "FOTO",
    promo: "PROMO",
    promoPercent: "%PROMO",
  };

  const elements = {
    categoryNavigation: document.querySelector("#category-navigation"),
    content: document.querySelector("#menu-content"),
    search: document.querySelector("#menu-search"),
    resultStatus: document.querySelector("#result-status"),
    toTop: document.querySelector("#to-top"),
    languageLinks: document.querySelectorAll("[data-lang]"),
  };

  let menuItems = [];
  let categoryNotes = new Map();
  let searchTerm = "";
  let loadPromise = null;
  const photoMetaByUrl = new Map(); // src -> { w, h, srcset } зі згенерованого HTML

  /* ---------- Алергени: нормалізація без здогадок ---------- */

  const ALLERGEN_TERMS = {
    ryby: { pl: "ryby", uk: "риба", en: "fish" },
    soja: { pl: "soja", uk: "соя", en: "soybeans" },
    mleko: { pl: "mleko", uk: "молоко", en: "milk" },
    gluten: { pl: "zboża zawierające gluten", uk: "злаки, що містять глютен", en: "cereals containing gluten" },
    jaja: { pl: "jaja", uk: "яйця", en: "eggs" },
    sezam: { pl: "sezam", uk: "кунжут", en: "sesame" },
    skorupiaki: { pl: "skorupiaki", uk: "ракоподібні", en: "crustaceans" },
    "mięczaki": { pl: "mięczaki", uk: "молюски", en: "molluscs" },
    gorczyca: { pl: "gorczyca", uk: "гірчиця", en: "mustard" },
    seler: { pl: "seler", uk: "селера", en: "celery" },
    "łubin": { pl: "łubin", uk: "люпин", en: "lupin" },
    siarczyny: { pl: "dwutlenek siarki i siarczyny", uk: "діоксид сірки та сульфіти", en: "sulphur dioxide and sulphites" },
    "dwutlenek siarki i siarczyny": { pl: "dwutlenek siarki i siarczyny", uk: "діоксид сірки та сульфіти", en: "sulphur dioxide and sulphites" },
    "dwutlenek siarki": { pl: "dwutlenek siarki", uk: "діоксид сірки", en: "sulphur dioxide" },
    "orzeszki ziemne": { pl: "orzeszki ziemne", uk: "арахіс", en: "peanuts" },
    orzechy: { pl: "orzechy (należy wskazać rodzaj)", uk: "горіхи (потрібно вказати вид)", en: "tree nuts (specify the type)" },
    "soje": { pl: "soja", uk: "соя", en: "soybeans" },
    "soję": { pl: "soja", uk: "соя", en: "soybeans" },
    "gorczycę": { pl: "gorczyca", uk: "гірчиця", en: "mustard" },
    "orzeszki ziemne / orzechy": { pl: "orzeszki ziemne / orzechy (zapis niejednoznaczny)", uk: "арахіс / горіхи (неоднозначний запис)", en: "peanuts / tree nuts (ambiguous source entry)" },
  };

  const NO_ALLERGEN_MARKS = new Set(["—", "–", "-", "brak", "none", "немає"]);

  function canonicalAllergen(value) {
    const key = value.trim().toLocaleLowerCase("pl-PL").replace(/[.!;:]+$/g, "").replace(/\s+/g, " ");
    if (key === "soje" || key === "soję") return "soja";
    if (key === "gorczycę") return "gorczyca";
    return key;
  }

  function parseAllergenData(value) {
    const raw = textValue(value).replace(/\r/g, "").replace(/\n/g, ",");
    if (!raw) return { declared: [], mayContain: [], unspecified: true };

    const marker = /może\s+zawierać\s*:?|moze\s+zawierac\s*:?/i;
    const match = raw.match(marker);
    const declaredText = match ? raw.slice(0, match.index) : raw;
    const mayContainText = match ? raw.slice(match.index + match[0].length) : "";
    const split = (text) => text.split(/[,;]+/).map(canonicalAllergen).filter(Boolean);
    const declared = split(declaredText);
    const mayContain = split(mayContainText);
    const onlyDash = declared.length === 1 && NO_ALLERGEN_MARKS.has(declared[0].toLowerCase());

    return {
      declared: onlyDash ? [] : declared,
      mayContain,
      unspecified: onlyDash || declared.length === 0,
    };
  }

  function translateAllergen(value) {
    const key = canonicalAllergen(value);
    const entry = ALLERGEN_TERMS[key];
    return entry ? entry[currentLanguage] : value.trim();
  }

  function formatAllergenList(values) {
    return values.map(translateAllergen).filter(Boolean).join(", ");
  }

  /* ---------- Допоміжні функції ---------- */

  function textValue(value) {
    if (value === null || value === undefined) {
      return "";
    }

    return String(value).trim();
  }

  /* Текст в один рядок (у ODS назви й категорії можуть містити \n). */
  function inlineText(value) {
    return textValue(value).replace(/\s+/g, " ");
  }

  function numberValue(value) {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }

    if (typeof value !== "string") {
      return null;
    }

    const normalized = value.trim().replace(",", ".");

    if (!normalized) {
      return null;
    }

    const result = Number(normalized);

    return Number.isFinite(result) ? result : null;
  }

  /* "250", "250 g", "300ml" -> { value, unit }. */
  function weightValue(value) {
    const match = textValue(value)
      .replace(",", ".")
      .match(/^(\d+(?:\.\d+)?)\s*(ml|мл|g|г)?$/i);

    if (!match) {
      return null;
    }

    const unit = (match[2] || "g").toLowerCase();

    return {
      value: Number(match[1]),
      unit: unit === "ml" || unit === "мл" ? "ml" : "g",
    };
  }

  function isActive(value) {
    if (value === true || value === 1) {
      return true;
    }

    if (typeof value !== "string") {
      return false;
    }

    return ["true", "1", "yes", "tak"].includes(value.trim().toLowerCase());
  }

  /* Ціна завжди у форматі «50,00 zł» (однаково для всіх мов). */
  function formatPrice(value) {
    const price = numberValue(value);

    if (price === null || price < 0) {
      return "";
    }

    return (
      new Intl.NumberFormat(labels.locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(price) +
      "\u00a0" +
      labels.currency
    );
  }

  function hashString(rawText) {
    const text = rawText.replace(/\r/g, "");
    let hash = 5381;

    for (let i = 0; i < text.length; i += 1) {
      hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
    }

    return (hash >>> 0).toString(36);
  }

  function slugify(text) {
    const slug = text
      .toLowerCase()
      .replace(/ł/g, "l")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return slug || "category";
  }

  function clearNode(node) {
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
      element.className = className;
    }

    if (text !== undefined) {
      element.textContent = text;
    }

    return element;
  }

  function showMessage(className, text) {
    clearNode(elements.content);
    elements.content.appendChild(createElement("p", className, text));
  }

  /* ---------- Дані ---------- */

  /*
   * INGR. GRAMY -> лише назви інгредієнтів (без грамовки).
   * Формати: "Nori 2 Ryż 140 Łosoś 60" або по одному в рядку.
   */
  function parseIngredientNames(text) {
    if (!text) {
      return [];
    }

    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    let names = [];

    if (lines.length === 1) {
      const pattern = /([^\d]+?)\s*\d+(?:[.,]\d+)?/g;
      const line = lines[0];
      let consumed = 0;
      let match = pattern.exec(line);

      while (match) {
        names.push(match[1]);
        consumed = pattern.lastIndex;
        match = pattern.exec(line);
      }

      if (line.slice(consumed).trim() !== "") {
        names.push(line.slice(consumed));
      }
    } else {
      names = lines.map((line) =>
        line.replace(/\s*\d+(?:[.,]\d+)?\s*(?:g|gr|ml)?\s*$/i, "")
      );
    }

    const seen = {};

    return names
      .map((name) => name.replace(/[,;:\s]+$/, "").replace(/^[,;:\s]+/, "").trim())
      .filter((name) => {
        const key = name.toLowerCase();

        if (!name || seen[key]) {
          return false;
        }

        seen[key] = true;

        return true;
      });
  }

  function normalizeItem(item, index) {
    const f = FIELD_MAP;

    return {
      id: textValue(item[f.id]),
      category: inlineText(item[f.category]) || "Inne",
      name: {
        pl: inlineText(item[f.namePl]),
        uk: inlineText(item[f.nameUk]),
        en: inlineText(item[f.nameEn]),
      },
      description: {
        pl: textValue(item[f.descriptionPl]),
        uk: textValue(item[f.descriptionUk]),
        en: textValue(item[f.descriptionEn]),
      },
      weight: weightValue(item[f.weight]),
      pieces: numberValue(item[f.pieces]),
      price: numberValue(
        item[f.price] !== undefined ? item[f.price] : item.CENA_PLN
      ),
      ingredientNames: parseIngredientNames(textValue(item[f.ingredients])),
      allergens: parseAllergenData(item[f.allergens]),
      active: isActive(item[f.active]),
      sortOrder: numberValue(item[f.sortOrder]) || 0,
      photo: textValue(item[f.photo]) || textValue(item[f.photoLegacy]),
      promo: isActive(item[f.promo]),
      promoPercent: numberValue(item[f.promoPercent]),
      originalIndex: index,
    };
  }

  function normalizeMenu(data) {
    if (!data || typeof data !== "object" || !Array.isArray(data.items)) {
      throw new Error("Invalid menu JSON: expected an items array.");
    }

    if (data.schema_version !== undefined && data.schema_version !== 1) {
      throw new Error(`Unsupported menu schema version: ${data.schema_version}`);
    }

    const normalized = data.items
      .filter((item) => item && typeof item === "object")
      .map(normalizeItem);

    // Порядок категорій: за найменшим SORT_ORDER серед її страв.
    const firstSeen = new Map();

    for (const item of normalized) {
      const known = firstSeen.get(item.category);

      if (
        !known ||
        item.sortOrder < known.sortOrder ||
        (item.sortOrder === known.sortOrder &&
          item.originalIndex < known.originalIndex)
      ) {
        firstSeen.set(item.category, {
          sortOrder: item.sortOrder,
          originalIndex: item.originalIndex,
        });
      }
    }

    const categoryOrder = new Map();

    Array.from(firstSeen.keys())
      .sort((a, b) => {
        const x = firstSeen.get(a);
        const y = firstSeen.get(b);

        return x.sortOrder - y.sortOrder || x.originalIndex - y.originalIndex;
      })
      .forEach((name, position) => categoryOrder.set(name, position));

    return normalized
      .filter((item) => item.active)
      .filter((item) => item.name.pl !== "")
      .filter((item) => item.price !== null && item.price >= 0)
      .sort((a, b) => {
        const byCategory =
          categoryOrder.get(a.category) - categoryOrder.get(b.category);

        if (byCategory !== 0) {
          return byCategory;
        }

        return a.sortOrder - b.sortOrder || a.originalIndex - b.originalIndex;
      });
  }

  function getItemName(item) {
    return (
      item.name[currentLanguage] || item.name.pl || item.name.uk || item.name.en || ""
    );
  }

  function getItemDescription(item) {
    return (
      item.description[currentLanguage] ||
      item.description.pl ||
      item.description.uk ||
      item.description.en ||
      ""
    );
  }

  /* ---------- Коментарі до категорій ---------- */

  /*
   * category-notes.json: { "НАЗВА КАТЕГОРІЇ": { "pl": "", "uk": "", "en": "" } }.
   * Ключі, що починаються з "_", ігноруються. Порожній текст = коментаря немає.
   */
  function parseNotes(raw) {
    const notes = new Map();
    let data;

    try {
      data = JSON.parse(raw);
    } catch (error) {
      return notes;
    }

    if (!data || typeof data !== "object") {
      return notes;
    }

    for (const key of Object.keys(data)) {
      if (key.charAt(0) === "_") {
        continue;
      }

      const value = data[key];
      const entry =
        typeof value === "string" ? { pl: value, uk: value, en: value } : value;

      if (!entry || typeof entry !== "object") {
        continue;
      }

      notes.set(inlineText(key).toLowerCase(), {
        pl: textValue(entry.pl),
        uk: textValue(entry.uk),
        en: textValue(entry.en),
      });
    }

    return notes;
  }

  function getCategoryNote(category) {
    const entry = categoryNotes.get(category.toLowerCase());

    if (!entry) {
      return "";
    }

    // Порожня мова → польський текст, потім англійський, потім український.
    return entry[currentLanguage] || entry.pl || entry.en || entry.uk || "";
  }

  /* ---------- Пошук ---------- */

  /* Без урахування регістру та діакритики (ł -> l). */
  function normalizeSearch(text) {
    return textValue(text)
      .toLowerCase()
      .replace(/ł/g, "l")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function getSearchText(item) {
    if (item.searchText === undefined) {
      item.searchText = normalizeSearch(
        [
          item.category,
          item.name.pl,
          item.name.uk,
          item.name.en,
          item.ingredientNames.join(" "),
        ].join(" ")
      );
    }

    return item.searchText;
  }

  /* ---------- Фото ---------- */

  function getPhotoUrl(value) {
    const photo = textValue(value);

    if (!photo) {
      return "";
    }

    // Просто ім'я файлу (IMAGE з QR-MM).
    if (/^[A-Za-z0-9._-]+\.(webp|jpe?g|png|avif)$/i.test(photo)) {
      return IMAGE_BASE + photo;
    }

    if (photo.startsWith("/") && !photo.startsWith("//")) {
      return photo;
    }

    try {
      const url = new URL(photo, window.location.href);

      if (url.protocol === "https:") {
        return url.href;
      }
    } catch (error) {
      return "";
    }

    return "";
  }

  /* Кандидати: ID.webp (так названі файли в проєкті), потім ім'я з IMAGE. */
  function getPhotoCandidates(item) {
    const url = getPhotoUrl(item.photo);
    const list = [];

    if (!url) {
      return list;
    }

    if (/^[A-Za-z0-9_-]+$/.test(item.id) && url.indexOf(IMAGE_BASE) !== -1) {
      list.push(IMAGE_BASE + item.id + ".webp");
    }

    if (list.indexOf(url) === -1) {
      list.push(url);
    }

    // Під час збірки лишаємо тільки ті файли, які реально існують.
    return BUILD && BUILD.photoExists ? list.filter(BUILD.photoExists) : list;
  }

  /* Розміри й srcset фото: під час збірки — з файлів, у браузері — з готового HTML. */
  function harvestPhotos() {
    for (const img of elements.content.querySelectorAll("img.item-photo")) {
      const src = img.getAttribute("src");

      if (src && !photoMetaByUrl.has(src)) {
        photoMetaByUrl.set(src, {
          w: Number(img.getAttribute("width")) || 0,
          h: Number(img.getAttribute("height")) || 0,
          srcset: img.getAttribute("srcset") || "",
        });
      }
    }
  }

  function getPhotoMeta(src) {
    if (BUILD && BUILD.photoMeta) {
      const meta = BUILD.photoMeta(src.split("?")[0]);

      if (!meta) {
        return null;
      }

      return {
        w: meta.w,
        h: meta.h,
        srcset: meta.small
          ? `${meta.small.src} ${meta.small.w}w, ${src} ${meta.w}w`
          : "",
      };
    }

    return photoMetaByUrl.get(src) || null;
  }

  /* ---------- Рендер ---------- */

  function renderIngredients(item, card) {
    if (!item.ingredientNames.length) {
      return;
    }

    const details = createElement("details", "item-ingredients");
    const summary = createElement("summary", "item-subtitle", labels.ingredients);
    const list = createElement("ul", "ingredients-list");

    for (const name of item.ingredientNames) {
      list.append(createElement("li", "", name));
    }

    details.append(summary, list);
    card.append(details);
  }

  function renderItem(item, imageIndex) {
    const card = createElement("article", "menu-card");
    const photoCandidates = getPhotoCandidates(item);

    if (photoCandidates.length > 0) {
      const holder = createElement("div", "photo-frame");
      const image = createElement("img", "item-photo");
      const meta = getPhotoMeta(photoCandidates[0]);
      let attempt = 0;

      // setAttribute (а не властивості), щоб атрибути потрапили в prerender-HTML.
      // Справжні розміри фото потрібні, щоб воно не обрізалось і сторінка не «стрибала».
      image.setAttribute("alt", getItemName(item));
      image.setAttribute("width", String(meta && meta.w ? meta.w : 1200));
      image.setAttribute("height", String(meta && meta.h ? meta.h : 670));
      image.setAttribute("decoding", "async");

      if (meta && meta.srcset) {
        image.setAttribute("srcset", meta.srcset);
        image.setAttribute("sizes", PHOTO_SIZES);
      }

      if (imageIndex < EAGER_IMAGES) {
        image.setAttribute("loading", "eager");

        if (imageIndex === 0) {
          image.setAttribute("fetchpriority", "high");
        }
      } else {
        image.setAttribute("loading", "lazy");
      }

      image.addEventListener("error", () => {
        attempt += 1;

        if (attempt < photoCandidates.length) {
          image.removeAttribute("srcset");
          image.removeAttribute("sizes");
          image.setAttribute("src", photoCandidates[attempt]);
        } else {
          holder.remove();
        }
      });

      image.setAttribute("src", photoCandidates[0]);
      holder.append(image);
      card.append(holder);
    }

    card.append(createElement("h3", "item-name", getItemName(item)));

    const description = getItemDescription(item);

    if (description) {
      card.append(createElement("p", "item-description", description));
    }

    const meta = createElement("div", "item-meta");

    if (item.weight && item.weight.value > 0) {
      const unit = item.weight.unit === "ml" ? labels.ml : labels.grams;

      meta.append(createElement("span", "", `${item.weight.value}\u00a0${unit}`));
    }

    if (item.pieces !== null && item.pieces > 0) {
      meta.append(createElement("span", "", `${item.pieces}\u00a0${labels.pieces}`));
    }

    if (meta.childElementCount > 0) {
      card.append(meta);
    }

    renderIngredients(item, card);

    const declaredText = formatAllergenList(item.allergens.declared);
    const mayContainText = formatAllergenList(item.allergens.mayContain);

    if (declaredText || item.allergens.unspecified) {
      const allergens = createElement("p", "item-allergens");
      allergens.append(
        createElement("strong", "allergen-label", labels.allergens + ":"),
        document.createTextNode(" " + (declaredText || labels.noAllergens))
      );
      card.append(allergens);
    }

    if (mayContainText) {
      const mayContain = createElement("p", "item-allergens item-may-contain");
      mayContain.append(
        createElement("strong", "allergen-label", labels.mayContain + ":"),
        document.createTextNode(" " + mayContainText)
      );
      card.append(mayContain);
    }

    const hasPromo =
      item.promo &&
      item.promoPercent !== null &&
      item.promoPercent > 0 &&
      item.promoPercent < 100;

    if (hasPromo) {
      const promoPrice = Math.round(item.price * (100 - item.promoPercent)) / 100;
      const priceBox = createElement("p", "item-price item-price-promo");

      priceBox.append(
        createElement("span", "promo-badge", `-${item.promoPercent}%`),
        createElement("s", "price-old", formatPrice(item.price)),
        createElement("span", "price-new", formatPrice(promoPrice))
      );
      card.append(priceBox);
    } else {
      card.append(createElement("p", "item-price", formatPrice(item.price)));
    }

    return card;
  }

  function announceResults(count) {
    if (!elements.resultStatus) {
      return;
    }

    elements.resultStatus.textContent = searchTerm ? labels.results + count : "";
  }

  function renderMenu(menuHash) {
    clearNode(elements.categoryNavigation);
    clearNode(elements.content);

    if (menuItems.length === 0) {
      showMessage("status-message", labels.empty);
      announceResults(0);

      return;
    }

    const visibleItems = searchTerm
      ? menuItems.filter((item) => getSearchText(item).indexOf(searchTerm) !== -1)
      : menuItems;

    announceResults(visibleItems.length);

    if (visibleItems.length === 0) {
      showMessage("status-message", labels.noResults);

      return;
    }

    const categories = new Map();

    for (const item of visibleItems) {
      if (!categories.has(item.category)) {
        categories.set(item.category, []);
      }

      categories.get(item.category).push(item);
    }

    const usedIds = new Set();
    let imageIndex = 0;

    for (const [category, items] of categories) {
      let sectionId = slugify(category);

      while (usedIds.has(sectionId)) {
        sectionId += "-2";
      }

      usedIds.add(sectionId);

      const link = createElement("a", "category-link", category);

      link.href = "#" + sectionId;
      elements.categoryNavigation.append(link);

      const section = createElement("section", "category-section");

      section.id = sectionId;
      section.setAttribute("aria-labelledby", sectionId + "-title");

      const title = createElement("h2", "category-title", category);

      title.id = sectionId + "-title";
      section.append(title);

      const note = getCategoryNote(category);

      if (note) {
        section.append(createElement("p", "category-comment", note));
      }

      if (/^futomaki/i.test(category)) {
        section.append(createElement("p", "notice category-notice", labels.friedNote));
      }

      const grid = createElement("div", "menu-grid");

      for (const item of items) {
        grid.append(renderItem(item, imageIndex));
        imageIndex += 1;
      }

      section.append(grid);
      elements.content.append(section);
    }

    if (menuHash) {
      elements.content.setAttribute("data-menu-hash", menuHash);
    }
  }

  /* ---------- Структуровані дані schema.org ---------- */

  function updateStructuredData() {
    const script = document.querySelector("#structured-data");

    if (!script) {
      return;
    }

    try {
      const data = JSON.parse(script.textContent);
      const origin = new URL(data.url).origin;
      const sections = [];
      const byCategory = {};

      for (const item of menuItems) {
        if (!byCategory[item.category]) {
          byCategory[item.category] = {
            "@type": "MenuSection",
            name: item.category,
            hasMenuItem: [],
          };

          const note = getCategoryNote(item.category);

          if (note) {
            byCategory[item.category].description = note;
          }

          sections.push(byCategory[item.category]);
        }

        const entry = {
          "@type": "MenuItem",
          name: getItemName(item),
          offers: {
            "@type": "Offer",
            price: item.price.toFixed(2),
            priceCurrency: "PLN",
          },
        };

        const description = getItemDescription(item);
        const photos = getPhotoCandidates(item);

        if (description) {
          entry.description = description;
        }

        if (photos.length > 0) {
          entry.image = new URL(photos[0], origin).href;
        }

        byCategory[item.category].hasMenuItem.push(entry);
      }

      data.hasMenu = {
        "@type": "Menu",
        name: "Menu SUSHI & CHILL",
        url: data.url,
        inLanguage: currentLanguage,
        hasMenuSection: sections,
      };

      script.textContent = JSON.stringify(data);
    } catch (error) {
      console.warn("Structured data not updated:", error);
    }
  }

  /* ---------- Мова ---------- */

  function setupLanguageLinks() {
    for (const link of elements.languageLinks) {
      const isCurrent = link.dataset.lang === currentLanguage;

      if (isCurrent) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }

      // Запам'ятовуємо свідомий вибір мови для наступного сканування QR.
      link.addEventListener("click", () => {
        try {
          localStorage.setItem(STORAGE_KEY, link.dataset.lang);
        } catch (error) {
          // Працює й без localStorage.
        }
      });
    }
  }

  /*
   * Лише на головній сторінці /menu/ (data-entry): якщо гість раніше свідомо
   * обрав іншу мову — відкриваємо її. Боти без localStorage не перенаправляються.
   */
  function redirectToSavedLanguage() {
    if (!document.body.hasAttribute("data-entry")) {
      return false;
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved && saved !== currentLanguage && I18N[saved]) {
        window.location.replace(I18N[saved].path + window.location.hash);

        return true;
      }
    } catch (error) {
      return false;
    }

    return false;
  }

  /* ---------- Завантаження ---------- */

  async function fetchText(url, optional) {
    const response = await fetch(url, {
      cache: "no-cache",
      headers: { Accept: "application/json" },
      priority: "low",
    });

    if (!response.ok) {
      if (optional) {
        return "";
      }

      throw new Error(`Request failed: ${url} HTTP ${response.status}`);
    }

    return response.text();
  }

  async function loadMenu() {
    const alreadyRendered = Boolean(
      elements.content.querySelector(".category-section")
    );

    if (!alreadyRendered) {
      elements.content.setAttribute("aria-busy", "true");
      showMessage("status-message", labels.loading);
    }

    try {
      // Коментарі до категорій необов'язкові: помилка їх завантаження меню не ламає.
      const [text, notesText] = await Promise.all([
        fetchText(MENU_URL, false),
        fetchText(NOTES_URL, true).catch(() => ""),
      ]);

      menuItems = normalizeMenu(JSON.parse(text));
      categoryNotes = parseNotes(notesText);

      const menuHash = hashString(text + "\u0000" + notesText) + "-" + currentLanguage;
      const upToDate =
        alreadyRendered &&
        elements.content.getAttribute("data-menu-hash") === menuHash;

      if (!upToDate) {
        renderMenu(menuHash);
        updateStructuredData();
      }
    } catch (error) {
      console.error("QR-menu loading error:", error);

      // Якщо готове меню вже є в HTML, не затираємо його повідомленням про помилку.
      if (!alreadyRendered) {
        clearNode(elements.categoryNavigation);
        showMessage("error-message", labels.error);
      }
    } finally {
      elements.content.setAttribute("aria-busy", "false");
    }
  }

  function ensureLoaded() {
    if (!loadPromise) {
      loadPromise = loadMenu();
    }

    return loadPromise;
  }

  /* Перевірку актуальності меню робимо після завантаження сторінки, у вільний момент. */
  function whenIdle(callback) {
    const run = () => {
      if (window.requestIdleCallback) {
        window.requestIdleCallback(callback, { timeout: 3000 });
      } else {
        window.setTimeout(callback, 1200);
      }
    };

    if (document.readyState === "complete") {
      run();
    } else {
      window.addEventListener("load", run, { once: true });
    }
  }

  /* ---------- Навігація категоріями ---------- */

  function initNavigationScroll() {
    const nav = elements.categoryNavigation;
    let dragging = false;
    let moved = false;
    let startX = 0;
    let startLeft = 0;
    let ticking = false;

    nav.addEventListener(
      "wheel",
      (event) => {
        const max = nav.scrollWidth - nav.clientWidth;

        if (
          max <= 0 ||
          Math.abs(event.deltaX) > Math.abs(event.deltaY) ||
          (event.deltaY > 0 && nav.scrollLeft >= max) ||
          (event.deltaY < 0 && nav.scrollLeft <= 0)
        ) {
          return;
        }

        nav.scrollLeft += event.deltaY;
        event.preventDefault();
      },
      { passive: false }
    );

    nav.addEventListener("mousedown", (event) => {
      if (event.button !== 0) {
        return;
      }

      dragging = true;
      moved = false;
      startX = event.pageX;
      startLeft = nav.scrollLeft;
    });

    window.addEventListener("mousemove", (event) => {
      if (!dragging) {
        return;
      }

      const delta = event.pageX - startX;

      if (Math.abs(delta) > 5) {
        moved = true;
      }

      nav.scrollLeft = startLeft - delta;
    });

    window.addEventListener("mouseup", () => {
      dragging = false;
    });

    nav.addEventListener("click", (event) => {
      if (moved) {
        event.preventDefault();
        moved = false;
      }
    });

    function updateActive() {
      ticking = false;

      const sections = elements.content.querySelectorAll(".category-section");
      const links = nav.querySelectorAll(".category-link");
      let activeIndex = 0;

      for (let i = 0; i < sections.length; i += 1) {
        if (sections[i].getBoundingClientRect().top <= 110) {
          activeIndex = i;
        }
      }

      for (let i = 0; i < links.length; i += 1) {
        const active = i === activeIndex;

        if (active !== links[i].classList.contains("is-active")) {
          links[i].classList.toggle("is-active", active);

          if (active) {
            links[i].setAttribute("aria-current", "true");
          } else {
            links[i].removeAttribute("aria-current");
          }

          if (active && !dragging) {
            nav.scrollLeft =
              links[i].offsetLeft - (nav.clientWidth - links[i].offsetWidth) / 2;
          }
        }
      }
    }

    window.addEventListener("scroll", () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(updateActive);
      }
    });

    window.requestAnimationFrame(updateActive);
  }

  function prefersReducedMotion() {
    return Boolean(
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  /* ---------- Запуск ---------- */

  function start() {
    setupLanguageLinks();

    if (redirectToSavedLanguage()) {
      return Promise.resolve();
    }

    harvestPhotos();

    let searchTimer = 0;

    elements.search.addEventListener("input", () => {
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(async () => {
        await ensureLoaded();
        searchTerm = normalizeSearch(elements.search.value.trim());
        renderMenu();
      }, 180);
    });

    window.addEventListener("scroll", () => {
      elements.toTop.classList.toggle("is-visible", window.pageYOffset > 600);
    }, { passive: true });

    elements.toTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    });

    initNavigationScroll();

    // Під час збірки та без готового HTML вантажимо одразу; інакше — у вільний момент.
    if (BUILD || !elements.content.querySelector(".category-section")) {
      return ensureLoaded();
    }

    whenIdle(ensureLoaded);

    return Promise.resolve();
  }

  window.QR_MENU = { ready: start() };
})();
