# QR-menu — SUSHI & CHILL

Публічне меню ресторану: статичний сайт (HTML + CSS + vanilla JS + JSON), без сервера й бази даних.

## Структура

```
QR-menu/
├── README.md
└── public/                    <- корінь публікації (Cloudflare Pages)
    ├── 404.html
    ├── _headers               <- заголовки безпеки та кеш
    ├── _redirects             <- "/" -> "/menu/"
    ├── menu/index.html        <- сторінка меню (URL: /menu/)
    ├── data/menu.json         <- експорт з QR-MM (schema_version 1)
    └── assets/
        ├── css/style.css
        ├── js/app.js
        └── images/
            ├── logo.png
            └── menu/          <- фото страв (файли з поля IMAGE)
```

## Деплой на Cloudflare Pages

1. Завантажити проєкт у Git-репозиторій (наприклад, `sushi-chill-menu`).
2. Cloudflare → Workers & Pages → Create → Pages → Connect to Git.
3. Framework preset: None. Build command: порожньо. **Build output directory: `public`**.
4. Після деплою перевірити `https://<проєкт>.pages.dev/menu/`.
5. Свій домен: Pages → Custom domains. QR-код має вести на `https://sushichill.pl/menu/`.

## Оновлення меню

- Нове меню: замінити `public/data/menu.json` експортом з QR-MM і задеплоїти. Відвідувачі побачать зміни протягом ~5 хв (кеш `/data/*`).
- Фото: файли `.webp` у `public/assets/images/menu/`. Сайт шукає `<ID>.webp` (наприклад `101.webp`), потім ім'я з поля `IMAGE` (`101-ee7588e2.webp`). Якщо файлу немає, страва показується без фото.
- Інгредієнти (`INGR. GRAMY`) на сайті показуються лише назвами, без грамів, у спойлері. Грамовка лишається в QR-MM.
- SEO: `canonical`, Open Graph, `robots.txt`, `sitemap.xml` та schema.org (Restaurant + Menu) налаштовані на `https://sushichill.pl/menu/`. Якщо домен буде іншим, замінити його в `menu/index.html`, `robots.txt`, `sitemap.xml`.

## Поля JSON, які використовує сайт

`ID`, `KATEGORIJA`, `NAZWA`, `UKR_NAZWA`, `ENG_NAZWA`, `OPIS_PL/UKR/ENG`, `WAGA DANIA`, `SZT`, `CENA PLN` (або `CENA_PLN`), `INGR. GRAMY`, `ALERGEN`, `ACTIVE`, `SORT_ORDER`, `IMAGE`, `PROMO`, `%PROMO`.

- Порядок категорій — за найменшим `SORT_ORDER` у категорії.
- `PROMO = true` і `%PROMO` > 0: показується знижка (стара ціна закреслена, нова = `CENA PLN` мінус `%PROMO`).

## Локальний запуск

```bash
cd QR-menu
python3 -m http.server 8000 --directory public
```

Відкрити http://localhost:8000/menu/
