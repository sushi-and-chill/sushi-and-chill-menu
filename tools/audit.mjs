/*
 * Перевірка даних меню перед публікацією:  npm run audit
 * Нічого не змінює, лише виводить попередження.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const { items } = JSON.parse(readFileSync(join(root, "data/menu.json"), "utf8"));
const known = new Set([
  "ryby", "soja", "mleko", "gluten", "jaja", "sezam", "skorupiaki", "mięczaki",
  "gorczyca", "seler", "łubin", "siarczyny", "dwutlenek siarki",
  "orzeszki ziemne / orzechy", "orzechy ziemne", "orzeszki ziemne", "orzechy", "—",
]);
const warnings = [];
const warn = (item, text) => warnings.push(`[${item.ID}] ${item.NAZWA}: ${text}`);
const seen = new Set();

for (const item of items) {
  if (seen.has(item.ID)) warn(item, "дублікат ID");
  seen.add(item.ID);

  for (const field of ["NAZWA", "UKR_NAZWA", "ENG_NAZWA", "OPIS_PL", "OPIS_UKR", "OPIS_ENG", "WAGA DANIA", "SZT", "ALERGEN"]) {
    if (!String(item[field] ?? "").trim()) warn(item, `порожнє поле ${field}`);
  }

  const price = Number(String(item["CENA PLN"]).replace(",", "."));
  if (!Number.isFinite(price) || price <= 0) warn(item, `некоректна ціна "${item["CENA PLN"]}"`);

  const image = item.IMAGE || `${item.ID}.webp`;
  if (!item.IMAGE) warn(item, "немає фото (IMAGE)");
  else if (!existsSync(join(root, "assets/images/menu", image)) && !existsSync(join(root, "assets/images/menu", `${item.ID}.webp`)))
    warn(item, `файл фото не знайдено: ${image}`);

  for (const part of String(item.ALERGEN ?? "").split(",")) {
    const key = part.trim().toLowerCase();
    if (key && !known.has(key)) warn(item, `невідомий алерген "${part.trim()}" (додайте переклад у app.js)`);
  }
}

if (warnings.length) {
  console.log(`Знайдено попереджень: ${warnings.length}\n`);
  console.log(warnings.join("\n"));
} else {
  console.log("Проблем не знайдено.");
}
