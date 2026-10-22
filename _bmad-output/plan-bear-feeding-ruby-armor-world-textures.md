---
title: 'Karmienie Niedźwiedzia Zgniłym Mięsem, Wytrzymałość Rubinowej Zbroi i Piękne Tekstury Świata'
type: 'feature'
ticket: ''
created: '2026-10-22'
status: 'ready-for-dev'
baseline_revision: 'eed7209'
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
8-letni gracz zgłosił w nagraniu głosowym:
1. Kliknięcie prawym przyciskiem myszy (PPM) ze zgniłym mięsem na niedźwiedzia nie karmiło go (gracz zamiast tego sam zjadał mięso).
2. Rubinowa Zbroja była wcześniej całkowicie niezniszczalna (100% nieśmiertelności bez ograniczeń), a gracz chce, aby miała wytrzymałość i po wielu uderzeniach (np. 50 ciosach) pękała i niszczyła się.
3. Struktury świata i tekstury wymagają upiększenia: liście mają mieć prześwity (widać przez nie niebo i pnie), ziemia ma być ładniejsza z korzonkami i drobnymi kamyczkami, trawa bujniejsza, a drzewa mają mieć ładniejsze korony.

**Decyzje użytkownika:**
- A1: Miś zjada zgniłe mięso, leczy swoje punkty życia (HP) i wypuszcza serduszka ❤️.
- A2: Rubinowa Zbroja posiada 50 punktów wytrzymałości (trwałość na 50 ciosów). Przy każdym uderzeniu wroga wytrzymałość spada o 1, a po 50 ciosach zbroja pęka, informuje gracza powiadomieniem i znika z ekwipunku.
- A3: Pełne odświeżenie tekstur: liście drzew z ażurowymi prześwitami (cutout jak w Minecraft Fancy Leaves), ładniejsza ziemia (dirt) z cieniowaniem i drobinkami, soczysta trawa, zróżnicowana kora drzew i ulepszone korony drzew.

**Approach:**
1. **Karmienie Misia (Bear Feeding):**
   - W `js/interaction.js`: przy kliknięciu PPM sprawdzamy `raycastAnimal()`. Jeśli wycelowano w niedźwiedzia (`type === 'bear'`) i w dłoni jest zgniłe mięso (`activeItemId === 26`), wywołujemy `animal.feedWithRottenFlesh()`, konsumujemy 1 sztukę mięsa i przerywamy akcję, zapobiegając zjedzeniu go przez gracza.
   - Poprawka zasięgu i wysokości hitboxa w `raycastAnimal()` dla `bear` (wysokość 1.35, promień 1.25), aby celowanie w misia było zawsze precyzyjne.
   - W `js/entities/mobs/passive.js` w klasie `Bear`: dodanie metody `feedWithRottenFlesh()`, która regeneruje HP (+8 HP do `maxHealth`), wyświetla serduszka `spawnHeartParticles()` i wysyła popup `eventBus.emit('ui:popup', ...)`.
2. **Wytrzymałość Rubinowej Zbroi (Ruby Armor Durability):**
   - W `js/survival.js`: Rubinowa Zbroja posiada pole `rubyArmorDurability = 50`.
   - Gdy gracz otrzymuje cios: zbroja absorbuje obrażenia, ale trwałość zmniejsza się o 1: `this.rubyArmorDurability--`.
   - Na ekranie pojawia się komunikat o ciosie i pozostałej trwałości (np. `🛡️ Rubinowa Zbroja przyjęła cios! (Pozostało 49/50 ciosów) 🔴`).
   - Gdy `rubyArmorDurability <= 0`: zbroja pęka! Wysyłany jest event i powiadomienie `💥 Twoja Rubinowa Zbroja pękła i rozpadła się!`, zbroja (ID 37) jest usuwana z ekwipunku gracza w `UI`, a punkty życia gracza wracają do normy (max 20 HP).
3. **Piękne Tekstury i Lepsze Struktury Świata:**
   - W `js/textures.js`:
     * Liście (TILES.LEAVES): dodanie naturalnych ażurowych wycięć (przezroczystych pikseli `clearRect` w kanwie atlasu) z różnymi odcieniami soczystej zieleni, dzięki czemu przez liście widać niebo, chmury i gałęzie.
     * Ziemia (TILES.DIRT): głębokie naturalne cieniowanie, mikro-kamyczki, drobne korzonki.
     * Trawa boczna (TILES.GRASS_SIDE) i górna (TILES.GRASS_TOP): bujne źdźbła trawy z gradientem i nieregularnym zwisaniem po bokach.
     * Kora drewna (TILES.WOOD_SIDE): wyraźniejsze słoje drewna i kora.
   - W `js/world.js`:
     * Ulepszenie generowania drzew (`plantTree`): pnie o zróżnicowanej wysokości (4 do 6 bloków), pełniejsze, bardziej naturalne korony liści z zaokrąglonymi wierzchołkami.
4. **Cache Busting & Weryfikacja:**
   - Zwiększenie wersji cache bustingu do `?v=bear_feed_textures_1` w `index.html` oraz we wszystkich importach w `js/main.js`, `js/animals.js`, `js/interaction.js`, `js/ui.js`.
   - Sprawdzenie w przeglądarce i commit w Git.

## Boundaries & Constraints

**Always:**
- Całkowity zakaz przycisków akcji/debugowania na HUD (No UI action buttons).
- Maksymalnie 1 wąż na świecie (`killSnakesExceptOne()`).
- Atomic commits po przetestowaniu w przeglądarce.
- Bump cache busterów `?v=...` w `index.html` i importach `js/main.js`.
- Brak zależności Node.js.

**Never:**
- Brak modyfikacji plików niszczących wsteczną kompatybilność zapisu w LocalStorage.

</frozen-after-approval>

## Code Map

- `js/interaction.js` -- Obsługa kliknięcia PPM na niedźwiedzia ze zgniłym mięsem (ID 26); poprawa hitboxa raycastu misia.
- `js/entities/mobs/passive.js` -- Metoda `feedWithRottenFlesh()` i cząsteczki serduszek `spawnHeartParticles()` w klasie `Bear`.
- `js/survival.js` -- Obsługa trwałości Rubinowej Zbroi (`rubyArmorDurability = 50`), redukcja przy ciosach, niszczenie zbroi i usuwanie z inwentarza po 50 uderzeniach.
- `js/ui.js` -- Metoda usuwania przedmiotu zbroi po jej pęknięciu `removeItem(id, count)`.
- `js/textures.js` -- Nowe piękne tekstury (ażurowe liście z prześwitami, ziemia, trawa, drewno).
- `js/world.js` -- Ulepszenie koron drzew i wysokości pni w `plantTree()`.
- `index.html` & `js/main.js` -- Aktualizacja cache bustera do `?v=bear_feed_textures_1`.

## Tasks & Acceptance

**Faza 1: Karmienie Niedźwiedzia Zgniłym Mięsem**
- [ ] `js/interaction.js`: Obsługa PPM ze zgniłym mięsem na misia przed wywołaniem jedzenia przez gracza; powiększenie cylindra raycastingu dla misia.
- [ ] `js/entities/mobs/passive.js`: Implementacja `feedWithRottenFlesh()` w `Bear` (leczenie HP misia, serduszka ❤️, powiadomienie na ekranie).

**Faza 2: Wytrzymałość Rubinowej Zbroi (Durability)**
- [ ] `js/survival.js`: Trwałość Rubinowej Zbroi (50 ciosów), zmniejszanie przy ciosach, powiadomienia o pozostałej wytrzymałości.
- [ ] `js/ui.js`: Zdejmowanie/usuwanie zbroi po osiągnięciu 0 trwałości i resetowanie statystyk do normalnego stanu.

**Faza 3: Piękne Tekstury i Struktury Świata**
- [ ] `js/textures.js`: Ażurowe liście z prześwitami (przezroczyste piksele), ładniejsza ziemia z korzonkami, soczysta trawa i słoje kory.
- [ ] `js/world.js`: Bogatsze korony liści i zróżnicowana wysokość pni drzew.

**Faza 4: Weryfikacja i Commit**
- [ ] Bump parametrów cache bustingu `?v=bear_feed_textures_1` w `index.html` i `js/main.js`.
- [ ] Weryfikacja w przeglądarce i testy syntaktyczne.
- [ ] Commit w Git zgodnie z zasadą Atomic Commits.

## Verification

**Commands:**
- Sprawdzenie poprawności syntaktycznej plików JS za pomocą testu nawiasów w Python3.
- Test w przeglądarce za pomocą subagenta przeglądarki na `http://localhost:8000/`.
