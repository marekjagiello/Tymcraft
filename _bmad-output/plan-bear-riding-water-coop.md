# Plan Implementacji: Ujeżdżanie Niedźwiedzi, Struktury Wody i Tryb 2 Graczy

## 1. Cel i Wymagania (zgodnie z wyborem 8-letniego gracza)

1. **Uporządkowanie Startu & Ujeżdżanie Niedźwiedzi**:
   - Usunięcie tłoku i zamieszania w punkcie startowym:
     - Dokładnie 1 oswojony, przyjazny niedźwiedź (np. brunatny/grizzly) blisko gracza (3-4 kratek obok) z siodłem/gotowy do natychmiastowego dosiadania.
     - Odsunięcie innych mobów (pozostałych niedźwiedzi, dirtików, owiec) dalej w świat (min. 25-40 bloków).
   - Wsiadanie na misie za pomocą **Prawego Przycisku Myszy (PPM)** bezpośrednio na misia (lub klawisz `P`):
     - Wszystkie misie (brunatny, panda, grizzly, czarny, kermode): 99% szans na natychmiastowe dosiadanie i ujeżdżanie z serduszkami.
     - Biały Niedźwiedź Polarny (`polar`): Groźny, dziki i dumny drapieżnik arktyczny — zrzuca gracza / ryczy i nie pozwala na sobie jeździć (komunikat: *„🐻‍❄️ Biały Niedźwiedź Polarny jest zbyt dziki i groźny, by na niego wsiąść!”*).
     - Sterowanie niedźwiedziem: WASD, spacja (skok), sprint (Shift), LPM (atak łapą zadający potężne obrażenia), zejście z misia klawiszem `P` lub `Shift`/PPM.

2. **Ładne Struktury Wody (Jeziora, Stawy, Błękitna Falująca Woda & Lilie)**:
   - Generator świata (`world.js`):
     - Tworzenie naturalnych stawów i jezior na powierzchni terenu (zarówno w obniżeniach nizinnych, jak i leśnych zagłębieniach).
     - Dno jeziora wyłożone piaskiem (Sand - ID 8) i żwirem (Gravel - ID 13).
     - Lilie wodne (Water Lily Pad - blok na powierzchni wody) losowo zdobiące tafle jezior.
   - Wygląd i fizyka wody:
     - Piękna, krystalicznie błękitna tekstura wody z półprzezroczystością (`transparent: true, opacity: 0.75`), subtelny efekt falowania lub animacja klatkowa tekstury.
     - Płynne pływanie gracza w wodzie (zmniejszona grawitacja, wolniejszy ruch w wodzie, wynurzanie spacją).

3. **Wspólny Ekran dla 2 Graczy (Shared Screen Co-op)**:
   - Możliwość włączenia 2. gracza (np. klawiszem `2` na klawiaturze lub automatycznie):
     - Gracz 1: Sterowanie WASD + Mysz (rozglądanie, bicie LPM, budowanie PPM).
     - Gracz 2: Druga postać 3D na mapie (np. Alex w zielonej koszulce lub rycerz), sterowana Strzałkami (Góra/Dół/Lewo/Prawo), skok Numpad 0 / Prawy Shift, atak/interakcja Enter / Prawy Ctrl.
     - Kamera: Płynnie obejmuje obu graczy lub w trybie 3. osoby dynamicznie centruje się między nimi, gdy są blisko siebie, zapewniając super zabawę we dwójkę!

---

## 2. Etapy Wdrażania (Atomic Commits)

### Etap 1: Oczyszczenie Spawnu + Ujeżdżanie Niedźwiedzi (PPM, 99%, blokada polarnego)
- `js/entities/entity-manager.js`: Zmiana `spawnInitialAnimals()` — na starcie tylko 1 oswojony brunatny miś blisko gracza; inne niedźwiedzie i dirtiki rodzą się dalej.
- `js/interaction.js`: Obsługa kliknięcia PPM na niedźwiedzia — sprawdzenie rasy (polar vs inne) i wywołanie `mountBear()`.
- `js/player.js`: Poprawa płynności jazdy, skoku i schodzenia.
- Test w przeglądarce i Commit 1.

### Etap 2: Struktury Wody (Stawy, Jeziora, Błękitna Woda, Lilie)
- `js/world.js`: Generowanie stawów/jezior w nizinach i lasach, piaskowe brzegi, lilie wodne.
- `js/textures.js`: Błękitna, przezroczysta woda, tekstura lilii wodnej (TILES.LILY_PAD).
- `js/player.js`: Fizyka pływania (wyporność w wodzie).
- Test w przeglądarce i Commit 2.

### Etap 3: Drugi Gracz (Shared Co-op)
- `js/player.js` / `js/coop.js`: Instancja drugiego gracza z odrębnym modelem, sterowanie strzałkami.
- Kamera dostosowana do obu graczy.
- Test w przeglądarce i Commit 3.
