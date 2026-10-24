# Plan BMAD: Usunięcie Tłumacznika z Craftingu i z Początku Gry

## 1. Zgłoszenie Użytkownika (Tymek, 8 lat)
> „Czemu ten tłumacz jest wszędzie? W craftingu go ma nie być, w craftingu nie ma być tłumacza, i na początku też ma nie być... nie widzieć tłumacza i pięciu tych zasad.”

## 2. Diagnoza
Wcześniej Tłumacznik został dodany w wielu miejscach:
1. **W oknie Craftingu (`index.html`)**: W sekcji `.crafting-recipe-hint` znajdował się fioletowy blok `🎙️ Tłumacznik radzi:` z podpowiedziami o portalu i totemie. Tymek tego nie chce – crafting ma być czysty i pokazywać tylko przepisy!
2. **Na początku gry w menu startowym (`index.html`)**: W `#pause-menu` znajdował się duży blok `#translator-guide-box` z nagłówkiem `🎙️ Tłumacznik – Rozpisane Zasady Dotarcia do Bossa:` i 5–6 regułami. Tymek nie chce widzieć tłumacza i tych zasad przy uruchamianiu gry.
3. **Na początku gry w czacie (`js/ui.js`)**: W metodzie `initChat()` po 1,5 sekundy od załadowania gry automatycznie wywoływało się `this.printTranslatorGuide(false);`, które wypisywało 5 zasad Tłumacznika na czacie. Tymek tego nie chce.

## 3. Plan zmian
1. **`index.html`**:
   - Usunąć blok `🎙️ Tłumacznik radzi:` z sekcji przepisów craftingu (`.crafting-recipe-hint`).
   - Usunąć blok `#translator-guide-box` z menu pauzy/startu (`#pause-menu`), aby menu startowe było czyste i nie zasypywało gracza zasadami tłumacznika.
2. **`js/ui.js`**:
   - W `initChat()` usunąć automatyczne wywołanie `this.printTranslatorGuide(false);` na starcie gry.
   - Pozostawić funkcję `printTranslatorGuide()` wyłącznie na wyraźne życzenie gracza po wpisaniu komendy w czacie (np. `/pomoc`, `/tlumacz`), aby funkcja pomocnicza nadal istniała na żądanie.
3. **Weryfikacja**:
   - Test CDP sprawdzający:
     - Brak Tłumacznika w oknie craftingu.
     - Brak bloku Tłumacznika i 5 zasad w menu startowym (`#pause-menu`).
     - Brak automatycznego wypisywania zasad Tłumacznika w czacie po uruchomieniu gry.
     - Dostępność Tłumacznika wyłącznie na wyraźną komendę `/pomoc` w czacie.
   - Aktualizacja testu `test_cdp_tlumacznik_and_no_kidnap.py`.
4. **Cache Busting**:
   - Podbicie parametrów `?v=clean_crafting_no_intro_tlumacz_v9`.
5. **Atomic Commit w Git**.
