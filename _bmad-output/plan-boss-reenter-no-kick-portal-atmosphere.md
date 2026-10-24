# Plan: Możliwość ponownego wejścia do Bossa, naprawa ciemności po śmierci oraz brak portalu wywalającego

## 1. Kontekst i zgłoszenie Tymka
Tymek (8 lat) nagrał wiadomość audio:
> *"Czemu już drugi raz nie mogę wejść do bossa? Czyli, że jak już raz mnie pokonał, to nie mogę drugi raz wejść. Okej? I to nie jest mroczny świat. I nie ma portalu, który mnie wywala."*

### Źródła problemów w kodzie:
1. **Brak możliwości ponownego wejścia po śmierci (`Czemu już drugi raz nie mogę wejść`)**:
   - W `js/main.js` zdarzenie `eventBus.on('player:death')` wyłączało tylko muzykę bossa, ale **nigdy nie ustawiało `this.isInDarkDimension = false`** ani nie czyściło stanu areny.
   - W `enterDarkDimension()` warunek `if (this.isInDarkDimension) return;` natychmiast blokował ponowne wejście przez portal, bo flaga pozostawała `true` na zawsze po śmierci gracza.
   - Dodatkowo, jeśli Boss przeżył walkę, jego stan nie był resetowany do pełnego zdrowia (160 HP) przy kolejnym wejściu.
2. **Ciemność w normalnym świecie po odrodzeniu (`I to nie jest mroczny świat`)**:
   - W `updateDayNight()` w `js/main.js` warunek sprawdzał `if (this.isInDarkDimension || player.x > 800)`. Ponieważ flaga nie gasła, w normalnym świecie (x=32) niebo pozostawało czarne (`0x06060c`), a mgła gęsta i mroczna, mimo że gracz był w zwykłym świecie.
3. **Portal wywalający gracza (`I nie ma portalu, który mnie wywala`)**:
   - `spawnVictoryPortal()` tworzył w centrum areny portal, który w pętli co 150 ms sprawdzał `distToPortal <= 2.2` i **automatycznie wyrzucał gracza z areny** do normalnego świata (`dimension:return_to_overworld`).
   - Portal ze starej walki nie był usuwany przy ponownym wejściu do areny, przez co wejście na środek areny natychmiast wyrzucało gracza.

---

## 2. Plan wdrożenia zmian

### Krok 1: Naprawa logiki śmierci i ponownego wejścia w `js/main.js`
- W `eventBus.on('player:death')`:
  - Ustawić `this.isInDarkDimension = false`.
  - Ukryć Boss Bar (`this.ui.hideBossBar()`).
  - Posprzątać pochodnie areny (`this.clearArenaTorches()`).
  - Usunąć stary `victoryPortal` ze sceny.
- W `updateDayNight()`:
  - Ściśle powiązać mroczną atmosferę z rzeczywistą pozycją gracza `this.player.position.x > 800`. Gdy gracz jest w normalnym świecie (x < 800), flaga `this.isInDarkDimension` musi być `false`, a niebo błękitne/słoneczne.
- W `enterDarkDimension()`:
  - Warunek wejścia: blokować tylko jeśli gracz faktycznie już jest na arenie (`this.player.position.x > 800 && this.isInDarkDimension`).
  - Przed teleportacją usunąć wszelkie pozostałości po poprzednim portalu `victoryPortal`.
  - Zresetować zdrowie i stan Bossa Robota (160 HP, pozycja 1000, 12, 1000), aby gracz zawsze mógł stoczyć świeżą walkę rewanżową.

### Krok 2: Usunięcie automatycznego wywalania przez portal w `js/entities/mobs/hostile.js`
- Usunąć automatyczne wywalanie gracza przy zbliżeniu na odległość 2.2 bloku w `spawnVictoryPortal()`.
- Portal nie ma prawa samowolnie wyrzucać gracza z areny. Gracz ma pełną swobodę zbierania dropów i podziwiania areny.
- Zapewnić bezpieczny powrót (np. tylko na wyraźne kliknięcie PPM na portalu lub komendę `/wroc`).

### Krok 3: Weryfikacja testami CDP
- Napisać test CDP `tests/test_cdp_boss_reentry_and_no_kick.py` sprawdzający:
  1. Gracz wchodzi do bossa, "ginie" i odradza się w normalnym świecie.
  2. Normalny świat ma normalne błękitne niebo (a nie mroczny świat!).
  3. Gracz buduje/podpala portal drugi raz i bez problemu ponownie wkracza na arenę Bossa.
  4. Boss na arenie jest zresetowany do pełnego HP (160 HP) i gotowy do walki.
  5. Żaden portal nie wyrzuca gracza automatycznie przy podejściu do środka areny.

### Krok 4: Pytania do Tymka
- Skonsultować z Tymkiem szczegóły i zapytać, jak woli wracać z areny po wygranej walce!
