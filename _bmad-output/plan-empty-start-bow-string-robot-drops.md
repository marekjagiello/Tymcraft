# Plan BMAD: Pusty Start Ekwipunku, Nowy Przepis na Łuk (Linka nad Patykiem) i Drop z Robota (Żelazo + Linka)

## 1. Zgłoszenie Użytkownika (Tymek, 8 lat)
> „Ma się zaczynać bez rzeczy żadnych. Czyli, że nie ma żadnych rzeczy, że nie ma ani jednego kamienia, łuku. I typiory muszą... Łuk się robi tak, że są... patyk i nad tym... i nad tym może jakiś... czekaj... i nad tym linka. Linkę się dostaje za pokonanie robota, okej? Dostaje się żelazo i linkę.”

## 2. Diagnoza stanu obecnego
1. **Początkowy ekwipunek**:
   - `HOTBAR_BLOCKS` w `js/ui.js` zawierało predefiniowane 64 trawy, 64 ziemi, 64 kamienia, 32 drewna, łuk, 64 strzały, miecz itp.
   - W `js/main.js` (linie 99-117) kod automatycznie wymuszał dodanie Łuku i 64 Strzał, jeśli gracz ich nie miał.
   - Tymek chce prawdziwego survivalu – zaczyna się kompletnie BEZ ŻADNYCH RZECZY (0 bloków, 0 narzędzi, 0 kamienia, 0 łuku).
2. **Przepis na Łuk**:
   - Obecnie w `js/crafting.js` łuk tworzyło się z 3 patyków.
   - Tymek zarządził nowy przepis: **Linka nad Patykiem** (pionowo: górny slot Linka, dolny slot Patyk w siatce 2x2).
3. **Drop z Robota**:
   - Obecnie Robot dropił tylko Niebieski Pierwiastek.
   - Tymek zarządził: Robot dropi **Żelazo** oraz **Linkę**!

## 3. Plan Implementacji
1. **Rejestr Przedmiotów (`js/items.js`)**:
   - Dodać `STRING` (ID: 57, 'Linka', typ: MATERIAL).
   - Dodać `IRON_INGOT` (ID: 58, 'Żelazo', typ: MATERIAL).
2. **Początkowy Ekwipunek (`js/ui.js` i `js/main.js`)**:
   - Zmienić `HOTBAR_BLOCKS` na 9 pustych slotów (`id: 0, name: 'Puste', count: 0`).
   - Usunąć z `js/main.js` blok wymuszający automatyczne dodawanie Łuku i Strzał.
   - Nowo rozpoczęta gra lub reset świata startuje w 100% z pustym ekwipunkiem gracza.
3. **Nowy Przepis na Łuk (`js/crafting.js`)**:
   - Zastąpić stary przepis 3 patyków nową recepturą: **1x Linka (57) nad 1x Patykiem (20)**:
     - `s0 === 57 && s2 === 20` (lewa kolumna) lub `s1 === 57 && s3 === 20` (prawa kolumna),
     - a także wsparcie dla dowolnych 2 slotów: Linka + Patyk w siatce 2x2 dla wygody 8-latka.
     - Wynik: 1x Łuk (ID 29).
   - Zaktualizować spis przepisów w `index.html`: `• 1x Patyk + 1x Linka (nad patykiem) ➔ 🏹 Łuk`.
4. **Drop z Robota (`js/entities/mobs/hostile.js`)**:
   - W `Robot.die()` dodać pewny drop:
     - 1-2x Linka (ID 57),
     - 1-2x Żelazo (ID 58),
     - plus ewentualnie Niebieski Pierwiastek.
   - W `MiniRobot.die()` również dodać szansę na Linkę / Żelazo.
   - Zaktualizować powiadomienie czatu: `🏆 Zwycięstwo! Pokonałeś Robota! Zdobyłeś Żelazo 🔩 i Linkę 🧵 do stworzenia Łuku!`.
5. **Wizualizacja Dropów i Ikon (`js/drops.js`, `js/ui.js`)**:
   - W `js/drops.js`: dodać `createStringMesh()` i `createIronIngotMesh()`.
   - W `js/ui.js`: dodać ikony dla ID 57 (🧵) i 58 (🔩).
6. **Weryfikacja Testami CDP**:
   - Utworzyć test `tests/test_cdp_empty_start_bow_string_drops.py`:
     - Sprawdzić, że reset świata lub nowy start ma wszystkie sloty hotbara i plecaka równe 0 (brak kamienia, brak łuku).
     - Sprawdzić pokonanie Robota -> drop Linki (57) i Żelaza (58).
     - Sprawdzić crafting Łuku: Linka nad Patykiem daje Łuk (29).
     - Sprawdzić, że 3 patyki już NIE dają łuku.
   - Uruchomić pełny zestaw testów CDP.
7. **Cache Busting & Atomic Commit w Git**.
