# BMAD Implementation Plan: Cykliczne Biomy (Drzewa, Pustynia, Góry) i Upiększenie Świata

## 1. Problem i Życzenie Użytkownika (Tymek, 8 lat)
- **Audio prompt Tymka**:
  > *„Pooładnij ten świat, żeby były drzewa, pustynia, góry jakie, okej? Drzewa, pustynia, góry, drzewa, pustynia, góry, drzewa, pustynia, góry. I na przykład takie te, i on to się ciągle zmienia i takie tam drzewa, pustynia, góry. Okej?”*
- **Potrzeby i Wymagania**:
  1. **Upiększenie świata („Pooładnij ten świat”)**:
     - Zastąpienie monotonnego, jednolitego krajobrazu pięknym, urozmaiconym światem pełnym życia.
     - **Drzewa / Las**:
       - Naturalnie rozmieszczone gaje drzew z różnorodnymi koronami (drzewa normalne i wysokie dęby).
       - Kolorowe łąki z czerwonymi różami (17) i żółtymi mleczami (18).
     - **Pustynia**:
       - Złociste wydmy piaskowe z kaktusami o zróżnicowanej wysokości (2-4 bloki).
     - **Góry**:
       - Majestatyczne, wysokie pasma górskie (do y=28-30), ośnieżone szczyty (śnieg na wierzchołkach od y>=20), skaliste urwiska i górskie świerki na zboczach.
  2. **Cykliczne, ciągle zmieniające się biomy**:
     - Zamiast kilkuset bloków samej pustyni na zachodzie i samych gór na wschodzie, biomy zmieniają się dynamicznie i płynnie w rytmie:
       **Drzewa (Forest)** ➡️ **Pustynia (Desert)** ➡️ **Góry (Mountains)** ➡️ **Drzewa** ➡️ **Pustynia** ➡️ **Góry**!
     - Zmiana następuje co około 40-50 bloków wędrówki w każdym kierunku.
     - Płynne przejścia wysokości terenu (brak ostrych, nienaturalnych pionowych ścian na granicy biomów).
  3. **Bezpieczny spawn i strefy specjalne**:
     - Wokół punktu startowego (32, 32) gracz zaczyna na malowniczej, zielonej łące z drzewami i kwiatami.
     - Dark Dimension (sektor 1000, 1000) i Pig Kingdom (sektor 2000, 2000) pozostają nienaruszone.

## 2. Architektura Rozwiązania
- `js/world.js`:
  - `getBiome(x, z)`:
    - Ochrona Dark Dimension i Pig Kingdom.
    - Promień wokół spawnu: 'Forest' (Drzewa).
    - Cykliczna funkcja fazowa `(dist / 45.0) + warp` z 2D Simplex Noise, mapująca teren na 3 naprzemienne fazy:
      - 0: `Forest` (Drzewa, łąki, kwiaty)
      - 1: `Desert` (Pustynia, wydmy, kaktusy)
      - 2: `Mountains` (Góry, kamień, śnieg)
  - `generateChunk()`:
    - Płynne blendowanie wysokości terenu pomiędzy biomami (płynny wzrost z pustyni w góry i łagodny spadek z gór w las).
    - Upiększenie generowania drzew (`plantTree`) – zróżnicowane wysokości (4-8 bloków) i naturalny, organiczny rozstaw.
    - Bogatsze kwiaty na trawie w biomie Forest.
    - Górskie świerki na niższych zboczach gór.
- `tests/test_cdp_desert_mountains_visual_recipes.py`:
  - Aktualizacja próbek współrzędnych do nowego, dynamicznego cyklu biomów.
- Nowy dedykowany test CDP `tests/test_cdp_cyclical_biomes.py`:
  - Weryfikacja cyklu: Drzewa -> Pustynia -> Góry -> Drzewa -> Pustynia -> Góry wzdłuż osi X i Z.
  - Sprawdzenie obecności drzew, kaktusów, kwiatów i szczytów górskich > 20 bloków.
- Bump wersji w `index.html` i `js/main.js` do `?v=cyclical_biomes_v9`.

## 3. Weryfikacja
- Uruchomienie testów CDP w bezgłowym Chrome.
- Weryfikacja braku regresji w pozostałych testach gry.
- Git commit i ciepła odpowiedź dla Tymka z przyjazną poradą językową i pytaniami.
