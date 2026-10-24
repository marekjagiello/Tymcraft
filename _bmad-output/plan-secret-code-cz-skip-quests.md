# Plan BMAD: Tajne hasło "cz" (pominięcie zadań startowych i przejście do Etapu 2)

## 1. Wymagania użytkownika (Tymek, 8 lat)
- Tajne hasło: literowane **C Z** (czyli `cz`, `czy`, `c z`).
- **Ściśle tajne**: Nie pokazywać hasła w komendach pomocy `/pomoc` ani w widocznych podpowiedziach w HUD ("nie pokazujesz nigdzie tego hasła").
- Działanie:
  - Wpisanie na czacie niszczy / natychmiast zalicza wszystkie słabe zadania startowe (Etap 1).
  - Natychmiast odblokowuje lepsze, epickie kolorowe zadania (Etap 2: Zadania Mistrza).
  - Gracz otrzymuje Ciepłą Kurtkę (jeśli jeszcze jej nie posiada).

## 2. Architektura zmian
- `js/quests.js`:
  - Dodanie nasłuchiwania zdarzenia `quests:skip_starter` w `initEvents()`.
  - Implementacja metody `skipStarterQuests()`:
    - Ustawienie wszystkich zadań z `this.quests` na `completed = true`, `current = target`.
    - Nadanie Ciepłej Kurtki (ID 46).
    - Ustawienie `this.stage2Unlocked = true`.
    - Wywołanie `this.render()`, komunikatu na czacie oraz popupu.
- `js/ui.js`:
  - W `submitChat()` dodanie obsługi tajnego hasła `cz`, `czy`, `c z`.
  - Emisja zdarzenia `eventBus.emit('quests:skip_starter')`.
- Bump wersji cache w `index.html` i `js/main.js` do `?v=code_cz_1`.

## 3. Weryfikacja
- Sprawdzenie składni w Pythonie.
- Weryfikacja konsoli przeglądarki headless Chrome.
- Atomic commit w git.
