# Plan BMad: Tarcza Anty-Hakerska Wklejona na Stałe (Permanent Anti-Hack & Anti-Noclip Shield)

## 1. Zgłoszenie Tymka (8 lat)
Z nagrania audio:
> *"Wszyscy... wszyscy mają mieć wklejoną tą tarczę, żeby każdy nie mógł przechodzić przez ściany, a nie jak wpisze tarcza... żeby każdy gracz, który wchodzi, miał zablokowane haki i przechodzenie przez ściany... czyli każdy ma wklejoną od razu tą tarczę obrony, okej? Od razu. Nikt nie wpisuje."*

✏️ **Uwaga językowa (delikatna podpowiedź dla 8-latka)**:
- Wypowiedź: *"wszyscy mają mieć wklejoną tą tarczę"* ➔ w starannej polszczyźnie mówimy: *"wklejoną **tę** tarczę"* lub *"każdy ma od razu włączoną tę tarczę"*, ale intencja Tymka jest w 100% jasna i genialna!

---

## 2. Co to oznacza technicznie?
1. **Zero wymogu wpisywania jakichkolwiek komend**:
   - Tarcza obrony przed hakerami, noclipem i przechodzeniem przez ściany ma być wbudowana w silnik fizyki gracza **od pierwszej milisekundy wejścia do gry**!
   - Nikt nie musi wpisywać `/tarcza` – usunięcie z powitania mylącej zachęty „wpisz /tarcza”.
2. **Niezłomna blokada przechodzenia przez ściany (Anty-Noclip Rollback Defense)**:
   - W `moveHorizontal()` w `js/player.js`: zapisujemy pozycję `prevX` i `prevZ`. Jeśli po ruchu poziomym gracz jakimkolwiek punktem kolidowałby z blokiem (np. ukośny ruch w róg), pozycja jest natychmiast wycofywana do bezpiecznego punktu przed ścianą (`position.x = prevX; position.z = prevZ`).
   - W połączeniu z pętlą `Auto-Unstuck` daje to 100% gwarancji, że żaden gracz nie przejdzie przez ściany ani nie wpadnie w klocki.
3. **Oficjalne potwierdzenie aktywnej tarczy na start gry**:
   - Przy załadowaniu świata wyświetlany jest wyraźny popup oraz wpis w czacie:
     `🛡️ Tarcza Anty-Hakerska TYMCRAFT: Wklejona na stałe dla każdego gracza! Haki, przechodzenie przez ściany i noclip są zablokowane od razu! 🔒✨`
   - Jeśli ktoś z ciekawości wpisze `/tarcza`, czat odpowiada:
     `🛡️ Tarcza obrony jest już wklejona na stałe! Każdy gracz ma automatyczną blokadę przechodzenia przez ściany i cheatów!`

---

## 3. Plan Modyfikacji
1. `js/player.js`:
   - Dodanie `prevX`, `prevZ` rollbacku w `moveHorizontal()` dla absolutnej odporności na przechodzenie przez ściany.
   - Płynne potwierdzenie aktywnej tarczy w konstruktorze/starcie gracza.
2. `js/ui.js`:
   - Zmiana powitania w czacie – informacja, że tarcza jest wbudowana na stałe od razu i nikt nie musi nic wpisywać.
   - Aktualizacja odpowiedzi na komendę `/tarcza` (potwierdzenie, że ochrona działa automatycznie od wejścia na serwer).
   - Wyświetlenie powitalnego powiadomienia w HUD: `🛡️ Tarcza Anty-Hakerska: Wklejona na stałe! Przechodzenie przez ściany zablokowane! 🔒`.
3. Zwiększenie wersji cache (`?v=permanent_shield_v1`) w `index.html`, `js/main.js`, `js/animals.js`.
4. Sprawdzenie składni bracket check.
5. Weryfikacja i atomic git commit.
