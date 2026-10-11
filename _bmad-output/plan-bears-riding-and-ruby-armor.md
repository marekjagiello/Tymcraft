---
title: 'Niedźwiedzie (Jazda na klawisz P) i Niezniszczalna Rubinowa Zbroja'
type: 'feature'
ticket: ''
created: '2026-10-11'
status: 'in-review'
baseline_revision: '4c8066e'
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
8-letni gracz chce dodać do gry:
1. Niedźwiedzie, na których można jeździć po świecie voxelowym za pomocą klawisza `P` (płynna jazda, sterowanie).
2. Zbroje z craftingu 2x2, a w szczególności Rubinową Zbroję (Ruby Armor) – najlepszą w grze, której „nic nie przebije” (niezniszczalność / potężna ochrona).
3. Wyraźny opis na ekranie startowym gry oraz w oknie plecaka wyjaśniający, jak wytwarzać zbroje i jak na nich jeździć.
4. Doprecyzowanie końcówki urwanego nagrania („i zrób tak, że...”).

**Approach:**
1. **Niedźwiedzie (Bear Mob & Riding):**
   - Dodanie klasy `Bear` w `js/entities/mobs/passive.js`.
   - Voxelowy model niedźwiedzia: masywny korpus, głowa z uszami, 4 mocne łapy, animacja chodu.
   - Mechanika dosiadania: naciśnięcie klawisza `P` w odległości <= 3.0m od niedźwiedzia powoduje dosiadanie (mount).
   - Sterowanie na grzbiecie niedźwiedzia: gracz siedzi na niedźwiedziu (podwyższona pozycja i widok kamery), sterowanie WASD kieruje niedźwiedziem z większą prędkością.
   - Zejście z niedźwiedzia: ponowne naciśnięcie `P`.
2. **Zbroja Rubinowa i system zbroi:**
   - Nowy przedmiot: `RUBY_ARMOR` (ID 37, typ `armor`).
   - Receptura 2x2 w `js/crafting.js`: 4 Rubiny w siatce 2x2 dają Rubinową Zbroję.
   - Efekt: ochrona 100% (lub 40 HP z rubinowymi serduszkami na HUD), gracz jest nie do pokonania („nic jej nie przebije”).
   - Czerwona rubinowa poświata i ikona na HUD.
3. **Opis na wejściu do gry:**
   - Zaktualizowanie ekranu powitalnego `#start-overlay` w `index.html` z instrukcją: jak zrobić Rubinową Zbroję, jak wsiadać na Niedźwiedzia klawiszem `P`.
   - Zaktualizowanie ściągawki przepisów w oknie rzemiosła 2x2.

## Boundaries & Constraints

**Always:**
- Całkowity zakaz przycisków akcji/debugowania na ekranie HUD (No UI buttons).
- Maksymalnie 1 wąż na świecie (`killSnakesExceptOne()`).
- Atomic commits po przetestowaniu w przeglądarce.
- Bump cache busterów `?v=...` w `index.html` i importach `js/main.js`.
- Przyjazna, cierpliwa komunikacja dopasowana do 8-letniego gracza.

</frozen-after-approval>

## Tasks & Acceptance (Wstępne)

- [ ] Doprecyzowanie szczegółów z graczem (pytania o niedźwiedzia, końcówkę nagrania, zachowanie zbroi).
- [ ] Utworzenie modelu 3D niedźwiedzia i logiki poruszania się.
- [ ] Wdrożenie jazdy na niedźwiedziu pod klawiszem `P`.
- [ ] Dodanie Rubinowej Zbroi do `js/items.js`, `js/crafting.js`, `js/survival.js` i `js/ui.js`.
- [ ] Dodanie opisów do ekranu startowego gry w `index.html`.
- [ ] Weryfikacja w przeglądarce i commit w Git.
