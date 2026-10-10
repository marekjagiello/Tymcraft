---
title: 'Czerwone Rubiny (Ruby Ore) i Rubinowy Miecz (One-Hit Kill 20 HP)'
type: 'feature'
ticket: ''
created: '2026-10-10'
status: 'ready-for-dev'
baseline_revision: '0c4761ad28602963c2a519addd0fc35d41052dbc'
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

**Problem:** Gracz chce rzadkich czerwonych rubinów, które można wykopać wyłącznie Diamentowym Kilofem (nie da się ich zbić ręką), a z nich stworzyć Rubinowy Miecz zadający 20 HP i niszczący Zombie oraz Szkielety jednym ciosem ("na hita").

**Approach:** 
1. Dodać Ruda Rubinu (Ruby Ore, ID 16) generowaną w głębokich warstwach skalnych (Y <= 10) ze szansą ok. 30% w głębokich żyłach.
2. Wymusić posiadanie Diamentowego Kilofa (ID 33) w dłoni do wykopania Rudy Rubinu; uderzenie ręką lub innym narzędziem nie niszczy bloku i wyświetla ostrzeżenie.
3. Po wykopaniu Diamentowym Kilofem wypada lewitujący czerwony kryształ – Rubin (ID 34).
4. Dodać recepturę w craftingu 2x2: Rubin (góra) + Patyk (dół) = Rubinowy Miecz (ID 35, 20 DMG, eliminuje Zombie i Szkielety jednym uderzeniem).

## Boundaries & Constraints

**Always:**
- Całkowity zakaz przycisków akcji/debugowania na ekranie (No UI buttons on HUD).
- Zasada maksymalnie 1 węża na świecie (`killSnakesExceptOne()`).
- Atomic commits: Commit po zakończeniu implementacji i przetestowaniu.
- Bump parametrów cache bustingu `?v=ruby_sword_1` w `index.html` i `js/main.js`.
- Klocki to ID 1-16 (ID 16 to nowa Ruda Rubinu, placeable: true); przedmioty 20+.

**Never:**
- Nie niszczyć rudy rubinu ani nie dropić rubinu bez trzymania Diamentowego Kilofa w ręku.
- Żadnych zależności Node.js.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Próba wykopania ręką | Gracz klika LPM na Rudę Rubinu z pustą ręką lub drewnianym kilofem | Blok nie ulega zniszczeniu, komunikat: „Do wykopania Rubinu potrzebujesz Diamentowego Kilofa!” | Blok pozostaje nienaruszony |
| Wykopanie Diamentowym Kilofem | Gracz ma w ręku Diamentowy Kilof (ID 33) i klika LPM | Blok pęka, pojawiają się czerwone cząsteczki i wypada lewitujący czerwony Rubin (ID 34) | Prawidłowe zebranie przedmiotu do ekwipunku |
| Crafting Rubinowego Miecza | 1 Rubin (góra) + 1 Patyk (dół) w siatce 2x2 | Wynik pokazuje Rubinowy Miecz (ID 35) z czerwonym blaskiem | Kliknięcie pobiera 1 rubin i 1 patyk |
| Atak na potwora Rubinowym Mieczem | Gracz uderza Zombie (15 HP) lub Szkieleta (10 HP) Rubinowym Mieczem | Potwór natychmiast ginie w jednym ciosie (zadane 20 obrażeń), pojawia się dym i łupy | Potwór przechodzi w stan die() |

</frozen-after-approval>

## Code Map

- `js/textures.js` -- Nowy kafelek TILES.RUBY_ORE (17) i BLOCK_DEF[16] (Ruda Rubinu).
- `js/items.js` -- Rejestracja RUBY_ORE (ID 16), RUBY (ID 34), RUBY_SWORD (ID 35, 20 DMG).
- `js/world.js` -- Generowanie rudy rubinu na poziomie Y <= 10 w głębokiej skale.
- `js/interaction.js` -- Blokada niszczenia bloku 16 bez aktywnego Diamentowego Kilofa (ID 33) oraz komunikat.
- `js/drops.js` -- Wizualizacja 3D lewitującego czerwonego Rubinu (ID 34) i drop z bloku 16.
- `js/crafting.js` -- Receptura na Rubinowy Miecz w siatce 2x2.
- `js/ui.js` -- Ikonki rubinu i rubinowego miecza z czerwonym blaskiem, render miniatury klocka 16.
- `index.html` & `js/main.js` -- Bump cache bustingu do `?v=ruby_sword_1`.

## Tasks & Acceptance

**Execution:**
- [ ] `js/textures.js` -- Dodaj kafelek i definicję Rudy Rubinu -- Renderowanie czerwonej rudy.
- [ ] `js/items.js` -- Dodaj definicje przedmiotów rubinowych -- Rozszerzenie rejestru.
- [ ] `js/world.js` -- Generuj rudy rubinów pod ziemią -- Dostępność surowca w świecie.
- [ ] `js/interaction.js` -- Wymóg Diamentowego Kilofa przy kopaniu rubinu -- Mechanika zgodna z wytycznymi gracza.
- [ ] `js/drops.js` -- Model 3D Rubinu i drop z rudy -- Satysfakcjonujący czerwony łup.
- [ ] `js/crafting.js` -- Przepis na Rubinowy Miecz -- Crafting potężnej broni.
- [ ] `js/ui.js` -- Ikony i stylizacja rubinowych przedmiotów -- Czytelny HUD.
- [ ] `index.html` & `js/main.js` -- Cache busting `?v=ruby_sword_1` -- Natychmiastowe ładowanie w przeglądarce.

**Acceptance Criteria:**
- Given gracz odnajduje rudę rubinu pod ziemią, when próbuje ją zniszczyć ręką, then blok nie pęka i wyświetla się informacja o potrzebie diamentowego kilofa.
- Given gracz trzyma diamentowy kilof, when uderza rudę rubinu, then ruda pęka i wypada z niej czerwony rubin.
- Given gracz posiada rubin i patyk, when układa je w siatce 2x2, then może wytworzyć Rubinowy Miecz.
- Given gracz uderza Zombie lub Szkieleta Rubinowym Mieczem, then potwór ginie w jednym ciosie (20 HP obrażeń).

## Implementation Notes

_None yet._

## Plan Change Log

_None._

## Review Triage Log

_None._
