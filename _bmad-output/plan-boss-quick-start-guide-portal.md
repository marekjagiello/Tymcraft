# BMAD Implementation Plan: Krótka Instrukcja jak Wejść do Bossa na Początku Gry

## 1. Problem i Życzenie Użytkownika (Tymek, 8 lat)
- **Audio prompt Tymka**:
  > *„E ma być to jak przejść bossa, to ma pisać, że weź krzesiwo i... zrób portal z kamienia na dwie na dwie kratki, żeby twoja osób... żeby twój skin wszedł, a potem zapal pod siebie... krzesiwem i będziesz już u bossa. Życzę powodzenia! Coś takiego ma być, okej? Na początku gry. Ale takie krótkie.”*
- **Wymagania**:
  1. **Krótka instrukcja na początku gry**:
     - Dokładna treść wskazana przez Tymka:
       *„Weź krzesiwo i zrób portal z kamienia na 2 na 2 kratki, żeby twój skin wszedł, a potem zapal pod sobą krzesiwem i będziesz już u bossa. Życzę powodzenia!”*
     - Pokazuje się zaraz po starcie gry:
       - Na czacie jako elegancka wiadomość od `👑 Przewodnik`.
       - Jako zwięzły, ładny dymek/baner u góry ekranu (`#boss-start-guide-banner`), który znika po kilku sekundach lub po kliknięciu.
       - Na komendy czatu: `/pomoc`, `/boss`, `/portal`.
  2. **Zapalenie krzesiwem „pod sobą” wewnątrz portalu 2x2**:
     - W `js/interaction.js`:
       - Gracz może kliknąć krzesiwem nie tylko w sam blok kamienia, ale również w ziemię/podłogę pod sobą stojąc wewnątrz bramy 2x2 z kamienia!
       - `checkStonePortal(cx, cy, cz)` sprawdza obecność ramy z kamienia (3) lub bruku (12) w sąsiedztwie.
  3. **Krótka forma**:
     - Brak przeładowania zbędnymi długimi referatami – dokładnie krótkie, zrozumiałe i przyjazne podsumowanie dla 8-letniego gracza.

## 2. Architektura Rozwiązania
- `js/ui.js`:
  - Dodanie metody `showBossStartGuide()` wywoływanej przy starcie gry (1.2s po załadowaniu).
  - Wyświetlenie komunikatu na czacie oraz na ekranie w estetycznym banerze.
  - Zaktualizowanie komend czatu `/boss`, `/portal`, `/pomoc`.
- `js/interaction.js`:
  - Obsługa zapalenia krzesiwem podłogi pod graczem wewnątrz portalu kamiennego (`checkStonePortal`).
- `tests/test_cdp_boss_start_guide.py`:
  - Test CDP sprawdzający pojawienie się instrukcji na starcie gry i możliwość aktywacji portalu krzesiwem pod sobą.
- Commit po pomyślnych testach.
