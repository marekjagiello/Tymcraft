# Plan Implementacji BMad: Mystery Box (Kod "miał"), Naprawa Sterowania i Przełączanie Czatu Klawiszem Q

## 1. Wymagania Gracza (8 lat)
Z nagrania audio od 8-letniego gracza Tymka:
1. **Naprawa poruszania się i ekwipunku**:
   - Gracz zgłosił: *"Nie mogę się w ogóle ruszać i nie da się wejść do ekwipunku"*.
   - Klawisz `Q` ma działać jako przełącznik (toggle) czatu:
     - Wciśnięcie `Q` ➔ otwiera czat.
     - Ponowne wciśnięcie `Q` (lub `Escape`) ➔ natychmiast zamyka czat, odzyskuje sterowanie graczem i blokuje wskaźnik myszy.
     - Po zamknięciu czatu pole tekstowe natychmiast traci fokus (`blur()`), dzięki czemu klawisze WASD, Spacja, E i R (plecak) działają natychmiastowo i bez zacięć!
2. **Ukrycie tajnych kodów**:
   - *"I nie pokazujesz tego na początku, że jak się napisze Tymek na czacie, to to ci daje... Nie pokazujesz! Oni muszą zgadnąć na czacie co się pisze!"*
   - Usunięcie zdradzania haseł z powitalnego komunikatu czatu. Czat wita dyskretną wskazówką: *"💬 Wciśnij Q, aby otworzyć czat! Odkrywaj tajne hasła... 🤫✨"*.
3. **Mystery Box na hasło "miał"**:
   - Gdy gracz wpisze na czacie **`miał`** (lub `mial`, `Miał`, `=miał`, `/miał`):
   - Dostaje do ekwipunku **Mystery Boxa (Tajemniczą Skrzynkę)** 🎁 (nowy przedmiot ID 44).
   - Kliknięcie **Prawym Przyciskiem Myszy (PPM)** na Mystery Boxa w ręku:
     - Otwiera skrzynkę z fanfarami i efektami dźwiękowymi!
     - Zostaje wylosowana wspaniała nagroda (diamenty 💎, rubiny 🔴, legendarny Rubinowy Miecz 🗡️, Diamentowa Zbroja 🛡️, jabłka 🍎 itp.)!
     - W ekwipunku i na ekranie pojawia się nagroda i radosny komunikat: `🎁 Mystery Box otwarty! Zdobyto: ... 🎉`!

---

## 2. Architektura Techniczna i Wdrożenie

### 1. `js/items.js`:
- Nowy przedmiot: `MYSTERY_BOX: { id: 44, name: 'Mystery Box', type: ITEM_TYPES.MATERIAL, icon: 'mystery_box' }`.

### 2. `js/ui.js`:
- Ikona dla ID 44 w `createSlotItemIcon`: złota paczka prezentowa `🎁` z lśniącym filtrem `drop-shadow(0 0 6px #f59e0b)`.
- Poprawka przełączania czatu klawiszem `Q`:
  - Jeśli czat jest otwarty i użytkownik wciśnie `Q` w polu czatu (lub pole jest puste), następuje natychmiastowe zamknięcie czatu (`closeChat()`).
  - Metoda `closeChat()` wykonuje `blur()` na `chatInputEl` i `document.activeElement`, ustawia `isChatOpen = false`, zamyka UI i blokuje sterowanie `controls.lock()`.
  - Usunięcie zdradzania kodu `Tymek` z powitania czatu.
  - Obsługa tajnego kodu `miał` / `mial`:
    - Przyznaje przedmiot ID 44 (`Mystery Box`) 1 sztukę.
    - Wypisuje w czacie: `🐱 Miau! Otrzymałeś tajemniczy Mystery Box 🎁! Kliknij PPM, aby go otworzyć!`

### 3. `js/interaction.js`:
- W `onPointerDown` (kliknięcie PPM):
  - Jeśli gracz trzyma w ręku ID 44 (`Mystery Box`):
    - Otwarcie skrzynki!
    - Odtworzenie dźwięku fanfar i sukcesu.
    - Zużycie 1 sztuki Mystery Boxa.
    - Losowanie nagrody z tabeli dropów (np. Diamenty, Rubiny, Rubinowy Miecz, Diamentowa Zbroja, Jabłka).
    - Dodanie nagrody do ekwipunku (`ui.addItem(...)`).
    - Wyświetlenie efektownego popupu i wiadomości w czacie.

### 4. `js/drops.js`:
- Model 3D leżącego Mystery Boxa: fioletowo-złota sześcienna paczka z wstążką!

### 5. `js/player.js`:
- Zabezpieczenie `onKeyDown`: upewnienie się, że gdy czat jest zamknięty, żadne pole tekstowe nie blokuje sterowania WASD ani skrótów E/R.

### 6. Weryfikacja i Commit:
- Bump cache do `?v=mystery_1`.
- Weryfikacja składni pythonem.
- Commit w git.
