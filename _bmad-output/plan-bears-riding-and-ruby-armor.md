---
title: 'Niedźwiedzie (Rasy, Biały Miś Silniejszy, Jazda na P) i Niezniszczalna Rubinowa Zbroja'
type: 'feature'
ticket: ''
created: '2026-10-11'
status: 'ready-for-dev'
baseline_revision: '737506b'
route: 'full'
route_source: 'auto'
risk: 'low'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** 
8-letni gracz poprosił o:
1. Rasy niedźwiedzi, które występują w przyrodzie (niedźwiedź brunatny 🐻, czarny 🐻‍⬛, panda 🐼 i biały miś polarny 🐻‍❄️).
2. Biały miś ma być najsilniejszy („biała jest silniejsza” – więcej punktów życia, szybszy bieg, najmocniejszy cios łapą).
3. Możliwość wsiadania i jazdy na niedźwiedziach na klawisz `P` (płynna jazda, sterowanie WASD z grzbietu misia, ponowne `P` zsiada).
4. Rubinową Zbroję (Ruby Armor) – najlepsza zbroja, „nic jej nie przebije” (100% ochrona przed obrażeniami, gracz jest niezniszczalny, zbroja ma rubinowy blask).
5. Wyraźny opis od razu przy wejściu do gry (na ekranie startowym / w menu pauzy oraz w oknie plecaka) wyjaśniający, jak zrobić zbroje i jak jeździć na niedźwiedziu.

**Approach:**
1. **Rubinowa Zbroja (Ruby Armor):**
   - Rejestracja `RUBY_ARMOR` (ID 37, typ `armor`) w `js/items.js`.
   - Receptura 2x2 w `js/crafting.js`: 4 Rubiny (ID 34) w siatce 2x2 dają Rubinową Zbroję.
   - W `js/survival.js`: gracz posiadający Rubinową Zbroję jest całkowicie chroniony (`nic jej nie przebije` – 100% redukcji obrażeń lub niezniszczalna tarcza rubinowa).
   - W `js/ui.js`: Rubinowa tarcza 🛡️ z czerwonym blaskiem na pasku życia i ikona w slocie.
   - W `js/player.js`: Czerwony rubinowy pancerz na modelu gracza w widoku 3. osoby [V].
2. **Niedźwiedzie (Bear Mobs):**
   - Nowa klasa `Bear` w `js/entities/mobs/passive.js` z wariantami (rasami):
     * Brunatny (brązowy leśny 🐻, 14 HP, prędkość x1.2)
     * Czarny (baribal 🐻‍⬛, 12 HP, prędkość x1.3)
     * Panda (biało-czarny 🐼, 12 HP, prędkość x1.0)
     * Polarny (biały śnieżny 🐻‍❄️, najsilniejszy: 24 HP, najszybszy x1.5, potężny cios łapą na 10 HP).
   - Spawnowanie w świecie w `EntityManager`: brunatne i czarne na trawie/lasach, białe na śniegu/górach.
   - Wsiadanie na klawisz `P`: jeśli gracz znajduje się w pobliżu niedźwiedzia (<= 3.5m) i wciśnie `P`, wsiada na grzbiet niedźwiedzia.
   - Jazda na niedźwiedziu: gracz siedzi na misiu, WASD steruje ruchem misia, kamera podąża z góry/pleców, LPM podczas jazdy pozwala niedźwiedziowi atakować wrogów łapą!
   - Ponowne naciśnięcie `P`: zsiadanie z niedźwiedzia obok.
3. **Opis na starcie gry:**
   - W `index.html` na ekranie `#start-overlay`: specjalna ramka informacyjna:
     * 🛡️ **Jak zrobić Rubinową Zbroję:** 4 Rubiny w siatce rzemiosła [E/R] – najlepsza zbroja, nic jej nie przebije!
     * 🐻 **Jazda na Niedźwiedziu:** Podejdź do misia i wciśnij klawisz **P**, by na niego wsiąść! Biały miś jest najsilniejszy!
   - W oknie plecaka w podpowiedziach przepisów 2x2: dopisanie receptury na Rubinową Zbroję.

## Boundaries & Constraints

**Always:**
- Całkowity zakaz przycisków akcji/debugowania na HUD (No UI buttons).
- Maksymalnie 1 wąż na świecie (`killSnakesExceptOne()`).
- Atomic commits po przetestowaniu w przeglądarce.
- Bump cache busterów `?v=...` w `index.html` i importach `js/main.js`.
- Brak zależności Node.js.

</frozen-after-approval>

## Tasks & Acceptance

**Faza 1: Rubinowa Zbroja & Opisy na ekranie startowym**
- [ ] `js/items.js`: Dodanie przedmiotu `RUBY_ARMOR` (ID 37).
- [ ] `js/crafting.js`: Receptura 2x2 z 4 Rubinów na Rubinową Zbroję.
- [ ] `js/survival.js`: 100% ochrona gracza posiadającego Rubinową Zbroję („nic jej nie przebije”).
- [ ] `js/ui.js`: Ikona Rubinowej Zbroi i rubinowe serduszka/tarcze na HUD.
- [ ] `js/player.js`: Czerwony rubinowy pancerz w widoku 3. osoby [V].
- [ ] `index.html`: Czytelny opis na ekranie startowym gry (`#start-overlay`) i w oknie plecaka.

**Faza 2: Niedźwiedzie (Wszystkie rasy, Biały najsilniejszy) & Jazda na klawisz P**
- [ ] `js/entities/mobs/passive.js`: Implementacja klasy `Bear` z 4 rasami (brunatny, polarny, czarny, panda) i modelem 3D.
- [ ] `js/entities/entity-manager.js`: Spawnowanie niedźwiedzi na powierzchni biomów.
- [ ] `js/player.js` & `js/interaction.js`: Obsługa klawisza `P` (dosiadanie/zsiadanie, sterowanie ruchem, atak łapą).
- [ ] Weryfikacja w przeglądarce i commit w Git.
