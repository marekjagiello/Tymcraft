# Plan Implementacji BMad: Klawisz Q do Czatu, Zmniejszenie Ilości Wody i Upiększenie Tekstur

## 1. Wymagania Gracza (8 lat)
Z nagrania audio od 8-letniego gracza:
1. **Otwieranie czatu klawiszem Q**:
   - Po wciśnięciu klawisza `Q` otwiera się czat, w którym gracz może wpisać komendę `Tymek` (lub inne wiadomości).
   - Zachowanie istniejących klawiszy (`=`, `/`, `-`, `T`, `Enter`) obok nowego skrótu `Q`.
2. **Dużo mniej wody na mapie**:
   - "I daj dużo mniej wody, no bo ta woda to po całym świecie się roznosi, dosłownie nie ma po co..."
   - Obecnie poziom morza (`SEA_LEVEL = 7`) oraz zbyt niski próg generowania jezior (`lakeNoiseVal < -0.22`) zalewały niemal połowę mapy wodą.
   - Obniżenie poziomu wody i zaostrzenie progu jezior (stawy rzadkie, urocze, małe oczka wodne, a nie wielkie rozlane oceany).
   - Większość świata to suchy, przyjemny do biegania ląd z trawą, wzgórzami, drzewami i kwiatami.
3. **Ładniejsze tekstury wszystkiego ("ładniej tekstury tego... wszystkiego")**:
   - Upiększenie generowania pikseli w `js/textures.js`:
     - **Bruk (Cobblestone)**: wyraźne, zaokrąglone kamienie ze szczelinami, cieniami i światłocieniem zamiast prostej szachownicy.
     - **Deski (Planks)**: ciepły, miodowy odcień dębu z widocznymi słojami drewna, gwoździami i fazowanymi krawędziami.
     - **Trawa (Grass Top & Side)**: soczysta, żywa zieleń, piękne zwisające źdźbła trawy na żyzną, ciepłą ziemię.
     - **Ziemia (Dirt)**: bogata, czekoladowa gleba z drobnymi kamyczkami i naturalną głębią.
     - **Kamień (Stone)**: autentyczna minecraftowa faktura skały o gładkich przejściach i mineralnych plamkach.
     - **Piasek (Sand)**: ciepłe, złociste wydmy z delikatnymi falami wiatru.
     - **Szkło (Glass)**: krystaliczne, przezroczyste z charakterystycznymi lśniącymi smugami światła.
     - **Rudy diamentu i rubinu**: wyraziste, lśniące kryształy na kamiennej matrycy.

---

## 2. Architektura Techniczna i Plany Zmian

### 1. Klawisz `Q` (`js/ui.js`):
- W `initEvents`: dodanie `e.code === 'KeyQ' || e.key === 'q' || e.key === 'Q'` do warunku `isChatTrigger`.
- Aktualizacja wskazówki powitalnej w czacie: `"💬 Wciśnij Q (lub T / =), aby otworzyć czat! Wpisz Tymek, aby odebrać zestaw startowy 🎁"`.

### 2. Generowanie terenu i redukcja wody (`js/world.js`):
- `SEA_LEVEL`: zmiana z `7` na `3`.
- Próg jezior: zmiana z `lakeNoiseVal < -0.22` na `lakeNoiseVal < -0.58` (małe, rzadkie stawy w głębokich zagłębieniach).
- Poziom wody w jeziorach: maksymalnie wysokość `5-6` zamiast `8-9`, bez zalewania wzgórz, dolin czy lasów.
- Piaszczyste brzegi tylko wokół rzeczywistych małych stawów, reszta to suchy, trawiasty brzeg.

### 3. Paleta i generatory tekstur (`js/textures.js`):
- Przebudowa funkcji `drawTile` dla:
  - `TILES.COBBLE`: stylizowany Minecraft Cobblestone z trójwymiarowymi kamieniami i fugami.
  - `TILES.PLANKS`: deski z ciemnymi fugami, kropkami po gwoździach i ciepłą fakturą drewna dębowego.
  - `TILES.GRASS_TOP`: żywsza, bardziej nasycona zieleń łąkowa.
  - `TILES.GRASS_SIDE`: ładniejsze zwisające ząbki trawy z cieniem pod spodem.
  - `TILES.DIRT`: ciepła, estetyczna ziemia z urozmaiconą granulacją.
  - `TILES.STONE`: wyrazistsza skała z subtelnymi odcieniami szarości.
  - `TILES.SAND`: delikatne, ciepłe fale piasku.
  - `TILES.GLASS`: eleganckie ramki i refleksy.

### 4. Cache Busting i Weryfikacja:
- Bump wersji cache do `?v=beautify_1` w `index.html` oraz `js/main.js`.
- Test składni pythonem.
- Weryfikacja w przeglądarce i atomic commit.
