# Plan BMad: System 5 Questów, Pustynia, Mroźne Szczyty i Ciepła Kurtka

## 1. Wymagania Gracza (Tymek, 8 lat)
Z nagrania audio:
1. **System 5 Questów**:
   - Quest 1: Pokonaj dwa Dirtiki bez zginięcia ➜ Nagroda: **Ciepła Kurtka** 🧥.
   - Pozostałe 4 questy do uzgodnienia z Tymkiem (propozycje: wejście na szczyt góry, przetrwanie pustyni, napicie się wody, otwarcie Mystery Boxa).
   - Przeglądanie zadań w grze pod klawiszem (np. `J` / Dziennik Zadań lub komenda `questy` na czacie) – **BEZ** żadnych przycisków na HUD!
2. **Zimno na szczytach gór**:
   - Gdy gracz wejdzie na wysoką ośnieżoną górę (`biome === 'Mountains'`, `y >= 16` lub śnieg):
     - Jeśli gracz NIE ma Ciepłej Kurtki 🧥: postać trzęsie się z zimna (efekt trzęsienia kamery, szron na brzegach ekranu ❄️, wolniejszy spadek zdrowia lub głodu).
     - Jeśli gracz MA Ciepłą Kurtkę 🧥: jest mu ciepło i nic się nie trzęsie!
3. **Pustynia i Upał**:
   - W biomie Desert w dzień robi się gorąco ☀️.
   - Postać odczuwa pragnienie / gorąco (efekt falującego powietrza lub ikona pragnienia).
   - Gracz musi pić wodę z Butelki Wody 💧, aby się ochłodzić.
4. **Sekretne hasło `grat`**:
   - Wpisanie `grat` na czacie przyznaje Butelkę Wody 💧 (ID 45).
   - Picie wody (kliknięcie PPM z butelką w ręku) natychmiast gasi pragnienie i chłodzi postać.
5. **Przypomnienie haseł czatu**:
   - `Tymek` ➜ Starter pack (Kamienna zbroja, narzędzia, jedzenie).
   - `miał` ➜ Mystery Box 🎁.
   - `grat` ➜ Butelka z wodą 💧.

## 2. Architektura i Komponenty
- `js/items.js`:
  - ID 45: `WATER_BOTTLE` (Butelka Wody 💧)
  - ID 46: `WARM_JACKET` (Ciepła Kurtka 🧥)
- `js/survival.js` & `js/player.js`:
  - Mechanika temperatury: Cold (góry) oraz Heat (pustynia).
  - Efekt trzęsienia się kamery przy zimnie.
  - Picie wody pod PPM ochładza organizm.
  - Ciepła kurtka chroni przed chłodem.
- `js/quests.js`:
  - Manager questów śledzący postępy (pokonane Dirtiki, wejście na górę, itp.).
- `js/entities/mobs/hostile.js`:
  - Nowy mob `Robot`:
    - Forma ukryta: stalowy sześcian z pulsującą czerwoną diodą.
    - Transformacja: wstaje w odległości <= 5 kratek, rozkłada cyber-ramiona i wyjmuje miecz.
    - Obrażenia: 10 HP (dokładnie 5 serduszek!).
    - Życie: 30 HP (15 serduszek – silny miniboss).
- `js/ui.js`:
  - Komenda `grat` na czacie.
  - Wyświetlanie questów (np. pod klawiszem `J` lub po wpisaniu `questy`).

