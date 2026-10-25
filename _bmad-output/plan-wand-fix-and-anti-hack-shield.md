# Plan BMad: Naprawa Różdżki, Kamery X-Ray oraz Wdrożenie Tarczy Anty-Hakerskiej

## 1. Zgłoszenie Tymka (8 lat)
Z nagrania audio:
> *"Em coś się stało z różdżką, bo jak klikam ten wybuch ognisty, znaczy jak klikam byle co, to jakby cały mi się świat, tam gdzie chodzę, to widzę wszystko. Jakby coś się zepsuło chyba z grą. Sprawdź cały kod do gry. Ogólnie, no sprawdź cały kod do gry. To będzie najpotrzebniejsze, sprawdź cały kod do gry. I i ogólnie wszystko sprawdź, okej? I obroń moją grę przed właśnie ludźmi, hakerami, takimi tam."*

✏️ **Uwaga językowa (przyjazna dla 8-latka)**:
Wypowiedź Tymka: *"coś się zepsuło chyba z grą"* ➔ poprawnie po polsku mówimy *"coś się chyba zepsuło w grze"*.

---

## 2. Diagnoza Przyczyn Błędu („Widzę wszystko” / Efekt X-Ray)
1. **Różdżka i czar Skamienienia (`spellType === 'stone'`) w `js/entities/projectile.js`**:
   - `MagicStoneSpell.onHitBlock()` stawiało blok kamienia (ID 3) w miejscu `prevPos` bez sprawdzania, czy to miejsce nie pokrywa się z ciałem ani głową gracza (`player.getAABB()`).
   - Gdy gracz rzucał czar blisko siebie, pod nogi lub idąc do przodu, blok kamienia był stawiany dokładnie w miejscu głowy/kamery gracza!
   - Ponieważ Three.js renderuje ścianki wokół bloków jednostronnie (`THREE.FrontSide`), a sąsiednie ścianki są ukrywane w meshu chunka (face culling), kamera wewnątrz bloku widzi świat jako całkowicie przezroczysty (tzw. glitch X-Ray). Gracz widział wszystkie jaskinie, surowce i ziemię na wylot.
2. **Kamera Trzecioosobowa (`KeyV` / `F5`) w `js/player.js`**:
   - Algorytm cofania kamery za plecy gracza miał minimalny dystans `0.5m` oraz dodawał `+0.2m` w osi Y po wykryciu kolizji.
   - Gdy gracz stawał tyłem do ściany lub pod niskim sufitem, kamera wnikała wewnątrz bloku ściany/sufitu, powodując identyczny efekt prześwietlenia całego świata.
3. **Brak pętli usuwania zacięcia (Auto-Unstuck) w `player.update()`**:
   - W `js/player.js` sprawdzanie uwolnienia z bloków było tylko w konstruktorze podczas ładowania gry!
   - Jeśli gracz w trakcie rozgrywki wpadł w blok, nie był z niego automatycznie wypychany.
4. **Brak ochrony przed próżnią (Y < 0)**:
   - Spadek poniżej Bedrocka powodował nieskończone spadanie w dół i widok świata od spodu.

---

## 3. Zakres Wprowadzanych Ulepszeń i Tarczy Anty-Hakerskiej

### A. Naprawa Różdżki i Czaru Kamienia (`js/entities/projectile.js` & `js/interaction.js`)
- Przekazanie referencji gracza do `MagicStoneSpell`.
- Rygorystyczny warunek kolizji: blok kamienia NIE MOŻE zostać postawiony, jeśli koliduje z `player.getAABB()` lub znajduje się w promieniu mniejszym niż 0.85m od gracza.
- Dodanie widowiskowych cząsteczek ognia dla Kuli Ognia 🔥, iskier dla Pioruna ⚡ i odłamków dla Kamienia 🪨.
- Aktualizacja nazwy aktywnego czaru w HUD (`blockNameEl`) przy wyborze różdżki i przy przełączaniu.

### B. Tarcza Anty-XRay i Auto-Unstuck (`js/player.js`)
- W każdej klatce `update()`, jeśli ciało lub głowa gracza dotknie wnętrza litego bloku, gracz zostaje natychmiast płynnie wypchnięty w górę na najbliższą wolną przestrzeń.
- Kamera z 3. osoby sprawdza kolizję z gęstym krokiem (0.15m) i jeśli jakikolwiek punkt kamery dotknąłby bloku lub sufitu, płynnie skraca dystans aż do oczu gracza. Kamera NIGDY nie wchodzi w ścianę ani sufit!

### C. Tarcza Anty-Próżniowa (Anti-Void Safety) (`js/player.js`)
- Jeśli gracz z jakiegokolwiek powodu spadnie poniżej `Y < 0.5` (np. pod Bedrock), magiczna tarcza natychmiast bezpiecznie go wyłapuje i teleportuje na solidną powierzchnię na tej samej pozycji X/Z.
- Wyświetla powiadomienie: `🛡️ Magiczna Tarcza Bezpieczeństwa uratowała Cię przed próżnią!`.

### D. Tarcza Anty-Hakerska TYMCRAFT (`js/ui.js`)
- Nowa komenda w czacie: `/tarcza`, `/haker`, `/antihack`, `/ochrona` wyświetlająca status ochrony gry.
- Komunikat serwera przy wejściu informujący o aktywnej tarczy anty-hakerskiej i anty-glitchowej.

---

## 4. Plan Weryfikacji
1. Test jednostkowo-integracyjny za pomocą Playwright / CDP:
   - Sprawdzenie rzucania czarów różdżką pod nogi i w ziemię.
   - Sprawdzenie cofania kamery 3. osoby przy ścianach.
   - Weryfikacja wypychania gracza z bloku (Auto-Unstuck).
   - Weryfikacja tarczy anty-próżniowej przy Y < 0.
   - Sprawdzenie komendy `/tarcza` na czacie.
2. Zwiększenie wersji cache (`?v=wand_anti_hack_v1`).
3. Atomic commit w repozytorium git.
