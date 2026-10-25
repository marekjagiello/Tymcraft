# Plan BMad: Pełna Tarcza Ochrony Gry Tymka (Anti-Download & Full Game Security Shield)

## 1. Zgłoszenie Tymka (8 lat)
Z nagrania audio:
> *"Zrób silniejszą tą tarczę ochrony, żeby... żeby nie dało się ściągnąć tej mojej gry, zrobić lepszej i ten, bo mój tata będzie chciał zobaczyć czy dobrze zrobiłeś tą grę i chce... będzie chciał ściągnąć, a ty masz... i ma mu pokazać: nie możesz ściągnąć, bo ma własną... bo ma własną swoją ochronę! Czyli ty mi stworzysz ochronę na całą grę."*

✏️ **Uwaga językowa (przyjazna dla 8-latka)**:
- Wypowiedź: *"Zrób silniejszą tą tarczę ochrony"* ➔ poprawnie po polsku mówimy: **„Zrób silniejszą tę tarczę ochrony”** 😉.
- Wypowiedź: *"bo ma własną swoją ochronę"* ➔ mówimy: **„ma swoją własną ochronę”** (lub „ma własną tarczę ochrony”).

---

## 2. Wymagania Funkcjonalne Tarczy

1. **Blokada pobierania i ściągania gry (Anti-Download Shield)**:
   - Przechwytywanie skrótu `Ctrl+S` / `Cmd+S` (Zapisz stronę / pobierz grę):
     - Blokada domyślnej akcji przeglądarki (`e.preventDefault()`).
     - Dźwięk cyber-tarczy.
     - Duży popup na środku ekranu:
       `🛡️ [BLOKADA ŚCIĄGANIA TYMCRAFT]: Nie możesz ściągnąć tej gry, bo ma własną ochronę! 🔒👑`
     - Komunikat w czacie gry:
       `[🛡️ System Bezpieczeństwa]: 🚫 Próba pobrania gry zablokowana! Gra Tymka posiada własną, nienaruszalną tarczę obrony! Nikt nie może jej ściągnąć ani skopiować! 🔒✨`
   - Przechwytywanie `Ctrl+U` (Wyświetl źródło strony): blokada i powiadomienie o ochronie kodu.
   - Przechwytywanie menu pod prawym przyciskiem myszy (`contextmenu`): blokada opcji „Zapisz jako...” na całej stronie z powiadomieniem o ochronie.

2. **Komendy w czacie (dla Taty i innych graczy)**:
   - Komendy: `/pobierz`, `/sciagnij`, `/ściągnij`, `/download`, `/tata`, `/save`, `/kopia`, `/skopiuj`:
     - Odpowiedź czatu: `[🛡️ System Ochrony]: 🚫 NIE MOŻESZ ŚCIĄGNĄĆ TEJ GRY! Gra Tymka ma swoją własną ochronę! Nikt nie może jej ściągnąć ani zrobić lepszej! 👑🔒`
     - Popup: `🚫 Nie możesz ściągnąć tej gry, bo ma własną ochronę! 🛡️`

3. **Certyfikat Bezpieczeństwa w Konsoli i Menu**:
   - W konsoli przeglądarki (gdyby ktoś otworzył F12):
     Wielki, kolorowy baner ASCII `TYMCRAFT SECURITY SHIELD`:
     `🛡️ SYSTEM OCHRONY GRY TYMKA JEST AKTYWNY! NIE MOŻESZ ŚCIĄGNĄĆ ANI SKOPIOWAĆ TEJ GRY! 🔒`
   - W menu pauzy (Esc) oraz przy ładowaniu:
     Odznaka Certyfikatu Bezpieczeństwa Gry Tymka.

4. **Nienaruszalność gry w kodzie (Anti-Tamper)**:
   - Zabezpieczenie obiektu `window.game` (`writable: false, configurable: false`).
   - Flaga `window.game.isGameProtected = true`.

---

## 3. Plan Implementacji
1. `js/security.js`:
   - Nowy moduł bezpieczeństwa integrujący blokadę skrótów klawiszowych (`Ctrl+S`, `Ctrl+U`, `F12`), blokadę menu kontekstowego, baner w konsoli oraz komunikaty obronne.
2. `js/main.js`:
   - Inicjalizacja `SecurityShield` przy starcie gry.
3. `js/ui.js`:
   - Obsługa komend pobierania w czacie (`/pobierz`, `/sciagnij`, `/tata` itp.).
4. `index.html`:
   - Tytuł: `Tymcraft — Oficjalna Gra Tymka (Chroniona Tarczą) 🛡️`.
   - Złota odznaka bezpieczeństwa w menu gry.
5. Bump wersji cache (`?v=full_game_shield_v3`).
6. Weryfikacja składni i git commit.
