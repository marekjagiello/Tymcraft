# Plan BMAD: Interaktywna Księga Receptur (Recipe Book) i Odstraszacz Potworów (Monster Repellent)

## 1. Zgłoszenie Użytkownika (Tymek, 8 lat)
> „Nie da się zrobić tego... nie da się zrobić craftingu, a powinno się dać zrobić crafting. Koło tego jest taka książka, i ona się otwiera, i tam jest wszystkie przepisy, które się da zrobić, odstraszak dla potworów taki tam... i te, które możesz zrobić świeci ci się na zielono, i jak klikniesz to to od razu ci się robi, a tego, czego nie możesz zrobić świeci ci się na czerwono, i tego nie możesz zrobić, i jak to klikasz to pokazuje ci: Nie masz dobrych surowców, żeby tego zrobić!”

## 2. Diagnoza
1. **Ręczny crafting w siatce 2x2**:
   - Dla 8-latka pamiętanie dokładnego ułożenia klocków w siatce 2x2 (np. Linka dokładnie nad Patykiem, patyk na ukos od kamienia) bywa trudne lub nieczytelne.
   - Dotychczasowe okno craftingu zawierało jedynie statyczny tekst z wypisanymi kilkoma przepisami (`.crafting-recipe-hint`).
2. **Księga Receptur (Recipe Book jak w Minecraft)**:
   - Tymek chce interaktywnej książki obok siatki craftingu (zielona ikona książki 📗 / 📖).
   - Książka otwiera się i pokazuje wszystkie dostępne przepisy w grze.
   - **Podświetlanie na ZIELONO**: jeśli gracz MA surowce w plecaku/pasku:
     - Karta przepisu świeci na neonowy zielony kolor (`#10b981`).
     - Kliknięcie natychmiast wytwarza przedmiot (szybki autocrating!) i pobiera surowce z ekwipunku.
   - **Podświetlanie na CZERWONO**: jeśli gracz NIE MA surowców:
     - Karta przepisu świeci na czerwono (`#ef4444`).
     - Kliknięcie nie tworzy przedmiotu, odtwarza dźwięk ostrzegawczy i wyświetla komunikat:
       **„Nie masz dobrych surowców, żeby to zrobić!”**
3. **Odstraszacz Potworów (Monster Repellent)**:
   - Tymek wprost wymienił: „odstraszak dla potworów taki tam...”.
   - Dodać nowy przedmiot: `Odstraszacz Potworów` (ID 60, ikona 🗿/🕯️).
   - Receptura: 1x Patyk + 1x Kamień + 1x Kość/Proch/Róża.
   - Działanie: Gdy gracz posiada go w ekwipunku, wrogie potwory (Zombie, Szkielet, Creeper, Dirtik) boją się gracza, nie atakują go i uciekają w popłochu!

## 3. Plan Implementacji
1. **Baza Przedmiotów (`js/items.js`)**:
   - Dodać `MONSTER_REPELLENT: { id: 60, name: 'Odstraszacz Potworów', type: ITEM_TYPES.TOOL, damage: 4.0, icon: 'monster_repellent' }`.
2. **Definicje Receptur i Logika Autocraftingu (`js/crafting.js`)**:
   - Zdefiniować rejestr `RECIPES` zawierający wszystkie receptury (narzędzia, broń, zbroje, łuk, strzały, krzesiwo, odstraszacz potworów, magia).
   - Dodać funkcje sprawdzania dostępności surowców (`canCraftRecipe`) i szybkiego wytwarzania (`craftRecipeDirect`).
   - W `evaluateRecipe()` dodać obsługę manualnego ułożenia Odstraszacza Potworów w siatce 2x2.
3. **Logika Ucieczki Potworów (`js/entities/mobs/hostile.js`)**:
   - Dodać weryfikację `hasRepellent` u Zombie, Szkieleta, Creepera i Dirtika:
     - Jeśli gracz posiada Odstraszacz Potworów (ID 60), potwory w promieniu 14 bloków obracają się w przeciwnym kierunku i uciekają przed graczem. Creeper nie eksploduje!
4. **Efekty Dźwiękowe (`js/audio.js`)**:
   - Dodać `playWarningBuzzer()` (niski dźwięk odmowy/błędu).
   - Dodać `playCraftSuccessSound()` (pozytywny akord wytworzenia przedmiotu).
5. **Interfejs UI (`index.html`, `css/style.css`, `js/ui.js`)**:
   - W `#crafting-modal` zastąpić statyczny tekst interaktywną Księgą Receptur (`#recipe-book-container`) z przyciskiem książki (`#toggle-recipe-book-btn`).
   - Przygotować style dla kart przepisów:
     - `.recipe-card.available` (neonowa zielona ramka, zielony badge `✓ Gotowe!`, hover, kursor pointer),
     - `.recipe-card.unavailable` (czerwona ramka, czerwony badge `✕ Brakuje`, animacja potrząsania shake).
   - W `js/ui.js` zaimplementować `renderRecipeBook()`, aktualizowany automatycznie po każdej zmianie ekwipunku.
   - Obsługa kliknięcia:
     - Zielona karta -> `craftRecipeDirect()` + dźwięk + dymek `✨ Wytworzono!`,
     - Czerwona karta -> buzzer + shake + dymek `🚫 Nie masz dobrych surowców, żeby to zrobić!`.
6. **Weryfikacja i Testy CDP**:
   - Napisać test `tests/test_cdp_crafting_recipe_book.py` weryfikujący:
     - Otwarcie Księgi Receptur,
     - Czerwony stan początkowy (brak surowców) i komunikat ostrzegawczy przy kliknięciu,
     - Dynamiczne przejście w stan zielony po dodaniu surowców (np. drewna),
     - Natychmiastowe wytworzenie desek po kliknięciu zielonej karty,
     - Wytworzenie i działanie Odstraszacza Potworów.
7. **Cache Busting & Git Commit**:
   - Zaktualizować wersje importów `?v=recipe_book_v4`.
   - Zrobić atomowy commit w git.
