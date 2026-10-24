# BMAD Plan: Portal z Kamienia, Krzesiwo na skos, Aktywacja Totemu u Bossa, Pasek BOSS na górze i Limit Raz na Mapę

## Cel i Podsumowanie zgłoszenia Tymka (8 lat)
Tymek doprecyzował mechanikę gry w nagraniu głosowym:
1. **Limit kodów i Bossa**:
   - „Tylko raz na mapę! A jak się dopiero zresetuje grę to ten...”
   - Kody i Boss mają być dostępne **dokładnie raz na całą mapę**.
   - Odnawiają się **dopiero po pełnym resecie świata gry** (przycisk *Zresetuj świat* w menu), a **NIE** automatycznie po zabiciu bossa w trakcie tej samej mapy.
2. **Receptura Krzesiwa w craftingu 2x2**:
   - „A krzesiwo się nie robi kodem, tylko robi się patykiem i kamieniem na skos...”
   - Przepis 2x2: Patyk (ID 20) + Kamień/Bruk (ID 3/11) ułożone na skos (przekątna główna lub boczna).
   - Aktualizacja podpowiedzi w oknie ekwipunku (`index.html`).
3. **Portal z Kamienia do wymiaru Bossa**:
   - „Robisz portal z kamienia... i wtedy dopiero jesteś u bossa...”
   - Gracz buduje portal z kamienia (rama z kamienia, np. 3x3 lub 4x5, lub kliknięcie krzesiwem na kamienną ramę) i podpala krzesiwem.
   - Tworzy się portal teleportujący gracza do Mrocznego Wymiaru Bossa.
4. **Totem w Mrocznym Wymiarze**:
   - „I u bossa musisz zrobić ten totem i on się wtedy ten... jak robi ci się to on jest mały i rośnie...”
   - W Mrocznym Wymiarze Boss nie atakuje od razu w próżni; gracz stawia totem: Ziemia (ID 2) na dole + Kamień (ID 3) na górze i podpala Krzesiwem (ID 52)!
   - Wtedy totem wybucha, pojawia się Boss Robot, który zaczyna mały, trzęsie się i rośnie do gigantycznego kolosa (3.5x).
5. **Pasek BOSS na górze ekranu**:
   - „I pokazuje ci na górze BOSS, i wtedy ten...”
   - Elegancki Minecraftowy Boss Bar na samej górze ekranu:
     - Napis: `👑 BOSS ROBOT`
     - Pasek życia (kolor purpurowo-czerwony ze złotym blaskiem) pokazujący HP (do 160).
     - Widoczny gdy Boss żyje na arenie; znika po pokonaniu Bossa lub wyjściu.

---

## Architektura i plan wdrożenia

### Krok 1: Kody raz na mapę (Reset tylko po resecie gry)
- W `js/ui.js`:
  - Usunąć automatyczne wywołanie `this.resetSecretCodes()` ze słuchacza `boss_robot:defeated`.
  - W `resetWorld()` w `js/storage.js` lub obsłudze przycisku `#confirm-reset-yes`:
    - Wyczyścić `localStorage.removeItem('m2_used_codes')`.
    - Wyczyścić `localStorage.removeItem('m2_boss_robot_defeated')`.
    - Wywołać `window.game.ui.resetSecretCodes()`.

### Krok 2: Krzesiwo w craftingu (Patyk + Kamień na skos)
- W `js/crafting.js`:
  - Sprawdzenie w `evaluateRecipe()`:
    - Przekątna 1: `(s0 === 20 && (s3 === 3 || s3 === 11)) || ((s0 === 3 || s0 === 11) && s3 === 20)`
    - Przekątna 2: `(s1 === 20 && (s2 === 3 || s2 === 11)) || ((s1 === 3 || s1 === 11) && s2 === 20)`
    - Wynik: 1x Krzesiwo (`FLINT_AND_STEEL`, ID 52).
- W `index.html`:
  - Wskazówka w `crafting-recipe-hint`:
    `• 1x Patyk + 1x Kamień (na skos) ➔ 🔥 Krzesiwo`

### Krok 3: Portal z kamienia w Overworldzie
- W `js/interaction.js`:
  - Gdy gracz trzyma Krzesiwo (ID 52) i kliknie PPM na blok Kamienia (ID 3) lub Bruku (ID 11):
    - Sprawdzić czy to portal z kamienia (rama z kamienia, np. minimum 3 bloki kamienia w konstrukcji, lub kamienna brama).
    - Otworzyć świecący portal teleportujący do Mrocznego Wymiaru!

### Krok 4: Totem i przebudzenie Bossa w Mrocznym Wymiarze
- W `enterDarkDimension()` w `js/main.js`:
  - Gracz teleportuje się na arenę (x=1000, z=1000).
  - Boss **nie rodzi się samoczynnie**, dopóki gracz nie zbuduje totemu: Ziemia (ID 2) + Kamień (ID 3) na górze i nie podpali go Krzesiwem (ID 52).
  - Po podpaleniu: totem eksploduje, Boss Robot się pojawia, rośnie i zaczyna się walka!

### Krok 5: Pasek „BOSS” na samej górze ekranu (HUD)
- W `index.html`:
  ```html
  <div id="boss-hud" style="display: none;">
      <div id="boss-title">👑 BOSS ROBOT</div>
      <div id="boss-bar-bg">
          <div id="boss-bar-fill"></div>
      </div>
  </div>
  ```
- W `css/style.css`:
  - Styl minecraftowego paska Bossa na środku u góry ekranu.
- W `js/ui.js`:
  - Metody: `showBossBar(title, hp, maxHp)`, `updateBossBar(hp, maxHp)`, `hideBossBar()`.
- W pętli gry / `Mob`:
  - Boss Robot aktualizuje pasek w `update(dt)`: `ui.updateBossBar(this.health, this.maxHealth)`.
  - W `die()` i `destroy()`: `ui.hideBossBar()`.
