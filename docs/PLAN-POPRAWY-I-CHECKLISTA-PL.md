# SUSHI & CHILL QR Menu — plan poprawek i lista zgodności

Wersja dokumentu: 18.11.2026  
Zakres: statyczna strona informacyjna QR-menu; bez koszyka, składania zamówień, płatności, kont użytkowników i formularzy.

## 1. Najważniejsze ustalenia

1. Dane `INGR. GRAMY` w aktualnym `public/data/menu.json` są skróconymi listami wybranych składników. Nie są pełnym wykazem składników.
2. Z tego powodu interfejs nazywa je teraz „Wybrane składniki” / „Вибрані складники” / „Selected ingredients” i pokazuje wyraźne zastrzeżenie. Nie dopisano brakujących składników ani alergenów na podstawie domysłów.
3. Pole `ALERGEN` zawiera historyczne, niejednolite wpisy. Interfejs rozdziela tekst `Może zawierać...` od listy alergenów deklarowanych, normalizuje oczywiste warianty pisowni i nie traktuje znaku `-` jako potwierdzenia, że potrawa nie zawiera alergenów.
4. Zapis `orzeszki ziemne / orzechy` pozostaje oznaczony jako niejednoznaczny. Nie można automatycznie stwierdzić, czy chodzi o arachidy, konkretny rodzaj orzechów, czy oba składniki.
5. Kanoniczny host w konfiguracji zmieniono na `https://menu.sushi-and-chill.pl`, zgodnie z informacją właściciela, że ten host działa. Ścieżki menu pozostają `/menu/`, `/menu/ua/`, `/menu/en/`; `/` przekierowuje na `/menu/` regułą Cloudflare.
6. W danych firmy dodano opcjonalne pola `krs`, `registryCourt`, `shareCapitalPLN`. Nie wypełniono ich bez potwierdzonych danych. Audyt zgłasza ich brak.

## 2. Priorytet P0 — przed publicznym użyciem jako źródła informacji o składzie

### 2.1. Przygotować pełne karty składników dla wszystkich 108 aktywnych pozycji

Dla każdej potrawy należy zebrać:
- pełny wykaz wszystkich składników w kolejności malejącej według masy w chwili użycia do produkcji;
- skład każdego składnika złożonego (np. sosów, panierki/tempury, surimi, kimchi, marynat, majonezów, produktów gotowych);
- specyfikacje producentów/dostawców i aktualne etykiety produktów;
- rodzaj orzechów, jeśli występują (np. migdały, orzechy laskowe, włoskie), zamiast ogólnego słowa „orzechy”;
- informację o składnikach alergennych i ich pochodnych, jeśli pozostają w produkcie końcowym;
- ilości procentowe składników, gdy przepisy wymagają ich podania (np. składnik podkreślony w nazwie lub istotny dla charakterystyki potrawy — ocenić indywidualnie).

Nie kopiować jednego składu sosu do wszystkich pozycji bez potwierdzenia, że używany jest dokładnie ten sam produkt i ta sama receptura.

### 2.2. Uzgodnić alergeny

- Zweryfikować każdy alergen z pełną recepturą i specyfikacją dostawcy.
- Rozdzielić arachidy od orzechów z drzewa oraz wskazać konkretny rodzaj orzecha.
- Potwierdzić, czy wpisy „Może zawierać” wynikają z oceny ryzyka zanieczyszczenia krzyżowego u dostawcy lub w lokalu. Nie stosować ostrzeżenia prewencyjnego automatycznie do wszystkich dań.
- Wykonać ocenę ryzyka kontaktu krzyżowego na wspólnym sprzęcie, deskach, nożach, fryturze, pojemnikach i stanowiskach.
- Ustalić procedurę aktualizacji danych po zmianie dostawcy, produktu, receptury lub procesu.

### 2.3. Zapewnić informację na miejscu

QR-menu może być wygodnym kanałem dodatkowym, ale nie należy zakładać, że sam kod QR/strona WWW zawsze wystarcza jako jedyny sposób udostępnienia pełnego składu klientom w lokalu. Oficjalne materiały IJHARS wskazują na potrzebę bezpośrednio dostępnej informacji w lokalu i ostrzegają przed używaniem strony WWW/aplikacji/QR jako jedynego źródła. GIS dopuszcza elektroniczne wyświetlacze/katalogi, jeżeli informacja jest łatwo dostępna bez pośrednictwa pracownika. Bezpieczne rozwiązanie operacyjne: pełny, aktualny wykaz w widocznym, łatwo dostępnym katalogu/segregatorze lub na ekranie w lokalu oraz QR-menu jako kopia dodatkowa. Treść powinna być dostępna przed złożeniem zamówienia i po polsku.

## 3. Priorytet P1 — informacje handlowe i firmowe

### 3.1. Dane spółki

Na stronie spółki z o.o. należy zweryfikować komplet danych wymaganych przez art. 206 Kodeksu spółek handlowych:
- pełna firma spółki;
- siedziba i adres;
- oznaczenie sądu rejestrowego;
- numer KRS;
- NIP;
- wysokość kapitału zakładowego;
- oznaczenie grupy spółek — jeżeli dotyczy.

W `tools/site.config.json` pozostawiono pola `krs`, `registryCourt`, `shareCapitalPLN` puste, ponieważ nie można ich bezpiecznie ustalić z samego archiwum. Uzupełnić wyłącznie na podstawie aktualnego odpisu KRS/umowy spółki. Po uzupełnieniu `npm run build` umieści je w stopce.

### 3.2. Ceny i dopłaty

- Potwierdzić, że ceny prezentowane w menu są aktualne i zawierają VAT.
- Opisać jasno, do jakiej jednostki odnosi się dopłata +2 zł za ostrą wersję i +3 zł za smażenie futomaki (za danie/porcję/rolkę — zgodnie z rzeczywistą praktyką).
- Jeżeli istnieją dodatkowe opłaty za opakowanie lub dostawę, ujawniać je przed złożeniem zamówienia w odpowiednim kanale sprzedaży.
- Sprawdzić, czy zdjęcia są poglądowe, aktualne i nie wprowadzają w błąd co do wielkości lub składu porcji.

### 3.3. Zakres prawny strony

Obecnie strona jest tylko informacyjnym menu. Nie dodawać automatycznie regulaminu sklepu, polityki zwrotów ani checkoutu, których faktycznie nie ma.
- Dane identyfikacyjne usługodawcy i adres e-mail powinny być łatwo dostępne.
- Jeżeli zostaną dodane formularze, analityka, piksele reklamowe, mapy osadzone, newsletter lub inne narzędzia śledzące, ponownie ocenić obowiązki RODO/cookies i wdrożyć odpowiednie informacje/zgody.
- Jeśli w przyszłości strona przyjmie zamówienia lub płatności, wykonać osobny audyt praw konsumenta, informacji przedumownych, reklamacji, dostawy i płatności.

## 4. Priorytet P1 — SEO i domena

- `origin` w `tools/site.config.json` wskazuje teraz `https://menu.sushi-and-chill.pl`.
- Canonical, hreflang, Open Graph, JSON-LD, robots.txt i sitemap są generowane z jednego źródła konfiguracji.
- `og:type` zmieniono na standardowe `website`.
- Identyfikator `Restaurant` jest stabilny: `https://menu.sushi-and-chill.pl/#restaurant`.
- Nie dodawano współrzędnych geograficznych, godzin, metod płatności ani danych, których nie było w konfiguracji.
- Po wdrożeniu sprawdzić ręcznie: HTTP 200 dla trzech wersji, przekierowanie `/` → `/menu/`, poprawny TLS, brak pętli przekierowań, dostępność `/robots.txt` i `/sitemap.xml`.
- W Google Search Console dodać właściwość domeny i przesłać `https://menu.sushi-and-chill.pl/sitemap.xml`. Sprawdzić URL Inspection dla wszystkich trzech wersji.
- Stary host `sushi-and-chill.pl` nie powinien pozostać alternatywną, niezależną kopią treści. Jeżeli był wcześniej indeksowany, skonfigurować trwałe przekierowanie 301 do nowego hosta albo pozostawić go wyłączonym; nie utrzymywać dwóch wersji z różnymi canonical.

## 5. Priorytet P2 — dostępność i technika

- Sprawdzić kontrast tekstu, fokus klawiatury, obsługę czytnika ekranu i powiększenie 200%.
- Sprawdzić wszystkie trzy wersje językowe na małych ekranach.
- Przetestować wyszukiwanie, filtry kategorii, powiększenie zdjęć i działanie bez JavaScript.
- Sprawdzić błędy CSP w DevTools po wdrożeniu.
- Sprawdzić, czy nagłówki `_headers` rzeczywiście działają na Cloudflare Pages.
- Utrzymywać obrazy WebP i kontrolować wagę plików.

## 6. Kontrola przed publikacją

Z katalogu projektu:

```bash
npm ci
npm run audit
npm run build
npm run audit
npm run serve
```

Następnie otworzyć `http://localhost:8000/menu/` i sprawdzić PL/UA/EN.

`npm run audit` sprawdza strukturę, identyfikatory, ceny, pliki zdjęć, wymagane pola i znane/niejednoznaczne wpisy alergenów. Ostrzeżenia nie są automatycznie poprawiane, ponieważ poprawna odpowiedź wymaga receptury/specyfikacji dostawcy.

## 7. Źródła prawne do bieżącej kontroli

- Rozporządzenie (UE) nr 1169/2011: https://eur-lex.europa.eu/eli/reg/2011/1169/oj
- GIS — pytania i odpowiedzi, w tym informacja o składzie i alergenach w gastronomii: https://www.gov.pl/web/gis/pytania-i-odpowiedzi2
- IJHARS — informacja dla klienta o daniu w lokalu gastronomicznym: https://www.gov.pl/web/ijhars/informacja-dla-klienta-o-daniu-w-lokalu-gastronomicznym
- Rozporządzenie MRiRW z 23.12.2014 r. w sprawie znakowania poszczególnych rodzajów środków spożywczych: https://isap.sejm.gov.pl/isap.nsf/download.xsp/WDU20150000029/O/D20150029.pdf
- Kodeks spółek handlowych, art. 206: https://api.sejm.gov.pl/eli/acts/DU/2024/18/text.html
- Ustawa o świadczeniu usług drogą elektroniczną, art. 5: https://eli.gov.pl/api/acts/DU/2024/1513/text.html

Dokument jest listą wdrożeniową, a nie opinią prawną. Przedstawione dane receptur nie zostały potwierdzone na podstawie dokumentacji dostawców ani audytu zakładu.
