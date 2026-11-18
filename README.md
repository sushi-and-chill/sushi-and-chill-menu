# SUSHI & CHILL — QR Menu

Statyczne, wielojęzyczne QR-menu (PL / UK / EN) dla SUSHI & CHILL. Strony są prerenderowane do HTML na etapie build, a źródłem pozycji menu jest `public/data/menu.json`.

## Wymagania

- Node.js 20.9 lub nowszy (zalecane Node.js 24 LTS)
- npm
- Python 3 (лише для локального HTTP-сервера через `npm run serve`)

## Установка і запуск

```bash
npm ci
npm run audit
npm run build
npm run serve
```

Відкрити `http://localhost:8000/menu/`.

## Редагування текстів і категорій

Інструкція з точними шляхами до файлів: `docs/EDYCJA-TRESCI.md`. Коротко: назви категорій змінюються в `public/data/menu.json` (поле `KATEGORIJA`), пояснення під ними — у `public/data/category-notes.json`, тексти попереджень та інтерфейсу — у `public/assets/js/i18n.js`, а реквізити/контакти/години — у `tools/site.config.json`. Не редагуйте згенеровані HTML-файли напряму.

## Основні файли

- `public/data/menu.json` — позиції, ціни, скорочені переліки вибраних складників та поточні записи алергенів.
- `public/data/category-notes.json` — примітки до категорій.
- `public/assets/js/app.js` — рендер карток, пошук, категорії, мовна логіка та показ алергенів.
- `public/assets/js/i18n.js` — переклади інтерфейсу.
- `public/assets/css/style.css` — стилі.
- `tools/site.config.json` — домен, контакти, адреса, години роботи та реквізити компанії.
- `tools/build.mjs` — prerender PL/UA/EN, JSON-LD, canonical, hreflang, sitemap і robots.
- `tools/audit.mjs` — перевірка структури та попередження про записи, що потребують ручної перевірки.
- `docs/PLAN-POPRAWY-I-CHECKLISTA-PL.md` — детальний план технічних і юридичних наступних кроків.

## Важливо про склад і алергени

Поточні `INGR. GRAMY` — скорочені списки вибраних складників, а не повний перелік інгредієнтів. Вони так і позначаються в інтерфейсі. Наявні алергенні дані не були доповнені припущеннями. Перед використанням меню як повного джерела інформації необхідно звірити кожну позицію з технологічними картами та актуальними специфікаціями постачальників, а також забезпечити повний перелік у польській мові, доступний клієнтам у закладі до замовлення. Див. `docs/PLAN-POPRAWY-I-CHECKLISTA-PL.md`.

## Деплой на Cloudflare Pages

Після перевірок опублікувати вміст `public/` звичайною командою проєкту, наприклад:

```bash
npx wrangler pages deploy public --project-name sushi-and-chill-menu
```

Не публікувати архів або каталог проєкту цілком як сайт; Cloudflare Pages має отримати каталог `public/`.
