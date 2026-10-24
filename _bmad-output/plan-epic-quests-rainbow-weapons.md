# Plan BMAD: Epickie Questy (Etap 2) oraz Kolorowy Ekwipunek (Miecz, Łuk, Samonaprowadzająca Strzała)

## 1. Kontekst i życzenie użytkownika (Tymek, 8 lat)
- Po ukończeniu pierwszych 5 zadań (gdy gracz zdobył Ciepłą Kurtkę 🧥 i wykonał podstawowe questy) gra ma odblokować **Epickie Questy (Etap 2)** ("dawaj jakieś mocniejsze questy").
- Zadanie główne: **Pokonaj 4-ramiennego Bossa Robota**!
- Nowe legendarne uzbrojenie:
  1. **Kolorowy Miecz (Rainbow Sword)** 🌈🗡️ — potężny miecz o wysokich obrażeniach (25 DMG) z tęczowymi cząsteczkami cięcia.
  2. **Kolorowy Łuk (Rainbow Bow)** 🌈🏹 — łuk o szybszym naciągu i zwiększonej sile strzału (16 DMG bazowego).
  3. **Magiczna Samonaprowadzająca Kolorowa Strzała (Rainbow Homing Arrow)** 🌈🎯:
     - Nigdy nie pudłuje ("ona trafi zawsze").
     - Samonaprowadzanie w 3D na wybranego lub najbliższego wroga.
     - Skaner/Wybór wrogów: pokazuje ekran/namierzanie potworów na świecie (klawisz `T` lub automatyczny lock-on na wrogów).
     - Nigdy się nie niszczy i wraca do gracza ("a potem do ciebie wraca i ona się nigdy nie niszczy").

## 2. Architektura i zmiany w kodzie

### A. Rejestr przedmiotów (`js/items.js`)
- `COLOR_SWORD`: ID 54, type: WEAPON, damage: 25.0
- `COLOR_BOW`: ID 55, type: WEAPON, damage: 16.0
- `COLOR_ARROW`: ID 56, type: MATERIAL, name: 'Magiczna Kolorowa Strzała'
- Aktualizacja pomocników: `isBow(id)` (wspiera 29 i 55), `isArrow(id)` (wspiera 28 i 56).

### B. Zadania (`js/quests.js`)
- Obsługa **Etapu 2**:
  Gdy 5 pierwszych zadań ma `completed === true`, pojawia się zakładka/nagłówek:
  `👑 ETAP 2: ZADANIA MISTRZA`
  - Quest 1: `epic_boss_robot` — Pokonaj 4-ramiennego Bossa Robota (0/1). Nagroda: Kolorowy Miecz (ID 54).
  - Quest 2: `epic_charged_block` — Stwórz Napiorunowany Kolorowy Blok w craftingu (0/1). Nagroda: Kolorowy Łuk (ID 55).
  - Quest 3: `epic_wand_spells` — Rzuć 3 różne zaklęcia Magicznej Różdżki (Piorun ⚡, Kula Ognia 🔥, Zamiana w Kamień 🪨) (0/3). Nagroda: Kolorowa Strzała (ID 56).

### C. Pociski i Samonaprowadzanie (`js/entities/projectile.js`)
- Klasa `HomingRainbowArrow`:
  - Trójwymiarowa trajektoria dążąca do celu (wektor skrętu w kierunku pozycji potwora z interpolacją sferyczną).
  - Wizualny tęczowy ogon z cząsteczek.
  - Po trafieniu we wroga zadaje potężne obrażenia (instakill zwykłych mobów, 50 DMG dla bossa).
  - Po uderzeniu: pocisk zmienia się w "iskrę powrotu", która szybuje z powrotem prosto do gracza, a po dotarciu odnawia 1x Kolorową Strzałę w ekwipunku gracza ("nigdy się nie niszczy, wraca do ciebie!").

### D. Interakcja i Łuk (`js/interaction.js` & `js/entities/entity-manager.js`)
- Rozpoznawanie Kolorowego Łuku i Kolorowej Strzały:
  - Wciśnięcie klawisza `T` podczas trzymania łuku przełącza cel (Radar wrogów: Boss Robot, Transformer, Zombie, Szkielet, Creeper, Dirtik itp.).
  - Wizualny wskaźnik namierzonego celu na ekranie.
  - Wystrzelenie tworzy `HomingRainbowArrow`.

### E. Wygląd i UI (`js/ui.js` & `js/drops.js`)
- Ikony hotbara dla 54, 55, 56.
- Kody chatowe: hasło `tecza` lub `rainbow` daje zestaw tęczowy do natychmiastowych testów.
- Wizualizacja upuszczonych przedmiotów w 3D z tęczową paletą.

## 3. Weryfikacja
- Sprawdzenie składni w Pythonie.
- Uruchomienie bezbłędnej sesji w przeglądarce (`localhost:8000`).
- Testy: naciągnięcie Kolorowego Łuku, wystrzał Kolorowej Strzały, naprowadzanie i powrót do gracza, ukończenie questów etapu 2.
- Bump cache w `index.html` i `js/main.js`.
- Git commit zmian.
