# Plan BMAD: Tłumacznik (Rozpisane Zasady Bossa) & Usunięcie Teleportacji przez Małe Roboty

## 1. Kontekst i życzenie Tymka (8 lat)
Tymek w nagraniu wyjaśnił:
- **"Portalem ma przenosić kamiennym..."**: Jedyna droga do Bossa to portal z kamienia/bruku podpalony krzesiwem (crafting: 1x Patyk + 1x Kamień na skos).
- **"I nie, nie te małe ludki teleportują do bossa, tylko ten..."**: Małe ludki/roboty (`Robot`) w normalnym świecie **NIE MOGĄ** teleportować ani porywać gracza do wymiaru Bossa!
- **"i tam wszystko jest rozpisane, okej? Ma być wszystko rozpisane, jest tłumacznik i mówi... i mówi... i wszyscy muszą to przeczytać i tam wszystko pisze, okej?"**:
  Musi być postać/funkcja **Tłumacznika**, u którego wszystko jest dokładnie rozpisane i wyjaśnione (na czacie, w menu gry, w podpowiedziach craftingu i opcjonalnie głosowo przez syntezator mowy), tak aby każdy gracz mógł to przeczytać.

## 2. Zakres zmian
1. **Usunięcie teleportacji przez małe roboty (`js/entities/mobs/hostile.js`)**:
   - Usunięcie metody `triggerKidnap()` z klasy `Robot`.
   - Usunięcie porywania cyber-promieniem w `Robot.update()` (odstęp <= 3.8 nie teleportuje gracza).
   - Robot walczy normalnie mieczem laserowym; przy przebudzeniu mówi: *"Bzzzt! Do Bossa dotrzesz tylko przez Portal z Kamienia! 🤖⚔️"*.

2. **Tłumacznik w UI i czacie (`js/ui.js`)**:
   - Dodanie metody `printTranslatorGuide()`, która rozpisuje w czacie 5 kroków dotarcia i walki z Bossem.
   - Wywołanie rozpiski Tłumacznika po załadowaniu gry oraz na komendy czatu: `/pomoc`, `/boss`, `/portal`, `/tlumacz`, `/rozpiska`.
   - Wsparcie dla głosu lektora/tłumacznika przez `window.speechSynthesis` (język polski `pl-PL`).
   - Aktualizacja komunikatu wyczerpanych kodów: *"🔒 Ten kod został już wykorzystany na tej mapie! Kody odnawiają się dopiero po resecie gry w menu! 🔄"*.

3. **Rozpiska Tłumacznika w HTML (`index.html`)**:
   - Dedykowana ramka w menu pauzy/startu (`#start-overlay`) z tytułem:
     `🎙️ Tłumacznik – Rozpisane Zasady Dotarcia do Bossa:`.
   - Rozpiska krok po kroku:
     1. Krzesiwo z craftingu (Patyk + Kamień na skos).
     2. Brama z Kamienia/Bruku.
     3. Podpalenie portalu krzesiwem (brak teleportu przez małe roboty!).
     4. Totem na arenie (Ziemia + Kamień + krzesiwo).
     5. Pasek BOSS na górze ekranu.
     6. Zasada raz na mapę (reset w menu).
   - Wskazówka w oknie craftingu (`crafting-recipe-hint`).
   - Bump wersji cache buster do `?v=portal_boss_v5`.

4. **Weryfikacja w przeglądarce**:
   - Test CDP sprawdzający brak teleportacji przez małe roboty.
   - Test obecności rozpiski Tłumacznika w DOM i na czacie.
   - Pomyślne przejście istniejących testów.
