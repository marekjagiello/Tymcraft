---
title: 'Fix AtlasMaterial Red Bug, Perfect 1:1 Dirtik Dirt Disguise & Thin Voice'
type: 'fix'
ticket: ''
created: '2026-10-11'
status: 'completed'
baseline_revision: 'ee7c7a0'
route: 'oneshot'
route_source: 'pinned'
risk: 'low'
review: 'none'
review_source: 'pinned'
lenses_ran: []
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:**
1. Czerwone bloki i czerwone dropy: Podczas uderzenia Dirtika funkcja `flashRed()` zmieniała kolor współdzielonego materiału `AtlasMaterial` na czerwony `0xef4444`. W rezultacie wszystkie klocki ziemi i świata w grze stawały się czerwone, a po ich wykopaniu wypadały czerwone przedmioty zamiast normalnej ziemi.
2. Ukryty Dirtik nie wyglądał 1:1 jak klocek ziemi: Miał losowy obrót (`rotationY`), rozmiar `0.99` zamiast `1.0` i odstawał od voxelowej siatki świata. Gracz poprosił, aby ukryty Dirtik był w 100% identyczny jak normalny klocek ziemi (idealnie równy w siatce) i wyskakiwał z okrzykiem po podejściu gracza (stanięciu koło niego).
3. Głos Dirtika był za niski/gruby: Gracz poprosił o zrobienie „cieńszego jego głosu” (efekt piskliwego, wesołego głosu wiewiórki/chomika).

**Approach:**
1. Naprawa koloru materiałów (`AtlasMaterial`):
   - W `js/entities/mob.js` zabezpieczyć `flashRed()`, aby nigdy nie modyfikował globalnego `AtlasMaterial`.
   - Zagwarantować przywracanie kolorów w `flashRed()` nawet po śmierci moba (`isDead`).
   - W `js/entities/mobs/hostile.js` nadać Dirtikowi sklonowany, niezależny materiał `AtlasMaterial.clone()`.
2. Perfekcyjny kamuflaż Dirtika 1:1 jak zwykła ziemia:
   - Rozmiar geometrii kamuflażu: dokładnie `1.0 x 1.0 x 1.0`.
   - Zablokowanie obrotu w trybie kamuflażu: rotacja `(0, 0, 0)` idealnie wyrównana z siatką klocków.
   - Płynne budzenie: gdy gracz podejdzie na odległość <= 2.5m, Dirtik wyskakuje i atakuje.
3. Cieńszy głos Dirtika:
   - Przetworzenie pliku `audio/dirtik_cry.wav` ze współczynnikiem wysokości tonu 1.38x (wysoki, piskliwy, cienki głosik).
   - W `js/audio.js` ustawienie `utter.pitch = 1.8` dla syntezatora mowy oraz odświeżenie ścieżki dźwiękowej z cache busterem `?v=thin_1`.
4. Cache busting:
   - Zaktualizowanie wersji w `index.html` oraz `js/main.js` do `?v=dirtik_thin_voice_1`.

</frozen-after-approval>

## Tasks & Acceptance

**Execution:**
- [ ] `js/entities/mob.js`: Bezpieczny `flashRed()` bez mutowania `AtlasMaterial`.
- [ ] `js/entities/mobs/hostile.js`: Klonowanie materiału dla kamuflażu Dirtika, wymiary 1.0x1.0x1.0, zablokowana rotacja 0 w kamuflażu, pobudka przy odległości <= 2.5m.
- [ ] `js/audio.js`: Odświeżony cienki głos Dirtika.
- [ ] `audio/dirtik_cry.wav`: Zapisanie pliku audio o podwyższonej tonacji.
- [ ] `index.html` & `js/main.js`: Bump wersji cache bustingu.
- [ ] Testy w przeglądarce i commit w Git.

**Acceptance Criteria:**
- Klocki ziemi i świata nigdy nie zabarwiają się trwale na czerwono po zaatakowaniu Dirtika.
- Z klocków ziemi po zniszczeniu wypada normalna brązowa ziemia (a z Dirtika 4-6 klocków ziemi).
- Ukryty Dirtik jest idealnie równy w siatce (rozmiar 1.0, brak przekrzywienia) i nie do odróżnienia od zwykłego klocka ziemi przed podejściem.
- Gdy gracz stanie koło ukrytego Dirtika (<= 2.5m), ten natychmiast wyskakuje z cienkim głosem i mieczem diamentowym.
- Głos Dirtika jest wyraźnie cieńszy i piskliwy.
