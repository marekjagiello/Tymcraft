# Plan Implementacji BMad: Kod 6261, Napiorunowany Blok i Różdżka z Różnymi Czarami

## 1. Wymagania 8-letniego Gracza (Tymka)
Z nagrania audio:
1. **Kod 6261 (poprawka kodu)**:
   - *"Kod 6 2 6 nie działa... a miał działać kod 6 2 6 1! Zrób, żeby działał i dał ci kolorowy blok!"*
   - Czat obsługuje kod **`6261`** (oraz z tolerancją `6 2 6 1`, `626`, `6 2 6`).
   - Kod przyznaje:
     - **Kolorowy Blok 626** (ID 51) 🌈
     - **2x Laserowy/Piorunowy Miecz** (ID 47 - „te pioruny”) ⚡
     - **2x Patyk** (ID 20) 🪵
     - **1x Krzesiwo** (ID 52) 🔥
     - Materiały na Totem (Ziemia + Kamień)
2. **Receptura 1: Napiorunowany Kolorowy Blok**:
   - *"jak położysz dwa koło niego te pioruny, te pioruny, czyli te pioruny miecze piorunowe, to ci robi taki napiorunowany ten..."*
   - W siatce craftingu 2x2:
     - **Kolorowy Blok (ID 51)** + **Miecz Piorunowy / Laserowy (ID 47)** (1 lub 2 sztuki) ➔ **Napiorunowany Kolorowy Blok (ID 53)** ⚡🌈!
3. **Receptura 2: Różdżka Czarnoksiężnika**:
   - *"I jak położysz koło tego patyk i ten kolorowy blok napiorunowany, to masz różdżkę!"*
   - W siatce craftingu 2x2:
     - **Napiorunowany Kolorowy Blok (ID 53)** + **Patyk (ID 20)** ➔ **Magiczna Różdżka (ID 50)** 🪄!
4. **Różdżka ma różne czary**:
   - *"Różdżka ma różne czary!"*
   - Trzy potężne czary:
     1. ⚡ **Błyskawica / Piorun (Lightning Bolt)**: uderzenie piorunem z grzmotem, 15 DMG.
     2. 🔥 **Kula Ognia (Fireball)**: ognisty pocisk z wybuchem i płomieniami.
     3. 🪨 **Skamienienie (Stone Freeze)**: zamienia moba w głaz na 5 sekund.
   - Przełączanie czarów klawiszem **V** lub **PPM** w ręku, rzucanie czarów **LPM**!

---

## 2. Etapy Implementacji (Atomic Commits)
1. **`js/items.js` & `js/crafting.js`**:
   - Rejestracja `COLOR_BLOCK_626` (51) i `CHARGED_BLOCK_626` (53).
   - Receptura na Napiorunowany Blok (Blok 51 + Pioruny 47).
   - Receptura na Różdżkę (Blok 53 + Patyk 20).
2. **`js/ui.js`**:
   - Obsługa kodu `6261` (i `626`) dającego Blok, Pioruny i Patyki.
   - Ikony `🌈` dla 51 i `⚡🌈` dla 53.
3. **`js/interaction.js` & `js/entities/projectile.js`**:
   - Obsługa różnych czarów w Magicznej Różdżce (Błyskawica ⚡, Kula Ognia 🔥, Skamienienie 🪨).
   - Przełączanie czarów i efekty wizualno-dźwiękowe.
4. **Weryfikacja składni i bump cache**:
   - Weryfikacja Python AST.
   - Test i git commit.
