/*
 * Staticzne sprawdzenie danych menu przed publikacją.
 * npm run audit
 * Błędy strukturalne kończą się kodem 1. Ostrzeżenia wymagają ręcznej
 * weryfikacji receptur/dokumentów i nie są automatycznie poprawiane.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicRoot = join(projectRoot, "public");
const config = JSON.parse(readFileSync(join(projectRoot, "tools/site.config.json"), "utf8"));
const menuData = JSON.parse(readFileSync(join(publicRoot, "data/menu.json"), "utf8"));
const items = Array.isArray(menuData.items) ? menuData.items : [];
const errors = [];
const warnings = [];
const seenIds = new Set();

const error = (item, message) => errors.push(`[${item?.ID ?? "GLOBAL"}] ${item?.NAZWA ?? ""}: ${message}`);
const warn = (item, message) => warnings.push(`[${item?.ID ?? "GLOBAL"}] ${item?.NAZWA ?? ""}: ${message}`);
const norm = (value) => String(value ?? "").trim().toLocaleLowerCase("pl-PL").replace(/[.!;:]+$/g, "").replace(/\s+/g, " ");
const allergens = new Set([
  "gluten", "zboża zawierające gluten", "skorupiaki", "jaja", "ryby", "orzeszki ziemne",
  "soja", "soje", "soję", "mleko", "orzechy", "seler", "gorczyca", "gorczycę", "sezam", "siarczyny",
  "dwutlenek siarki", "dwutlenek siarki i siarczyny", "łubin", "mięczaki",
  "orzeszki ziemne / orzechy",
]);
const noAllergen = new Set(["-", "—", "–", "brak", "none", "немає"]);

if (menuData.schema_version !== 1) error(null, `Nieobsługiwana schema_version: ${menuData.schema_version}`);
if (!items.length) error(null, "Menu nie zawiera żadnych pozycji.");
warn(null, "INGR. GRAMY zawiera skrócone listy wybranych składników; nie są one pełnym wykazem składników wymaganym dla dań gastronomicznych.");
if (!/^https:\/\//.test(config.origin ?? "")) error(null, "tools/site.config.json: origin musi być adresem HTTPS.");
if (!config.legal?.companyName || !config.legal?.address || !config.legal?.nip || !config.legal?.email) {
  warn(null, "Niekompletne podstawowe dane firmy w site.config.json.");
}
for (const field of ["krs", "registryCourt", "shareCapitalPLN"]) {
  if (!config.legal?.[field]) warn(null, `Brak legal.${field}; zweryfikować i uzupełnić zgodnie z art. 206 KSH.`);
}

for (const item of items) {
  const id = String(item.ID ?? "").trim();
  if (!id) error(item, "Brak ID.");
  if (seenIds.has(id)) error(item, "Powielone ID.");
  seenIds.add(id);

  for (const field of ["NAZWA", "UKR_NAZWA", "ENG_NAZWA", "OPIS_PL", "OPIS_UKR", "OPIS_ENG", "KATEGORIJA"]) {
    if (!String(item[field] ?? "").trim()) warn(item, `Puste pole ${field}.`);
  }

  const price = Number(String(item["CENA PLN"] ?? "").replace(",", "."));
  if (!Number.isFinite(price) || price <= 0) error(item, `Nieprawidłowa cena: ${item["CENA PLN"]}`);

  const weight = String(item["WAGA DANIA"] ?? "").trim();
  const pieces = Number(item.SZT);
  if (!weight && (!Number.isFinite(pieces) || pieces <= 0)) warn(item, "Brak gramatury i liczby sztuk.");

  const image = String(item.IMAGE || `${id}.webp`).trim();
  if (!image || image.includes("..") || image.includes("/") || image.includes("\\")) {
    error(item, `Niebezpieczna lub nieprawidłowa nazwa pliku IMAGE: ${image}`);
  } else if (!existsSync(join(publicRoot, "assets/images/menu", image))) {
    warn(item, `Brak zdjęcia: ${image}; karta menu zostanie wyświetlona bez fotografii.`);
  }

  if (!String(item["INGR. GRAMY"] ?? "").trim()) {
    warn(item, "Brak nawet skróconej listy wybranych składników.");
  }

  const rawAllergens = String(item.ALERGEN ?? "").replace(/\r/g, "").replace(/\n/g, ",");
  if (!rawAllergens.trim()) {
    warn(item, "Brak danych o alergenach — nie wolno interpretować tego jako potwierdzenia braku alergenów.");
    continue;
  }
  const marker = /może\s+zawierać\s*:?|moze\s+zawierac\s*:?/i;
  const match = rawAllergens.match(marker);
  const declaredText = match ? rawAllergens.slice(0, match.index) : rawAllergens;
  const possibleText = match ? rawAllergens.slice(match.index + match[0].length) : "";
  const tokens = declaredText.split(/[,;]+/).map(norm).filter(Boolean);
  const possibleTokens = possibleText.split(/[,;]+/).map(norm).filter(Boolean);

  if (tokens.length === 1 && noAllergen.has(tokens[0])) {
    warn(item, 'ALERGEN zawiera znak „brak”. Zweryfikować recepturę i specyfikacje dostawców przed publikacją takiej deklaracji.');
  }
  for (const token of [...tokens, ...possibleTokens]) {
    if (!allergens.has(token) && !noAllergen.has(token)) warn(item, `Nieznana nazwa alergenu lub zapis wymagający normalizacji: „${token}”.`);
  }
  if (tokens.includes("orzeszki ziemne / orzechy")) {
    warn(item, "Niejednoznaczny zapis „orzeszki ziemne / orzechy”: ustalić osobno arachidy i konkretny rodzaj orzechów na podstawie receptury/specyfikacji.");
  }
  if (tokens.includes("orzechy")) {
    warn(item, "Ogólny zapis „orzechy” nie identyfikuje rodzaju orzecha; sprawdzić, czy należy podać np. migdały/laskowe/włoskie.");
  }
  if (tokens.includes("soje")) warn(item, 'Literówka „soje” — w interfejsie normalizowana do „soja”; poprawić również źródło danych po weryfikacji.');
}

console.log(`Pozycji menu: ${items.length}`);
console.log(`Błędy strukturalne: ${errors.length}`);
console.log(`Ostrzeżenia do ręcznej weryfikacji: ${warnings.length}`);
if (errors.length) console.error(`\nBŁĘDY:\n${errors.join("\n")}`);
if (warnings.length) console.warn(`\nOSTRZEŻENIA:\n${warnings.join("\n")}`);
if (warnings.length) {
  console.warn("\nUwaga: audyt techniczny nie potwierdza zgodności receptur ani alergenów. Dane muszą być porównane z kartami technologicznymi i specyfikacjami dostawców.");
}
if (errors.length) process.exitCode = 1;
else console.log("\nKontrola struktury zakończona. Ostrzeżenia wymagają rozstrzygnięcia przez właściciela receptur.");
