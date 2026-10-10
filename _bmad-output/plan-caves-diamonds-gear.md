---
title: 'Jaskinie (Caves), Rudy Diamentów, Diamentowy Ekwipunek i Naprawa Znikającego Świata'
type: 'feature'
ticket: ''
created: '2026-10-10'
status: 'ready-for-dev'
baseline_revision: 'bb87b4e67d0817fe569d71c3267bb1d678652936'
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
1. Gracz buduje domek, oddala się w świat i wraca, a jego budowle znikają lub pojawiają się dziury w terenie, ponieważ silnik usuwa siatki (meshe) odległych chunków i gubi je w kolejce asynchronicznego generowania.
2. W grze brakuje głębokich jaskiń (caves) z wejściami na powierzchni, rud diamentów (Diamond Ore), diamentów jako surowca oraz diamentowego ekwipunku (diamentowy miecz, diamentowa zbroja dająca dodatkowe serduszka życia).

**Approach:** 
1. Naprawić streamowanie chunków w `world.js`: chunki ze zmianami gracza (postawione klocki/domek) nigdy nie są usuwane z widoku; kolejka meshowania nie gubi chunków przy szybkim biegu, a zasięg renderowania i synchronizacja eliminują dziury w terenie.
2. Dodać procedurę generowania jaskiń z naturalnymi, szerokimi wejściami na powierzchni trawy prowadzącymi w dół do głębokich komór skalnych.
3. Wprowadzić blok Rudy Diamentu (Diamond Ore, ID 15) na głębokościach podziemnych (y <= 12), z którego po wykopaniu wypada Diament (ID 30). Dodać także rzadki łup diamentu z Zombie i Szkieletów (5% szansy).
4. Dodać przepisy w siatce 2x2:
   - Diamentowy Miecz (Diament + Patyk pionowo) zadający potężne 14 obrażeń.
   - Diamentowa Zbroja (4 Diamenty w siatce 2x2) dodająca graczowi +10 max HP (5 dodatkowych diamentowych serduszek) oraz 40% redukcji obrażeń.
   - Diamentowy Kilof (2 Diamenty + Patyk) kopiący kamień i rudy 10x szybciej.

## Boundaries & Constraints

**Always:**
- Całkowity zakaz dodawania przycisków akcji debugowania/resetu/killowania na ekranie gry (No UI action buttons on screen — HUD czysty i bez zbędnych przycisków).
- Utrzymanie maksymalnie 1 węża na świecie (`killSnakesExceptOne()` w `AnimalManager`).
- Wszelkie zmiany w `main.js`, `animals.js`, `interaction.js`, `ui.js`, `world.js` wymagają bumpa cache bustingu `?v=...` w `index.html` i `js/main.js`.
- Klocki to ID 1-15 (nowy placeable blok: Diamond Ore ID 15); narzędzia/przedmioty to ID 20+; funkcja `isPlaceableBlock` oraz `placeBlock` muszą poprawnie obsługiwać ID 15 i blokować przedmioty nie-klockowe.
- Proporcje hitboxów i zasięgi raycastingu zgodne z wytycznymi w `AGENTS.md`.

**Never:**
- Nie niszczyć domków gracza ani nie wywoływać zniknięcia postawionych struktur.
- Nie używać Node.js ani zewnętrznych bibliotek npm (czysty Vanilla JS + Three.js ES Modules).
- Nie przekraczać limitów LocalStorage — zapis delty klocków w formacie sparse `{ "x,y,z": id }`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Oddalenie się i powrót do domku | Gracz buduje domek, odchodzi na 100+ bloków i wraca | Domek stoi nienaruszony, teren wokół wczytuje się płynnie bez dziur | Chunki z klockami gracza pozostają zameshowane lub meshowane natychmiast |
| Wejście do jaskini | Gracz znajduje wejście na powierzchni i schodzi w głąb | Naturalny szeroki tunel prowadzi w dół pod poziom ziemi do komór jaskiniowych | Bezpieczne zejście bez uwięzienia w próżni; bedrock na y=0 chroni przed wypadnięciem |
| Wykopanie rudy diamentu | Gracz niszczy blok Rudy Diamentu (ID 15) | Blok znika, wypada świecący Diament (ID 30) do podniesienia | Wymaga co najmniej kamiennego/drewnianego kilofa |
| Crafting Diamentowego Miecza | 1 Diament (góra) + 1 Patyk (dół) w 2x2 | W slocie wyniku pojawia się Diamentowy Miecz (ID 31, 14 DMG) | Kliknięcie zużywa surowce i dodaje miecz do ekwipunku |
| Crafting Diamentowej Zbroi | 4 Diamenty w siatce 2x2 | W slocie wyniku pojawia się Diamentowa Zbroja (ID 32) | Kliknięcie dodaje zbroję do ekwipunku |
| Założenie/posiadanie Zbroi | Gracz trzyma lub posiada Diamentową Zbroję w ekwipunku | Maksymalne zdrowie wzrasta do 30 HP (+5 serduszek), pancerz pochłania 40% ciosów | Przy zdjęciu/wyrzuceniu życie wraca do 20 HP |
| Rzadki łup z moba | Pokonanie Zombie lub Szkieleta | 5% szans na upuszczenie Diamentu oprócz kości/mięsa | Losowanie Math.random() < 0.05 |

</frozen-after-approval>

## Code Map

- `js/textures.js` -- Dodanie kafelka rudy diamentu (DIAMOND_ORE) do Atlasu i definicji `BLOCK_DEF[15]`.
- `js/items.js` -- Rejestracja DIAMOND_ORE (ID 15, placeable), DIAMOND (ID 30), DIAMOND_SWORD (ID 31), DIAMOND_ARMOR (ID 32), DIAMOND_PICKAXE (ID 33).
- `js/world.js` -- Generowanie jaskiń z szerokimi wejściami na powierzchni, generowanie żył diamentów na głębokości y <= 12, oraz naprawa kolejki streamingu i zachowywania zmodyfikowanych chunków.
- `js/drops.js` -- Wizualizacja lewitującego diamentu dla ID 30 oraz obsługa dropu ID 15 -> ID 30.
- `js/crafting.js` -- Przepisy na Diamentowy Miecz, Diamentowy Kilof i Diamentową Zbroję w siatce 2x2.
- `js/survival.js` -- Obsługa zwiększonego Max HP (do 30 HP) oraz redukcji obrażeń przy posiadaniu Diamentowej Zbroi.
- `js/ui.js` -- Ikony diamentowych przedmiotów w ekwipunku (💎, 🗡️, 🛡️, ⛏️) oraz dynamiczne wyświetlanie dodatkowych serduszek (do 15 serduszek = 30 HP).
- `js/entities/mobs/hostile.js` -- Dodanie 5% szansy na drop diamentu po śmierci Zombie i Szkieleta.
- `index.html` & `js/main.js` -- Bump parametrów cache bustingu `?v=caves_diamonds_1`.

## Tasks & Acceptance

**Execution:**
- [ ] `js/textures.js` -- Zwiększ atlas, dodaj teksturę błękitnej rudy diamentu i zarejestruj `BLOCK_DEF[15]` -- Umożliwia renderowanie rudy diamentu.
- [ ] `js/items.js` -- Dodaj przedmioty diamentowe (15: ruda, 30: diament, 31: miecz, 32: zbroja, 33: kilof) -- Rozszerza bazę przedmiotów.
- [ ] `js/world.js` -- Zaimplementuj wejścia do jaskiń na powierzchni, generowanie rudy diamentu w głębi oraz uodpornij chunki i domki przed znikaniem -- Tworzy jaskinie i rozwiązuje problem znikającego domku.
- [ ] `js/crafting.js` -- Dodaj receptury dla diamentowego miecza, kilofa i zbroi -- Pozwala graczowi tworzyć diamentowy sprzęt.
- [ ] `js/survival.js` -- Wprowadź bonusowe serduszka i odporność na obrażenia przy zbroi -- Daje realną korzyść z diamentowej zbroi.
- [ ] `js/ui.js` -- Zaktualizuj wyświetlanie serduszek (dodatkowe serca) oraz ikony diamentowych przedmiotów w HUD i ekwipunku -- Zapewnia czytelny interfejs dla 8-latka.
- [ ] `js/entities/mobs/hostile.js` -- Dodaj 5% szansę na upuszczenie diamentu z Zombie i Szkieletów -- Spełnia życzenie gracza o zdobywaniu diamentów z potworów.
- [ ] `js/drops.js` -- Dodaj błękitny model 3D lewitującego diamentu -- Zapewnia satysfakcjonujący efekt podnoszenia łupu.
- [ ] `index.html` & `js/main.js` -- Podbij wersje `?v=...` dla cache bustingu -- Gwarantuje, że przeglądarka od razu załaduje nowy kod.

**Acceptance Criteria:**
- Given gracz buduje domek z drewna/bruku i odchodzi daleko, when wraca w to samo miejsce, then domek stoi nienaruszony i nie ma żadnych dziur w świecie.
- Given gracz eksploruje świat, when trafia na wejście do jaskini na powierzchni, then może bezpiecznie zejść w dół do podziemnych korytarzy.
- Given gracz schodzi na głębokość poniżej y=12, when eksploruje jaskinię, then znajduje bloki błękitnej rudy diamentu.
- Given gracz niszczy rudę diamentu lub pokonuje potwora, when podnosi łup, then otrzymuje diament do ekwipunku.
- Given gracz posiada diamenty i patyki, when układa je w siatce 'E', then może wytworzyć diamentowy miecz, kilof oraz zbroję.
- Given gracz posiada diamentową zbroję, when otrzymuje cios od potwora, then ma więcej serduszek życia i otrzymuje mniejsze obrażenia.

## Implementation Notes

_None yet._

## Plan Change Log

_None._

## Review Triage Log

_None._

## Design Notes

- Ruda diamentu ma charakterystyczne błękitne kryształki na kamiennym tle (`#00e5ff` / `#40c4ff`).
- Diamentowa zbroja w ekwipunku zwiększa max HP do 30 (15 serduszek zamiast 10) oraz redukuje każdy otrzymany cios o 40%.
