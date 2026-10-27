# Plan: Opuszczone Ogniska, Dialog Króla Świń i Naturalny Chłopięcy Głos

Na prośbę 8-letniego Tymka:
1. **Ładniejszy, naturalny głos Tymka (TTS)**:
   - "Zrób ładniejszy głos... ma być ładniejszy głos ten u mnie, okej? Że nie taki: 'd-o t-e-g-o p-o-t-r-z-e-b-u-j-e-s-z', taki roboczy, tylko ma być taki... taki mój, tylko trochę inny, okej? I wszędzie ma być taki, u każdego."
   - Dynamiczny wybór najlepszego głosu polskiego z `speechSynthesis.getVoices()` (np. naturalne głosy Google/Microsoft zamiast mechanicznego eSpeak).
   - Dedykowane parametry dla głosu Tymka (`pitch: 1.28`, `rate: 1.08`) – brzmiący jak wesoły, energiczny 8-letni chłopiec.
   - Bardziej naturalne formułowanie brakujących surowców w craftingu: *„Do zrobienia [przedmiot] brakuje Ci: [surowce]!”*.

2. **Dialog z Królem Świń**:
   - Ścisłe dopasowanie do scenariusza podanego przez Tymka w nagraniu:
     - 👑 Król Świń: *„Chrrr... Co ty robisz?”* (niski, chrumkający głos `pitch: 0.72` + chrumknięcie).
     - 🧑 Ty (Tymek): *„Ja tu przez przypadek wpadłem!”* (chłopięcy głos `pitch: 1.28`).
     - 👑 Król Świń: *„Chrrr! Straże! Zaatakować go!”* (niski, groźny głos `pitch: 0.70`).

3. **Zakaz stawiania klocków u Króla Świń**:
   - "Zrób tak, żeby się nie dało kłaść u świni, u króla świń."
   - W `js/interaction.js` w `placeBlock()`: blokada stawiania bloków na arenie Króla Świń (`PigKingdom` / promień wokół [2000, 2000]).
   - Komunikat na ekranie: `🐷👑 W królestwie Króla Świń nie można stawiać klocków!`.

4. **Opuszczone Ogniska (Abandoned Campfires)**:
   - "Nie ma ogniska, ognisko powinno być... mają być opuszczone ogniska."
   - Rejestracja bloku `Ognisko` (ID 61, `CAMPFIRE`) w `js/items.js` i `js/textures.js`.
   - Nowa tekstura żarzącego się drewna i ognia w atlasie 16x16.
   - Generowanie klimatycznych opuszczonych obozowisk z ogniskiem w lasach (`Forest`) w `js/world.js` (krąg kamienny, pieńki do siedzenia, w środku dymiące ognisko).
   - Efekt unoszącego się dymu nad aktywnymi ogniskami w świecie.
   - Przepis craftingu ogniska w `js/crafting.js`: 3 patyki + 1 drewno = 1 Ognisko.
