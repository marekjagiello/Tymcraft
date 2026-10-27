# Plan Implementacji BMAD: Wioska (x: 100), Wieśniacy z Wielkimi Nosami i Handlem, Żelazny Golem oraz Ogniska

## 1. Wymagania 8-letniego Gracza (Tymka)
Z nagrania głosowego:
> *„Nie pytaj mnie przy moich zadaniach, czyli nie rób ciągle, że tak czy ten, tylko sam sobie wybierę, okej? I zrób tak, żeby był Golem. Zrób wioskę. Wioska będzie na x 100, a y coś tam. Będą wieśniacy. Wieśniacy wyglądają tak, że mają duże nosy i... i z wieśniakami można się wymieniać, a Golem jak walniesz wieśniaka, to wtedy on ci... to wtedy on przychodzi do ciebie, podchodzi do ciebie i cię bije. On będzie zadawać... będzie cię podrzucać, a potem będziesz spadał.”*

Oraz z wcześniejszego nagrania o ogniskach:
> *„Zrób tak, żeby... były ogniska, bo ja ich w ogóle nie widzę, w ogóle nie widzę ognisk. I zrób tak, żeby były ogniska.”*

---

## 2. Podział na Atomy i Architektura

### 2.1. Blok Ogniska (Campfire) i Efekt Dymu (`js/items.js`, `js/textures.js`, `js/world.js`, `js/crafting.js`, `js/interaction.js`)
- Rejestracja przedmiotu i bloku `CAMPFIRE` (ID: 61) w `js/items.js`.
- Tekstura kłód drewna, żaru i popiołu w `js/textures.js` (Tile 24, zwiększenie atlasu).
- Cząsteczki dymu unoszące się nad blokami ogniska w świecie (`CampfireSmokeManager` w `js/world.js` / `js/main.js`).
- Pieczenie surowego mięsa: kliknięcie PPM na ognisko trzymając surowe mięso (schab/wołowinę/baraninę) zamienia je na upieczone mięso z dźwiękiem skwierczenia.
- Zadawanie małych obrażeń graczowi stojącemu bezpośrednio w płomieniach ogniska.
- Przepis w craftingu 2x2: 3 patyki + 1 węgiel / drewno = 1 Ognisko.

### 2.2. Generator Wioski na X: 100 (`js/world.js`)
- Wioska zlokalizowana wokół współrzędnych `X: 100, Z: 100` (promień ~24 bloki).
- Wypłaszczony, malowniczy teren: zielona trawa, ścieżki z bruku i ubitej ziemi.
- Domki wiejskie:
  - Fundamenty z bruku (Cobblestone).
  - Ściany z desek dębowych (Planks).
  - Szklane okna (Glass).
  - Otwory drzwiowe i dachy z drewna/bruku.
  - Wnętrza z pochodniami i pieńkami.
- Ogródki uprawne z wodą i grządkami pszenicy.
- Rynek wiejski z centralnym ogniskiem i latarniami.

### 2.3. Wieśniacy (Villagers) z Dużymi Nosami i Handlem (`js/entities/mobs/villager.js`, `js/ui.js`, `js/interaction.js`)
- Model 3D Wieśniaka:
  - Szata wieśniaka (klasyczny brązowy/szmaragdowy strój).
  - Złożone ręce w charakterystycznej pozycji Minecrafta.
  - **Duży, wysunięty nos wieśniaka** (dokładnie jak w opisie Tymka).
  - Dźwięki: charakterystyczne wieśniacze pomruki (*„Hrmmm!”*, *„Hrr”*).
- System Handlu (Wymiana z wieśniakiem):
  - Kliknięcie PPM na wieśniaka otwiera dedykowany interfejs handlu.
  - Dostępne korzystne wymiany:
    - 5 Patyków ➔ 1 Szmaragd 💎
    - 3 Pszenice ➔ 1 Chleb 🍞
    - 1 Szmaragd ➔ 2 Pieczone Schaby 🍖
    - 2 Szmaragdy ➔ 1 Żelazny Miecz 🗡️
    - 3 Szmaragdy ➔ 1 Ognisko 🔥
  - Kliknięcie wymiany wydaje dźwięk zadowolonego wieśniaka (*„Hrrr! ✨”*).

### 2.4. Żelazny Golem (Iron Golem) broniący wioski (`js/entities/mobs/iron-golem.js`)
- Potężny, wysoki model 3D (żelazne płyty, potężne barki, pnącza, czerwona róża).
- Neutralny strażnik: patroluje wioskę, broni wieśniaków przed Zombie i potworami.
- **Reakcja na uderzenie Wieśniaka**:
  - Gdy gracz uderzy Wieśniaka, Żelazny Golem wpada w szał (*„HUUUGH!”* i czerwone oczy).
  - Natychmiast biegnie w stronę gracza.
  - Wykonuje potężny zamach ręką z dołu do góry.
  - **Efekt ataku**: podrzuca gracza wysoko w niebo (`velocity.y = 14.5`), gracz leci w górę, a potem spada na ziemię i otrzymuje obrażenia od upadku!

---

## 3. Plan Atomic Commits

1. **Commit 1: Blok Ogniska (ID 61), tekstura, dymek, pieczenie mięsa i crafting**
   - Tekstura ogniska w atlasie i rejestracja w `js/items.js`.
   - Cząsteczki dymu i interakcja pieczenia mięsa.
   - Przepis w `js/crafting.js`.

2. **Commit 2: Generator Wioski na X: 100, Z: 100 w `js/world.js`**
   - Wypłaszczona polana wiejska, ścieżki, domki ze szkłem i dachami, ogródki warzywne, centralne ognisko.

3. **Commit 3: Wieśniacy z wielkim nosem i interfejsem wymiany (handlu)**
   - Klasa `Villager`, model z dużym nosem, odgłosy *„Hrmmm”*.
   - Okno handlu z wymianami na szmaragdy, chleb, pieczone mięso i miecze.

4. **Commit 4: Żelazny Golem broniący wioski i wyrzucający gracza w powietrze**
   - Klasa `IronGolem`, zachowanie strażnika wioski.
   - Detekcja ataku na wieśniaka, szarża i wyrzucanie gracza w powietrze.
   - Testy CDP / przeglądarkowe weryfikujące całe zachowanie.
