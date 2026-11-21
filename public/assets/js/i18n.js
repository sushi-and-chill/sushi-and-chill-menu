"use strict";

/*
 * Тексти інтерфейсу (PL / UK / EN).
 * Файл читають і браузер, і tools/build.mjs (для <title>, description, hreflang).
 * Назви страв, описи й ціни беруться з data/menu.json, а не звідси.
 */
window.QR_I18N = {
  pl: {
    locale: "pl-PL",
    ogLocale: "pl_PL",
    langName: "Polski",
    path: "/menu/",
    // <head>
    pageTitle: "Menu sushi Wrocław — ceny i alergeny | SUSHI & CHILL",
    metaDescription:
      "Menu SUSHI & CHILL we Wrocławiu: Zamawiaj zawsze świeże i pyszne sushi burgery, wege sushi, california, filadelfia, futomaki, uromaki, hosomaki, nigiri, sushi zestawy, pszekąski i zupy miso. Ceny, gramatura i alergeny. Stefana Czarnieckiego 15, Sczepin",
    ogDescription: "Sushi we Wrocławiu. Smak, o którym będziesz marzyć cały czas.",
    // widoczny interfejs
    skip: "Przejdź do menu",
    tagline: "Smak, o którym będziesz marzyć cały czas",
    contact: "Kontakt",
    language: "Język",
    address: "Wrocław, Stefana Czarnieckiego 15",
    title: "Menu SUSHI & CHILL",
    description: `Tworzymy własną markę sushi, stawiając na jakość, świeżość składników i wyjątkowy smak. Każde zamówienie przygotowujemy z dbałością o szczegóły, ponieważ zależy nam nie tylko na pysznym sushi, ale przede wszystkim na zadowoleniu naszych klientów.
Oferujemy smaczne sushi na wynos i z dostawą. Cenimy zaufanie, dlatego każdego dnia staramy się, aby nasi goście chętnie do nas wracali.
Nie znalazłeś idealnego połączenia w naszym menu? Zadzwoń do nas, a z przyjemnością przygotujemy rolkę lub zestaw według Twoich upodobań — z wybranych przez Ciebie składników i smaków!`,
    spicyNote: "Wszystkie dania mogą być na ostro na życzenie +2 zł",
    friedNote: "",
    infoLine: "Ceny brutto w zł. Zdjęcia mają charakter poglądowy.",
    allergenSummary: "Alergie pokarmowe — ważne informacje",
    allergenNote:
      "Informacje o alergenach należy każdorazowo potwierdzić na podstawie aktualnej receptury i specyfikacji użytych produktów. Jeśli masz alergię lub nietolerancję, skontaktuj się z obsługą przed złożeniem zamówienia.",
    ingredientNotice:
      "Lista składników przy daniach jest skróconą listą składników.",
    allergenListTitle: "14 alergenów wg rozporządzenia UE 1169/2011:",
    allergenList:
      "zboża zawierające gluten, skorupiaki, jaja, ryby, orzeszki ziemne, soja, mleko, orzechy (np. migdały, laskowe, włoskie), seler, gorczyca, sezam, dwutlenek siarki i siarczyny, łubin, mięczaki.",
    loading: "Ładowanie menu…",
    empty: "Menu jest chwilowo niedostępne.",
    error: "Nie udało się załadować menu. Spróbuj ponownie później.",
    noscript: "Włącz JavaScript, aby wyszukiwać dania. Pełne menu jest poniżej.",
    search: "Szukaj dania lub składnika…",
    noResults: "Brak wyników. Spróbuj innej frazy.",
    results: "Znaleziono dań: ",
    categories: "Kategorie menu",
    toTop: "Do góry",
    pieces: "szt.",
    grams: "g",
    ml: "ml",
    ingredients: "Składniki",
    allergens: "Alergeny",
    mayContain: "Możliwa obecność",
    noAllergens: "nie wskazano",
    currency: "zł",
    footerLegalName: "Dane firmy",
    nip: "NIP",
    shareCapital: "Kapitał zakładowy:",
    hoursTitle: "Godziny otwarcia",
    daily: "Codziennie",
    days: ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"],
  },

  uk: {
    locale: "uk-UA",
    ogLocale: "uk_UA",
    langName: "Українська",
    path: "/menu/ua/",
    pageTitle: "Меню суші Вроцлав — ціни та алергени | SUSHI & CHILL",
    metaDescription:
      "Меню SUSHI & CHILL у Вроцлаві: Замовляйте завжди свіжі та смачні суші-бургери, веге суші, каліфорнія, філадельфія, футомакі, уромакі, хосомакі, нігірі, суші сети, закуски та місо-супи. Ціни, вага й алергени. Stefana Czarnieckiego 15, Szczepin",
    ogDescription: "Суші у Вроцлаві. Смак, про який ти мріятимеш постійно.",
    skip: "Перейти до меню",
    tagline: "Смак, про який ти мріятимеш постійно",
    contact: "Контакти",
    language: "Мова",
    address: "Вроцлав, Stefana Czarnieckiego 15",
    title: "Меню SUSHI & CHILL",
    description: `Ми створюємо власний бренд суші, приділяючи особливу увагу якості, свіжості інгредієнтів та винятковому смаку.
    Готуємо кожне замовлення з увагою до найдрібніших деталей, адже для нас важливі не лише смачні суші, а насамперед задоволення наших клієнтів.
    Ми пропонуємо смачні суші на винос та з доставкою. Ми цінуємо вашу довіру, тому щодня прагнемо, щоб наші гості із задоволенням поверталися до нас.
    Не можете знайти ідеальне поєднання в нашому меню? Зателефонуйте нам, і ми з радістю приготуємо для вас рол або сет`,
    spicyNote: "Усі страви можна замовити гострими за бажанням +2 zł",
    friedNote: "",
    infoLine: "Ціни брутто, у zł. Фото мають ілюстративний характер.",
    allergenSummary: "Харчова алергія — важлива інформація",
    allergenNote:
      "Інформацію про алергени необхідно щоразу перевіряти за актуальною рецептурою та специфікаціями використаних продуктів. Якщо маєте алергію або непереносимість, зв’яжіться з персоналом до оформлення замовлення.",
    ingredientNotice:
      "Список інгредієнтів до страв — це скорочений перелік інгредієнтів.",
    allergenListTitle: "14 алергенів за регламентом ЄС 1169/2011:",
    allergenList:
      "злаки з глютеном, ракоподібні, яйця, риба, арахіс, соя, молоко, горіхи (мигдаль, фундук, волоський тощо), селера, гірчиця, кунжут, діоксид сірки та сульфіти, люпин, молюски.",
    loading: "Завантаження меню…",
    empty: "Меню тимчасово недоступне.",
    error: "Не вдалося завантажити меню. Спробуйте пізніше.",
    noscript: "Увімкніть JavaScript, щоб шукати страви. Повне меню нижче.",
    search: "Пошук страви або інгредієнта…",
    noResults: "Нічого не знайдено. Спробуйте інший запит.",
    results: "Знайдено страв: ",
    categories: "Категорії меню",
    toTop: "Нагору",
    pieces: "шт.",
    grams: "г",
    ml: "мл",
    ingredients: "Складники",
    allergens: "Алергени",
    mayContain: "Можлива присутність",
    noAllergens: "не зазначено",
    currency: "zł",
    footerLegalName: "Дані компанії",
    nip: "NIP",
    shareCapital: "Статутний капітал:",
    hoursTitle: "Графік роботи",
    daily: "Щодня",
    days: ["Понеділок", "Вівторок", "Середа", "Четвер", "Пʼятниця", "Субота", "Неділя"],
  },

  en: {
    locale: "en-GB",
    ogLocale: "en_GB",
    langName: "English",
    path: "/menu/en/",
    pageTitle: "Sushi menu Wroclaw — prices & allergens | SUSHI & CHILL",
    metaDescription:
      "SUSHI & CHILL Menu in Wrocław: Order always fresh and delicious sushi burgers, vegetarian sushi, California rolls, Philadelphia rolls, futomaki, uromaki, hosomaki, nigiri, sushi sets, appetizers, and miso soup. Prices, weight, and allergens. 15 Stefana Czarnieckiego Street, Sczepin",
    ogDescription: "Sushi in Wrocław. A taste you will keep dreaming about.",
    skip: "Skip to menu",
    tagline: "A taste you will keep dreaming about",
    contact: "Contact",
    language: "Language",
    address: "Wrocław, Stefana Czarnieckiego 15",
    title: "SUSHI & CHILL Menu",
    description: `We’re building our own sushi brand, focusing on quality, fresh ingredients, and exceptional flavor. We prepare every order with attention to detail, because we care not only about delicious sushi, but above all about our customers’ satisfaction.
We offer delicious sushi for takeout and delivery. We value your trust, which is why we strive every day to ensure our guests are happy to return.
Can’t find the perfect combination on our menu? Give us a call, and we’ll be happy to prepare a roll or set for you`,
    spicyNote: "Any dish can be made spicy on request +2 zł",
    friedNote: "",
    infoLine: "Prices in zł, VAT included. Photos are illustrative.",
    allergenSummary: "Food allergies — important information",
    allergenNote:
      "Allergen information must be checked against the current recipe and specifications for the products used. If you have an allergy or intolerance, contact our staff before ordering.",
    ingredientNotice:
      "The list of ingredients for dishes is a condensed list of ingredients.",
    allergenListTitle: "The 14 allergens under EU Regulation 1169/2011:",
    allergenList:
      "cereals containing gluten, crustaceans, eggs, fish, peanuts, soybeans, milk, tree nuts (e.g. almonds, hazelnuts, walnuts), celery, mustard, sesame, sulphur dioxide and sulphites, lupin, molluscs.",
    loading: "Loading menu…",
    empty: "The menu is temporarily unavailable.",
    error: "Could not load the menu. Please try again later.",
    noscript: "Turn on JavaScript to search dishes. The full menu is below.",
    search: "Search dishes or ingredients…",
    noResults: "No results. Try a different search.",
    results: "Dishes found: ",
    categories: "Menu categories",
    toTop: "Back to top",
    pieces: "pcs",
    grams: "g",
    ml: "ml",
    ingredients: "Selected ingredients",
    allergens: "Allergens",
    mayContain: "Possible presence",
    noAllergens: "not specified in the data",
    currency: "zł",
    footerLegalName: "Company details",
    nip: "NIP",
    shareCapital: "Share capital:",
    hoursTitle: "Opening hours",
    daily: "Every day",
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  },
};
