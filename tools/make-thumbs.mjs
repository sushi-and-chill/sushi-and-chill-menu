/*
 * Легкі копії фото для телефонів:  npm run images
 *
 * Для кожного public/assets/images/menu/<id>.webp ширше за 900 px створює
 * public/assets/images/menu/sm/<id>.webp шириною 800 px. Браузер сам обирає
 * менший файл через srcset (build.mjs додає його у HTML), а при наведенні
 * курсора / тапі на фото відкривається оригінал у повному розмірі.
 *
 * Уже готові копії не перезаписуються (перевіряється час зміни), тому
 * повторний запуск швидкий. Нові фото просто покладіть у images/menu/ і
 * запустіть  npm run build  (він викликає цей скрипт автоматично).
 */
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "public/assets/images/menu");
const target = join(source, "sm");

const SMALL_WIDTH = 800; // ширина копії
const MIN_ORIGINAL_WIDTH = 900; // вужчі оригінали не зменшуємо — виграш замалий

mkdirSync(target, { recursive: true });

let created = 0;
let skipped = 0;

for (const name of readdirSync(source)) {
  if (!/\.webp$/i.test(name)) continue;

  const from = join(source, name);
  const to = join(target, name);

  if (existsSync(to) && statSync(to).mtimeMs >= statSync(from).mtimeMs) {
    skipped += 1;
    continue;
  }

  const { width } = await sharp(from).metadata();

  if (!width || width <= MIN_ORIGINAL_WIDTH) {
    skipped += 1;
    continue;
  }

  await sharp(from)
    .resize({ width: SMALL_WIDTH, withoutEnlargement: true })
    .webp({ quality: 80, effort: 6 })
    .toFile(to);
  created += 1;
}

console.log(`✓ мініатюри: створено ${created}, пропущено ${skipped}`);
