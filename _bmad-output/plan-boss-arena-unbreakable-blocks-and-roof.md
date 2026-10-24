# Plan BMAD: Niezniszczalne Bloki Piorunowe i Dach na Arenie Bossa

## 1. Zgłoszenie Użytkownika (Tymek, 8 lat)
> „Te bloki u bossa... te piorunowe mają być niezniszczalne. Mają być niezniszczalne, bo wszystko ma u bossa być niezniszczalne. I ma być u bossa dach.”

## 2. Diagnoza
1. **Dach nad areną Bossa**:
   - Dotychczas arena miała podłogę (y=11) i ścianę z Bedrocka (y=12..19), ale była otwarta od góry w niebo.
   - Tymek wymaga, aby arena miała solidny **dach** (y=20), całkowicie zamykający przestrzeń walki z Bossem.
2. **Niezniszczalność bloków piorunowych i całej areny**:
   - Bloki piorunowe (ID: 53, Napiorunowany Kolorowy Blok) oraz wszystkie bloki w strefie areny Bossa (x=980..1020, z=980..1020) muszą być **w 100% niezniszczalne**!
   - Gracze ani eksplozje pocisków nie mogą niszczyć podłogi, ścian, dachu ani bloków piorunowych.

## 3. Plan Implementacji
1. **Dach w `js/world.js` (`generateDarkArenaChunk`)**:
   - Na poziomie `arenaFloorY + 9` (y=20) wygenerować dach nad całym promieniem areny (`dist <= arenaRadius`).
   - Konstrukcja dachu: lity Bedrock (ID 14) z krzyżującymi się cyber-liniami z bloków piorunowych (ID 53).
2. **Niezniszczalność w `js/interaction.js` (`breakBlock`)**:
   - Dodać blokadę niszczenia dla:
     - `blockId === 14` (Bedrock),
     - `blockId === 53` (Napiorunowany Kolorowy Blok / blok piorunowy),
     - Wszystkich bloków na arenie Bossa (`x >= 980 && x <= 1020 && z >= 980 && z <= 1020`).
   - Przy próbie uderzenia/zniszczenia: odtworzyć dźwięk uderzenia i wyświetlić komunikat: `🛡️ Wszystkie bloki u Bossa są niezniszczalne!`.
3. **Ochrona przed wybuchami w `js/entities/projectile.js` i `js/entities/mobs/hostile.js`**:
   - Zabezpieczyć blok 53 oraz sektor areny przed niszczeniem wybuchami prochu, pocisków czy creeperów.
4. **Weryfikacja Testami CDP**:
   - Utworzyć test `tests/test_cdp_unbreakable_arena_and_roof.py`:
     - Sprawdzić, że dach istnieje na y=20 nad całą areną (`dist <= arenaRadius`).
     - Sprawdzić, że bloki dachu, ścian, podłogi i bloki piorunowe (53) są niezniszczalne (próba `breakBlock()` na nich nic nie usuwa).
     - Sprawdzić, że gracz bezpiecznie porusza się wewnątrz zamkniętej areny z dachem.
5. **Cache Busting & Atomic Commit w Git**.
