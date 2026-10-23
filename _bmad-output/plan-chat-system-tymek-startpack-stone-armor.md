# Plan Implementacji BMad: Czat Gry, Zestaw Startowy Tymka i Kamienna Zbroja

## 1. Wymagania Gracza (8 lat)
Z nagrania audio od 8-letniego gracza:
1. **Czat w grze**:
   - Otwieranie czatu jednym klawiszem: paseczek równy (`=`) lub nierówny (`/`), myślnik (`-`), klawisz `T` lub `Enter`.
   - Czat pozwala pisać wiadomości i komendy.
2. **Komenda Tymka na Zestaw Startowy ("Start Pack")**:
   - Gdy w czacie wpisze się komendę (np. `=Tymek`, `/Tymek`, `Tymek` pisane z dużej litery i małych, a także elastycznie bez względu na wielkość liter):
   - Gracz otrzymuje **Zestaw Startowy (Start Pack)**:
     - ⛏️ **Kamienny Kilof** (Stone Pickaxe, ID 22, 1 sztuka)
     - ⚔️ **Kamienny Miecz** (Stone Sword, ID 25, 1 sztuka)
     - 🪨🛡️ **Kamienna Zbroja** ("mała zbroja kamienna", Stone Armor, ID 43, 1 sztuka)
3. **Nowy przedmiot: Kamienna Zbroja (Stone Armor)**:
   - "mała zbroja kamienna" wspomniana przez gracza.
   - Nowy przedmiot w `js/items.js` (ID 43, typ `material`, ikona `stone_armor` 🛡️ z szarym blaskiem).
   - Ochrona: Zwiększa maksymalne zdrowie do 26 HP (13 serduszek, 3 kamienne serduszka 🩶).
   - Wizualizacja w 3D: Gracz nosi szary kask i napierśnik z kamienia (`0x78716c`).
   - Przepis craftingu 2x2: 4x Bruk (Cobblestone, ID 11) daje Kamienną Zbroję!
4. **Wiadomości na czacie i nick Tymka**:
   - Po odebraniu pakietu powitanie: `[Serwer] 🎁 Witaj Tymek! Otrzymałeś Zestaw Startowy (Kamienny Kilof, Kamienny Miecz, Kamienna Zbroja)!`
   - Odtworzenie dźwięku sukcesu i popup na ekranie.
   - Gdy gracz pisze na czacie po użyciu komendy, jego nick to `<Tymek>` (domyślnie `<Gracz>`).

---

## 2. Architektura Techniczna

### 1. `js/items.js`:
- Dodanie `STONE_ARMOR`: `{ id: 43, name: 'Kamienna Zbroja', type: ITEM_TYPES.MATERIAL, icon: 'stone_armor' }`.
- Aktualizacja `isArmor(id)`: obsługa ID 43.

### 2. `js/crafting.js`:
- Przepis na Kamienną Zbroję: 4x Bruk w siatce 2x2.

### 3. `js/drops.js`:
- Dodanie modelu leżącej zbroi dla ID 43 (oraz 32, 37).

### 4. `js/player.js`:
- Aktualizacja `setArmorVisual(type)`: dla typu 43 ustawienie koloru kamiennego (`0x78716c` / `0x64748b`) na hełmie i napierśniku.
- W `onKeyDown`: ignorowanie klawiszy WASD/Space, gdy aktywne jest pole wpisywania czatu (`document.activeElement.tagName === 'INPUT'`).

### 5. `js/survival.js` i `js/main.js`:
- W `survival.getArmorType`: obsługa ID 43 (Kamienna Zbroja).
- W `survival.update`: ustawienie `maxHealth = 26` dla kamiennej zbroi.
- W `ui.js`: renderowanie kamiennych serduszek 🩶 przy `armorType === 43`.

### 6. System Czatu (`js/chat.js` lub zintegrowany z `js/ui.js`):
- Elementy DOM: `#chat-container`, `#chat-messages`, `#chat-input-row`, `#chat-input`.
- Otwieranie: Klawisze `=`, `/`, `-`, `t`, `T`, `Enter`.
- Po otwarciu: odblokowanie wskaźnika myszy (`controls.unlock()`), skupienie na input.
- Wysyłanie: Klawisz `Enter`.
- Zamykanie bez wysłania: Klawisz `Escape`.
- Parsowanie komend:
  - Wpisanie `Tymek`, `=Tymek`, `/Tymek`, `-Tymek` przyznaje zestaw startowy!
  - Wpisanie `/pomoc` lub `/help` wyświetla listę komend.
  - Wpisanie `/clear` czyści wiadomości.
  - Zwykłe wiadomości pojawiają się w logu czatu i znikają po 9 sekundach.

---

## 3. Etapy Realizacji (Atomic Commits)
1. **Etap 1**: Rejestracja `STONE_ARMOR` (ID 43) w `js/items.js`, ikony w `js/ui.js`, craftingu w `js/crafting.js` oraz wizualizacji w `js/player.js` i statystyk w `js/survival.js`.
2. **Etap 2**: Implementacja komponentu Czatu w `index.html`, `css/style.css` i `js/ui.js` z obsługą skrótów klawiszowych (`=`, `/`, `-`, `T`, `Enter`) oraz ochrony przed kolizją sterowania WASD.
3. **Etap 3**: Implementacja komendy `Tymek` / `=Tymek` z wręczaniem Zestawu Startowego (kilof, miecz, kamienna zbroja) i efektów dźwiękowych/wizualnych.
4. **Etap 4**: Weryfikacja składni pythonem, odświeżenie cache (`?v=chat_1`), weryfikacja w przeglądarce i atomic commit.
