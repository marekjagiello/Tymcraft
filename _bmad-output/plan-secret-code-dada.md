# Plan BMAD: Tajne hasło "da da" (wymóg wcześniejszego "cz") i podsumowanie haseł

## 1. Wymagania użytkownika (Tymek, 8 lat)
- Nowe tajne hasło na czacie: **`da da`** (działa też **`da`** oraz **`dada`**).
- **Ściśle tajne**: Nie pokazywać hasła w komendach pomocy ani na ekranie ("i nigdy nie pokazujesz tego hasła").
- Działanie:
  - Daje "te wszystkie drugie nagrody":
    - **Kolorowy Miecz** 🌈🗡️ (ID 54)
    - **Kolorowy Łuk** 🌈🏹 (ID 55)
    - **Magiczna Kolorowa Strzała** 🌈🎯 (ID 56)
- **Warunek kolejności**:
  - "musisz najpierw napisać czy a dopiero potem da"
  - Hasło `da da` działa TYLKO wtedy, gdy gracz najpierw wpisał `cz` (lub ukończył Etap 1 i odblokował Etap 2).
  - Jeśli gracz spróbuje wpisać `da` przed `cz`, gra informuje go: "🔒 Najpierw musisz wpisać hasło „cz”!".
- **Przypomnienie haseł**:
  - Przypomnieć Tymkowi w odpowiedzi wszystkie dotychczasowe tajne hasła w grze.

## 2. Architektura zmian
- `js/main.js`:
  - Przekazanie referencji `this.ui.questManager = this.questManager;`.
- `js/quests.js`:
  - Dodanie flagi `this.czCodeUsed = false;`, ustawianej na `true` w `skipStarterQuests()`.
- `js/ui.js`:
  - W `submitChat()`:
    - Obsługa `da da`, `da`, `dada`.
    - Sprawdzenie, czy `this.questManager?.stage2Unlocked` lub `this.questManager?.czCodeUsed`.
    - Jeśli spełnione -> dodanie przedmiotów (54, 55, 56) i komunikat sukcesu.
    - Jeśli niespełnione -> komunikat, że najpierw trzeba wpisać `cz`.
- Bump wersji cache do `?v=code_dada_1`.

## 3. Weryfikacja
- Bracket syntax check w Pythonie.
- Weryfikacja w headless Chrome i logach konsoli.
- Atomic commit w git.
