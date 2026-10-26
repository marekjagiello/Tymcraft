# Plan Implementacji BMAD: Pełna Pauza Gry (Esc & Ekwipunek), Opuszczone Ogniska w Lesie i Większe Biomy

## 1. Wymagania 8-letniego Gracza (Tymka)
Z nagrania głosowego:
> *„Zrób tak, że klikasz Esc, to wtedy ci całą grę stopuje i jak klikasz ekwipunek, to też ci całą grę stopuje, żeby potwory cię nie mogły bić, okej? I zrób opuszczone ogniska w lesie. Tylko las i... i pustynię i góry zrób to... trochę większe, okej?”*

### Kluczowe cele:
1. **Pełna Pauza Gry (Klawisz Esc & Ekwipunek E/R)**:
   - Po wciśnięciu `Esc` (otwarcie menu gry) lub `E`/`R` (otwarcie plecaka/craftingu):
     - Świat gry i czas całkowicie się zatrzymują!
     - Wszystkie potwory (Zombie, Szkielety, Creepery, Dirtiki, Roboty, Bossowie) zamierają w bezruchu – nie ruszają się, nie strzelają, nie zadają żadnych obrażeń.
     - Spadek głodu, utrata tlenu pod wodą, obrażenia od upadku/temperatury są wstrzymane.
     - Przyjazny wskaźnik pauzy w oknie plecaka: `⏸️ Gra wstrzymana (potwory nie atakują)`.
     - Po powrocie do gry (`Esc`, `E`, przycisk „Wznów grę” lub kliknięcie) czas wznawia się gładko bez nagłych skoków fizyki.

2. **Większe Biomy (Las, Pustynia, Góry)**:
   - Obecnie biomy zmieniały się co ~44 bloki, przez co krainy były małe.
   - Zwiększenie skali biomów (z ~44 do ~75-80 bloków na biom), aby lasy były rozległe i głębokie, pustynie przestronne, a góry tworzyły potężne pasma.
   - Płynny i naturalny cykl: **Las 🌳 ➔ Pustynia 🏜️ ➔ Góry 🏔️ ➔ Las 🌳...**

3. **Opuszczone Ogniska w Lesie (Abandoned Campfires)**:
   - W biomie leśnym (`Forest`) na leśnych polankach pojawiają się klimatyczne opuszczone ogniska.
   - Struktura opuszczonego ogniska:
     - Kamienny krąg z bruku i kamieni.
     - Pnie drewna jako pieńki do siedzenia wokół.
     - W środku: Blok Ogniska (Campfire) z żarem i unoszącym się w powietrzu animowanym dymkiem!
     - Pozostawione zapasy wędrowców (np. upieczone jedzenie, węgiel lub patyki).
     - Blok Ogniska można też wykopać i postawić w swojej bazie lub stworzyć w craftingu!

---

## 2. Architektura i Zmiany w Kodzie

### 2.1. Pauza gry (`js/main.js`, `js/ui.js`, `js/survival.js`):
- W `js/ui.js`:
  - Metoda `isGamePaused()`: zwraca `true`, gdy aktywny jest ekran pauzy (`overlayEl`), plecak (`isCraftingOpen`) lub ładowanie (`isLoading`).
  - Pokazywanie estetycznej etykiety `⏸️ Gra wstrzymana` w oknie plecaka i w menu `Esc`.
- W `js/main.js`:
  - W pętli `animate()`:
    - Gdy gra jest zapauzowana: `clock.getDelta()` jest resetowane, nie wywołujemy aktualizacji fizyki gracza (`player.update`), logiki mobów (`animals.update`), interakcji (`interaction.update`), upuszczonych przedmiotów (`drops.update`) ani survivalu (`survival.update`).
    - Scena 3D jest nadal renderowana w tle, aby gracz widział zatrzymany świat!
- W `js/survival.js`:
  - Zabezpieczenie w `takeDamage`: jeśli gra jest zapauzowana, gracz nie otrzymuje obrażeń.

### 2.2. Zwiększenie biomów (`js/world.js`):
- W `getBiomeCycleProgress(x, z)`:
  - Zmiana dzielnika odległości na ~75-80 oraz dostosowanie szumu `warp` dla łagodnych, naturalnych granic.
  - Zachowanie bezpiecznego lasu na starcie wokół punktu (32, 32).
  - Płynne łączenie wysokości terenu na granicach biomów.

### 2.3. Opuszczone Ogniska w Lesie (`js/textures.js`, `js/items.js`, `js/world.js`, `js/crafting.js`):
- Nowy blok: `Ognisko` (ID 61, `CAMPFIRE`) z unikalną teksturą żarzącego się drewna i kamieni w atlasie tekstur.
- W `js/world.js`:
  - Funkcja `plantCampfire(x, y, z)` tworząca klimatyczną leśną scenkę: krąg kamienny, pieńki, blok ogniska.
  - Animowane cząsteczki dymu (`CampfireSmoke`) generowane nad aktywnymi ogniskami w świecie.
  - Przepis craftingu ogniska w `js/crafting.js`: 3 patyki + 1 węgiel / drewno.

---

## 3. Plan Atomic Commits (Krok po Kroku)

1. **Commit 1: Pełna pauza gry na Esc i Ekwipunek (E/R)**
   - Wstrzymanie ruchu i ataków wszystkich potworów i zwierząt.
   - Wstrzymanie utraty głodu, tlenu i obrażeń.
   - Etykieta pauzy w menu i plecaku.
   - Test CDP / przeglądarkowy.

2. **Commit 2: Większe, rozleglejsze biomy (Las, Pustynia, Góry)**
   - Zwiększenie skali biomów w `js/world.js`.
   - Weryfikacja cyklu Las ➔ Pustynia ➔ Góry w testach CDP.

3. **Commit 3: Blok Ogniska i generator opuszczonych ognisk w lesie**
   - Tekstura i definicja bloku Ogniska (ID 61).
   - Generowanie opuszczonych obozowisk w biomie Forest.
   - Efekt unoszącego się dymu i przepis w craftingu.
   - Test CDP i weryfikacja wizualna w grze.
