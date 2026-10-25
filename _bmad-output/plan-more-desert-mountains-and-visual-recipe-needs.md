# BMAD Implementation Plan: Więcej Pustyni i Gór oraz Wizualne Pokazywanie Składników (Ikony Przedmiotów)

## 1. Problem i Potrzeba Użytkownika (Tymek, 8 lat)
- **Audio prompt Tymka**:
  > *„Ma być więcej pustyni, czyli żeby było więcej pustyni, gór i żeby to pokazywało ci, jakich rzeczy potrzebujesz, a nie mówiło m-m-m!”*
- **Wymagania**:
  1. **Generowanie świata — Znacznie więcej Pustyni i Gór**:
     - Pustynia (Desert) była ograniczona do wąskiego paska na zachodzie (`-11` do `-48`). Gracz po przejściu kilkudziesięciu bloków trafiał z powrotem na trawę. Rozszerzyć Pustynię na ogromny obszar na zachód i południe oraz dodać powtarzalne biomy pustynne w szumie świata.
     - Góry (Mountains) były małym paskiem na wschodzie (`14` do `52`). Rozszerzyć pasma górskie na wschód i południowy-wschód, zwiększyć wysokość szczytów (aż do y=30-32), dodać skaliste zbocza i ośnieżone wierzchołki.
  2. **Wizualne pokazywanie potrzebnych rzeczy (Ikony i Obrazki, a nie samo m-m-m)**:
     - Karty przepisów w Księdze Receptur (`.recipe-card`): Zamiast samego suchego tekstu `1x Drewno (0/1)`, każda karta musi mieć **wizualny rząd składników z prawdziwymi ikonami przedmiotów** (`createSlotItemIcon`), ramkami (zielona gdy gracz ma surowiec, czerwona gdy brakuje) oraz licznikiem `0/1`, `1/2`.
     - Dymek brakujących surowców (`#recipe-needs-popup`): Pokazuje duże kafelki z ikonami 32x32 każdego brakującego surowca, jego polską nazwą oraz podglądem stołu rzemieślniczego 2x2.
     - Całkowicie wyciszyć/zastąpić wszelkie niskie brzęczyki / dźwięki odmowy („m-m-m”), aby gracz nie słyszał nieprzyjemnego buczenia.

## 2. Architektura Rozwiązania

### A. Świat (`js/world.js`):
- W `getBiome(x, z)`:
  - Spawnowy bezpieczny obszar Plains: `|dx| <= 8 && |dz| <= 8`.
  - **Wielka Pustynia (Desert)**: `dx < -8 && dx > -220 && dz > -150 && dz < 50`. Dodatkowo, w szumie generalnym, jeśli `moisture < -0.22`, sektor staje się Pustynią.
  - **Potężne Pasma Górskie (Mountains)**: `dx > 8 && dx < 220 && dz > -150 && dz < 60`. Dodatkowo, w szumie generalnym, jeśli szum wysokościowy > 0.38, teren przechodzi w Góry.
  - W `generateChunk()`:
    - Góry: `rawH = this.noise.fbm2D(x * 0.03, z * 0.03, 4); h = 16 + Math.floor(rawH * 16);` (zróżnicowane wysokie szczyty, śnieg od y=17).
    - Pustynia: wydmy piaskowe, piaskowiec i kaktusy.

### B. Interfejs Księgi Receptur (`js/ui.js`):
- W `renderRecipeBook()`:
  - Dla każdego składnika przepisu generować element `<div class="recipe-ingredient-chip">`:
    - Miniatura `createSlotItemIcon(ing.id)`
    - Tekst `ing.name (have/need)`
    - Styl: zielone tło i obramowanie jeśli surowiec jest, czerwone/półprzezroczyste jeśli brakuje.
  - W `showRecipeNeedsModal(recipe, missing)`:
    - Wyświetlać estetyczne kafelki z ikoną każdego surowca, stanem posiadania i brakami.
- W `js/audio.js`:
  - Upewnić się, że `playWarningBuzzer()` jest całkowicie cichy (żadnego brzęczenia/m-m-m).

### C. Weryfikacja:
- Test CDP sprawdzający:
  - Udział biomu Desert i Mountains w świecie na zachód i wschód od spawnu oraz szczyty górskie > 20 bloków.
  - Obecność ikon (`canvas`/`span`) w rzędzie składników kart w Księdze Receptur.
  - Dymek `#recipe-needs-popup` zawierający ikony brakujących surowców.
- Cache busting query parameter bump: `?v=more_desert_mountains_icons_v6`.

## 3. Plan Wdrożenia Krok po Kroku
1. Modyfikacja `js/world.js` – rozszerzenie biomi Pustyni i Gór oraz zwiększenie wysokości pasm górskich.
2. Modyfikacja `js/audio.js` – wyciszenie i neutralizacja brzęczyka.
3. Modyfikacja `js/ui.js` – dodanie ikon składników do kart receptur oraz do modalu brakujących surowców.
4. Aktualizacja cache-busting do `?v=more_desert_mountains_icons_v6`.
5. Sprawdzenie składni i nawiasów w Pythonie.
6. Napisanie i uruchomienie testu CDP weryfikującego pustynię, góry i wizualne ikony receptur.
7. Atomic git commit i ciepła odpowiedź dla 8-letniego Tymka.
