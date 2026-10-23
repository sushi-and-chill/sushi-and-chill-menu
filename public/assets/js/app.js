"use strict";

/*
 * QR-menu для SUSHI & CHILL
 *
 * Джерело даних:
 * public/data/menu.json
 *
 * Формат експорту:
 * QR-MM — JSON з оригінальними назвами колонок ODS.
 */

const MENU_URL = "../data/menu.json";

const LANGUAGES = new Set(["pl", "uk", "en"]);
const DEFAULT_LANGUAGE = "pl";

const TEXT = {
  pl: {
    title: "Nasze menu",
    description: "Sushi we Wrocławiu. Wybierz kategorię i poznaj nasze menu.",
    loading: "Ładowanie menu…",
    empty: "Menu jest chwilowo niedostępne.",
    error: "Nie udało się załadować menu. Spróbuj ponownie później.",
    pieces: "szt.",
    grams: "g",
    ml: "ml",
    pageTitle: "Menu — SUSHI & CHILL Wrocław",
    search: "Szukaj dania lub składnika…",
    noResults: "Brak wyników. Spróbuj innej frazy.",
    toTop: "Do góry",
    spicyNote: "Wszystkie dania mogą być na ostro na życzenie +2 zł",
    friedNote: "Wszystkie futomaki mogą być w wersji smażonej na życzenie +3 zł",
    ingredients: "Składniki",
    allergens: "Alergeny",
  },

  uk: {
    title: "Наше меню",
    description: "Суші у Вроцлаві. Оберіть категорію та ознайомтеся з меню.",
    loading: "Завантаження меню…",
    empty: "Меню тимчасово недоступне.",
    error: "Не вдалося завантажити меню. Спробуйте пізніше.",
    pieces: "шт.",
    grams: "г",
    ml: "мл",
    pageTitle: "Меню — SUSHI & CHILL Вроцлав",
    search: "Пошук страви або інгредієнта…",
    noResults: "Нічого не знайдено. Спробуйте інший запит.",
    toTop: "Нагору",
    spicyNote: "Усі страви можуть бути гострими за бажанням клієнта +2 zł",
    friedNote: "Усі футомакі можна замовити в смаженому вигляді +3 zł",
    ingredients: "Склад",
    allergens: "Алергени",
  },

  en: {
    title: "Our menu",
    description: "Sushi in Wrocław. Choose a category and explore our menu.",
    loading: "Loading menu…",
    empty: "The menu is temporarily unavailable.",
    error: "Could not load the menu. Please try again later.",
    pieces: "pcs",
    grams: "g",
    ml: "ml",
    pageTitle: "Menu — SUSHI & CHILL Wrocław",
    search: "Search dishes or ingredients…",
    noResults: "No results. Try a different search.",
    toTop: "Back to top",
    spicyNote: "All dishes can be made spicy at the customer’s request +2 zł",
    friedNote: "All futomaki can be ordered in a fried version +3 zł",
    ingredients: "Ingredients",
    allergens: "Allergens",
  },
};

/*
 * Назви полів відповідають експорту QR-MM.
 *
 * Порожній переклад не є помилкою:
 * у такому випадку використовуємо польський текст.
 */

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
  title: document.querySelector("#page-title"),
  description: document.querySelector("#page-description"),
  categoryNavigation: document.querySelector(
    "#category-navigation"
  ),
  content: document.querySelector("#menu-content"),
  globalNotice: document.querySelector("#global-notice"),
  search: document.querySelector("#menu-search"),
  toTop: document.querySelector("#to-top"),
  languageButtons: document.querySelectorAll("[data-lang]"),
};

let menuItems = [];
let searchTerm = "";


/* Переклади 14 основних алергенів (джерело даних — польською). */
const ALLERGEN_TERMS = {
  ryby: { uk: "риба", en: "fish" },
  soja: { uk: "соя", en: "soy" },
  mleko: { uk: "молоко", en: "milk" },
  gluten: { uk: "глютен", en: "gluten" },
  jaja: { uk: "яйця", en: "eggs" },
  sezam: { uk: "кунжут", en: "sesame" },
  skorupiaki: { uk: "ракоподібні", en: "crustaceans" },
  "orzeszki ziemne / orzechy": { uk: "арахіс / горіхи", en: "peanuts / nuts" },
  gorczyca: { uk: "гірчиця", en: "mustard" },
  "mięczaki": { uk: "молюски", en: "molluscs" },
};

function formatAllergens(text, language) {
  if (language === "pl") {
    return text;
  }

  return text
    .split(",")
    .map((part) => {
      const key = part.trim().toLowerCase();
      const entry = ALLERGEN_TERMS[key];

      return entry ? entry[language] : part.trim();
    })
    .join(", ");
}

/*
 * INGR. GRAMY -> тільки назви інгредієнтів (без грамовки).
 * Грамовка — технічні дані для кухаря, вони лишаються в QR-MM.
 * Формати: "Nori 2 Ryż 140 Łosoś 60" або по одному в рядку "Nori 0,5".
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

/* Пошук: без урахування регістру та діакритики (ł -> l). */
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

/*
 * Кандидати URL фото: файл ID.webp (так названі файли в проєкті),
 * потім ім'я з поля IMAGE.
 */
function getPhotoCandidates(item) {
  const url = getPhotoUrl(item.photo);
  const list = [];

  if (!url) {
    return list;
  }

  if (/^[A-Za-z0-9_-]+$/.test(item.id) && url.indexOf("assets/images/menu/") !== -1) {
    list.push("../assets/images/menu/" + item.id + ".webp");
  }

  if (list.indexOf(url) === -1) {
    list.push(url);
  }

  return list;
}

/* Структуровані дані schema.org (Restaurant + Menu) для пошуковців. */
function updateStructuredData() {
  const script = document.querySelector("#structured-data");

  if (!script) {
    return;
  }

  try {
    const data = JSON.parse(script.textContent);
    const sections = [];
    const byCategory = {};

    for (const item of menuItems) {
      if (!byCategory[item.category]) {
        byCategory[item.category] = {
          "@type": "MenuSection",
          name: item.category,
          hasMenuItem: [],
        };
        sections.push(byCategory[item.category]);
      }

      const entry = {
        "@type": "MenuItem",
        name: item.name.pl,
        offers: {
          "@type": "Offer",
          price: item.price.toFixed(2),
          priceCurrency: "PLN",
        },
      };

      if (item.description.pl) {
        entry.description = item.description.pl;
      }

      byCategory[item.category].hasMenuItem.push(entry);
    }

    data.hasMenu = {
      "@type": "Menu",
      name: "Menu SUSHI & CHILL",
      inLanguage: "pl",
      hasMenuSection: sections,
    };

    script.textContent = JSON.stringify(data);
  } catch (error) {
    console.warn("Structured data not updated:", error);
  }
}

/* Очищає вузол (замість replaceChildren — для старих браузерів). */
function clearNode(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function showMessage(className, text) {
  const message = document.createElement("p");

  message.className = className;
  message.textContent = text;

  clearNode(elements.content);
  elements.content.appendChild(message);
}
let currentLanguage = DEFAULT_LANGUAGE;

/*
 * Повертає безпечний текст.
 */
function textValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

/*
 * Текст в один рядок: прибирає переноси та зайві пробіли
 * (у таблиці ODS назви й категорії містять \n).
 */
function inlineText(value) {
  return textValue(value).replace(/\s+/g, " ");
}

/*
 * Вага: "250", "250 g", "300ml" -> { value, unit }.
 */
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

/*
 * Перетворює значення на число.
 *
 * Підтримує:
 * 250
 * "250"
 * "35.00"
 * "35,00"
 */
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

/*
 * Визначає активність страви.
 *
 * Підтримує логічні значення та поширені
 * текстові представлення.
 */
function isActive(value) {
  if (value === true || value === 1) {
    return true;
  }

  if (typeof value !== "string") {
    return false;
  }

  return ["true", "1", "yes", "tak"]
    .includes(value.trim().toLowerCase());
}

/*
 * Повертає назву або опис потрібною мовою.
 *
 * Якщо перекладу немає:
 * 1. використовує польський текст;
 * 2. за потреби використовує інші доступні значення.
 */
function localizedValue(item, language, plField, ukField, enField) {
  const values = {
    pl: textValue(item[plField]),
    uk: textValue(item[ukField]),
    en: textValue(item[enField]),
  };

  return (
    values[language] ||
    values.pl ||
    values.uk ||
    values.en ||
    ""
  );
}

/*
 * Форматує ціну.
 */
function formatPrice(value) {
  const price = numberValue(value);

  if (price === null || price < 0) {
    return "";
  }

  const locale = {
    pl: "pl-PL",
    uk: "uk-UA",
    en: "en-GB",
  }[currentLanguage];

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "PLN",
  }).format(price);
}

/*
 * Перетворює запис QR-MM у внутрішній формат.
 *
 * Важливо: оригінальний JSON не змінюється.
 */
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
    price: numberValue(item[f.price] !== undefined ? item[f.price] : item["CENA_PLN"]),

    ingredientNames: parseIngredientNames(textValue(item[f.ingredients])),
    allergens: textValue(item[f.allergens]),

    active: isActive(item[f.active]),
    sortOrder: (numberValue(item[f.sortOrder]) || 0),

    photo: textValue(item[f.photo]) || textValue(item[f.photoLegacy]),

    promo: isActive(item[f.promo]),
    promoPercent: numberValue(item[f.promoPercent]),

    // Зберігаємо початкову послідовність експорту.
    originalIndex: index,
  };
}

/*
 * Перевіряє структуру JSON і готує список страв.
 */
function normalizeMenu(data) {
  if (
    !data ||
    typeof data !== "object" ||
    !Array.isArray(data.items)
  ) {
    throw new Error(
      "Invalid menu JSON: expected an items array."
    );
  }

  if (
    data.schema_version !== undefined &&
    data.schema_version !== 1
  ) {
    throw new Error(
      `Unsupported menu schema version: ${data.schema_version}`
    );
  }

  const normalized = data.items
    .filter(
      (item) => item && typeof item === "object"
    )
    .map(normalizeItem);

  // Порядок категорій: за найменшим SORT_ORDER серед її страв,
  // за однакових значень — за першою появою в експорті.
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

  const categoryList = Array.from(firstSeen.keys()).sort((a, b) => {
    const x = firstSeen.get(a);
    const y = firstSeen.get(b);

    return x.sortOrder - y.sortOrder || x.originalIndex - y.originalIndex;
  });
  const categoryOrder = new Map();

  categoryList.forEach((name, position) => {
    categoryOrder.set(name, position);
  });

  return normalized
    .filter((item) => item.active)
    .filter((item) => item.name.pl !== "")
    .filter((item) => item.price !== null && item.price >= 0)
    .sort((a, b) => {
      const categoryComparison =
        categoryOrder.get(a.category) -
        categoryOrder.get(b.category);

      if (categoryComparison !== 0) {
        return categoryComparison;
      }

      return (
        a.sortOrder - b.sortOrder ||
        a.originalIndex - b.originalIndex
      );
    });
}

/*
 * Створює HTML-елемент і вставляє текст
 * через textContent, а не через innerHTML.
 */
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

/*
 * Повертає назву страви поточною мовою.
 */
function getItemName(item) {
  return (
    item.name[currentLanguage] ||
    item.name.pl ||
    item.name.uk ||
    item.name.en ||
    ""
  );
}

/*
 * Повертає опис страви поточною мовою.
 */
function getItemDescription(item) {
  return (
    item.description[currentLanguage] ||
    item.description.pl ||
    item.description.uk ||
    item.description.en ||
    ""
  );
}

/*
 * Перевіряє URL фотографії.
 *
 * Дозволяємо відносні шляхи та HTTPS.
 * Не дозволяємо javascript: і data:.
 */
function getPhotoUrl(value) {
  const photo = textValue(value);

  if (!photo) {
    return "";
  }

  // Просто ім'я файлу (IMAGE з QR-MM) -> assets/images/menu/
  if (/^[A-Za-z0-9._-]+\.(webp|jpe?g|png|avif)$/i.test(photo)) {
    return "../assets/images/menu/" + photo;
  }

  if (
    photo.startsWith("/") ||
    photo.startsWith("./") ||
    photo.startsWith("../")
  ) {
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

/*
 * Відображає інгредієнти окремими рядками.
 *
 * Рядки не перекладаються автоматично:
 * вони показуються так, як їх записано в QR-MM.
 */
function renderIngredients(item, card) {
  if (!item.ingredientNames.length) {
    return;
  }

  const details = createElement("details", "item-ingredients");
  const summary = createElement(
    "summary",
    "item-subtitle",
    TEXT[currentLanguage].ingredients
  );
  const list = createElement("ul", "ingredients-list");

  for (const name of item.ingredientNames) {
    list.append(createElement("li", "", name));
  }

  details.append(summary, list);
  card.append(details);
}

/*
 * Відображає одну страву.
 */
function renderItem(item) {
  const card = createElement("article", "menu-card");

  const photoCandidates = getPhotoCandidates(item);

  if (photoCandidates.length > 0) {
    const image = createElement("img", "item-photo");
    let attempt = 0;

    image.alt = getItemName(item);
    image.loading = "lazy";
    image.decoding = "async";

    image.addEventListener("error", () => {
      attempt += 1;

      if (attempt < photoCandidates.length) {
        image.src = photoCandidates[attempt];
      } else {
        image.remove();
      }
    });

    image.src = photoCandidates[0];
    card.append(image);
  }

  card.append(
    createElement(
      "h3",
      "item-name",
      getItemName(item)
    )
  );

  const description = getItemDescription(item);

  if (description) {
    card.append(
      createElement(
        "p",
        "item-description",
        description
      )
    );
  }

  const meta = createElement("div", "item-meta");

  if (item.weight && item.weight.value > 0) {
    const unit =
      item.weight.unit === "ml"
        ? TEXT[currentLanguage].ml
        : TEXT[currentLanguage].grams;

    meta.append(
      createElement("span", "", `${item.weight.value} ${unit}`)
    );
  }

  if (item.pieces !== null && item.pieces > 0) {
    meta.append(
      createElement(
        "span",
        "",
        `${item.pieces} ${TEXT[currentLanguage].pieces}`
      )
    );
  }

  if (meta.childElementCount > 0) {
    card.append(meta);
  }

  renderIngredients(item, card);

  if (item.allergens) {
    const allergens = createElement("p", "item-allergens");

    allergens.append(
      createElement(
        "strong",
        "allergen-label",
        TEXT[currentLanguage].allergens + ":"
      ),
      document.createTextNode(
        " " + formatAllergens(item.allergens, currentLanguage)
      )
    );
    card.append(allergens);
  }

  const hasPromo =
    item.promo && item.promoPercent !== null &&
    item.promoPercent > 0 && item.promoPercent < 100;

  if (hasPromo) {
    const promoPrice =
      Math.round(item.price * (100 - item.promoPercent)) / 100;
    const priceBox = createElement("p", "item-price item-price-promo");

    priceBox.append(
      createElement("span", "promo-badge", `-${item.promoPercent}%`),
      createElement("s", "price-old", formatPrice(item.price)),
      createElement("span", "price-new", formatPrice(promoPrice))
    );
    card.append(priceBox);
  } else {
    card.append(
      createElement("p", "item-price", formatPrice(item.price))
    );
  }

  return card;
}

/*
 * Формує категорії та картки страв.
 *
 * Порядок категорій — як в експорті QR-MM.
 * Усередині категорії враховується SORT_ORDER.
 */
function renderMenu() {
  const labels = TEXT[currentLanguage];

  document.documentElement.lang = currentLanguage;

  elements.title.textContent = labels.title;
  elements.description.textContent = labels.description;
  elements.globalNotice.textContent = labels.spicyNote;
  elements.search.placeholder = labels.search;
  elements.search.setAttribute("aria-label", labels.search);
  elements.toTop.setAttribute("aria-label", labels.toTop);
  elements.toTop.title = labels.toTop;
  document.title = labels.pageTitle;

  const metaDescription = document.querySelector('meta[name="description"]');

  if (metaDescription) {
    metaDescription.setAttribute("content", labels.description + " SUSHI & CHILL, Stefana Czarnieckiego 15.");
  }

  for (const button of elements.languageButtons) {
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.lang === currentLanguage)
    );
  }

  clearNode(elements.categoryNavigation);
  clearNode(elements.content);

  if (menuItems.length === 0) {
    elements.content.append(
      createElement(
        "p",
        "status-message",
        labels.empty
      )
    );

    return;
  }

  const visibleItems = searchTerm
    ? menuItems.filter((item) => getSearchText(item).indexOf(searchTerm) !== -1)
    : menuItems;

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

  let categoryIndex = 0;

  for (const [category, items] of categories) {
    categoryIndex += 1;

    const sectionId = `category-${categoryIndex}`;

    const link = createElement(
      "a",
      "category-link",
      category
    );

    link.href = `#${sectionId}`;

    elements.categoryNavigation.append(link);

    const section = createElement(
      "section",
      "category-section"
    );

    section.id = sectionId;

    section.append(
      createElement(
        "h2",
        "category-title",
        category
      )
    );

    if (/^futomaki/i.test(category)) {
      section.append(
        createElement("p", "notice category-notice", labels.friedNote)
      );
    }

    const grid = createElement("div", "menu-grid");

    for (const item of items) {
      grid.append(renderItem(item));
    }

    section.append(grid);
    elements.content.append(section);
  }
}

/*
 * Змінює мову та зберігає вибір у браузері.
 */
function setLanguage(language) {
  if (!LANGUAGES.has(language)) {
    return;
  }

  currentLanguage = language;

  try {
    localStorage.setItem(
      "qr-menu-language",
      currentLanguage
    );
  } catch (error) {
    // Перемикання працює навіть без localStorage.
  }

  renderMenu();
}

/*
 * Завантажує JSON з сервера.
 */
async function loadMenu() {
  elements.content.setAttribute("aria-busy", "true");

  showMessage("status-message", TEXT[currentLanguage].loading);

  try {
    const response = await fetch(MENU_URL, {
      cache: "no-cache",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Menu request failed: HTTP ${response.status}`
      );
    }

    const data = await response.json();

    menuItems = normalizeMenu(data);
    updateStructuredData();

    renderMenu();
  } catch (error) {
    console.error("QR-menu loading error:", error);

    clearNode(elements.categoryNavigation);

    showMessage("error-message", TEXT[currentLanguage].error);
  } finally {
    elements.content.setAttribute("aria-busy", "false");
  }
}

/*
 * Обробники кнопок перемикання мов.
 */
for (const button of elements.languageButtons) {
  button.addEventListener("click", () => {
    setLanguage(button.dataset.lang);
  });
}

/*
 * Відновлення мови після перезавантаження.
 */
try {
  const savedLanguage = localStorage.getItem(
    "qr-menu-language"
  );

  if (savedLanguage && LANGUAGES.has(savedLanguage)) {
    currentLanguage = savedLanguage;
  }
} catch (error) {
  currentLanguage = DEFAULT_LANGUAGE;
}

/*
 * Горизонтальна навігація категоріями:
 * колесо миші, перетягування мишею, підсвітка активної категорії.
 * Дотик працює нативно (overflow-x: auto).
 */
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
      const isActive = i === activeIndex;

      if (isActive !== links[i].classList.contains("is-active")) {
        links[i].classList.toggle("is-active", isActive);

        if (isActive && !dragging) {
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
}

elements.search.addEventListener("input", () => {
  searchTerm = normalizeSearch(elements.search.value.trim());
  renderMenu();
});

window.addEventListener("scroll", () => {
  elements.toTop.classList.toggle("is-visible", window.pageYOffset > 600);
});

elements.toTop.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

/*
 * Запуск.
 */
initNavigationScroll();
loadMenu();
