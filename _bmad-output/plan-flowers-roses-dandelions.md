---
title: 'Kwiaty w Świecie: Czerwone Róże (Maki) i Żółte Mlecze (Mniszki)'
type: 'feature'
ticket: ''
created: '2026-10-22'
status: 'ready-for-dev'
baseline_revision: 'cbaa99e'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'auto'
lenses_ran: []
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** 
8-letni gracz poprosił w nagraniu głosowym: „Zrób te kwiaty... zrób kwiaty.”
Świat gry nie posiadał dotąd żadnych roślin ozdobnych ani kwiatów na trawie.

**Decyzje użytkownika:**
- A1: Czerwone maki (róże) 🌹 i żółte mniszki (mlecze) 🌼 rosnące naturalnie na trawie.
- A2: Trójwymiarowe roślinki na trawie z łodyżką i płatkami (klasyczny krzyżak 3D cross-quad jak w Minecraft) 🌸.
- A3: Gracz może je ścinać, podnosić do plecaka, sadzić w wybranym miejscu na trawie oraz karmić nimi owce 🐑 i świnki 🐷 (z animacją serduszek ❤️).

**Approach:**
1. **Tekstury i Atlas (`js/textures.js`):**
   - Zwiększenie `ATLAS_ROWS = 6` (pojemność 24 kafelków).
   - Nowe kafelki: `TILES.ROSE = 18` (czerwony kwiat z łodyżką) oraz `TILES.DANDELION = 19` (żółty kwiat z łodyżką).
   - Rejestracja w `BLOCK_DEF`:
     * ID 17: `Czerwona Róża (Rose)`: `solid: false`, `transparent: true`, `isPlant: true`
     * ID 18: `Żółty Mlecz (Dandelion)`: `solid: false`, `transparent: true`, `isPlant: true`
2. **Model 3D w Świecie (`js/world.js`):**
   - W `buildChunk`: wykrywanie bloków `isPlant: true` i generowanie podwójnie widocznego krzyżaka 3D (2 skośne quady w kształcie litery X z przezroczystością `alphaTest`).
   - W `generateChunkData`: naturalne generowanie kwiatów na trawie w biomach Plains i Forest (ok. 5% szansy na blok trawy).
3. **Przedmioty i Dropy (`js/items.js` & `js/drops.js`):**
   - W `js/items.js`: rejestracja `ROSE` (ID 17) i `DANDELION` (ID 18) jako stawialnych bloków.
   - W `js/drops.js`: miniaturowy lewitujący model kwiatka 3D (`createFlowerMesh`) po ścięciu roślinki.
4. **Interakcje Gracza (`js/interaction.js` & `js/entities/mobs/passive.js`):**
   - Ścinanie kwiatka jednym uderzeniem (LPM) i wypadanie dropu.
   - Sadzenie kwiatka (PPM) na blokach trawy lub ziemi.
   - Karmienie owieczek (`sheep`) i świnek (`pig`) kwiatkami trzymanymi w dłoni (PPM): leczenie HP, unoszące się serduszka ❤️ i konsumpcja 1 kwiatka.
5. **Cache Busting & Weryfikacja:**
   - Bump wersji do `?v=flowers_1` w `index.html` oraz we wszystkich importach w `js/main.js`.
   - Sprawdzenie w przeglądarce i commit w Git.

## Boundaries & Constraints

**Always:**
- Całkowity zakaz przycisków akcji/debugowania na HUD (No UI action buttons).
- Maksymalnie 1 wąż na świecie (`killSnakesExceptOne()`).
- Atomic commits po przetestowaniu w przeglądarce.
- Bump cache busterów `?v=...` w `index.html` i importach `js/main.js`.
- Brak zależności Node.js.

</frozen-after-approval>

## Code Map

- `js/textures.js` -- Powiększenie atlasu (`ATLAS_ROWS = 6`), narysowanie kafelków `ROSE` (18) i `DANDELION` (19), definicja bloków 17 i 18 w `BLOCK_DEF`.
- `js/world.js` -- Generowanie geometrii krzyżaka 3D dla `isPlant` w `buildChunk()`, naturalne spawnowanie kwiatów na trawie w `generateChunkData()`.
- `js/items.js` -- Rejestracja przedmiotów `ROSE` (17) i `DANDELION` (18).
- `js/drops.js` -- Miniaturka 3D kwiatka `createFlowerMesh()` i upuszczanie po ścięciu.
- `js/entities/mobs/passive.js` -- Metoda `feedWithFlower()` oraz cząsteczki serduszek w `Sheep` i `Pig`.
- `js/interaction.js` -- Obsługa sadzenia na trawie/ziemi oraz karmienia owiec i świnek kwiatami przy PPM.
- `index.html` & `js/main.js` -- Aktualizacja cache bustera `?v=flowers_1`.
