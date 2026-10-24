# Plan BMad: Mroczny Wymiar Bossa Robota, Małe Robociki, Porywający Robot i Tajne Hasło 3

## 1. Wymagania 8-letniego Gracza (Tymka)
Z nagrania audio oraz doprecyzowanych odpowiedzi:
1. **Tajne hasło „3” (lub „trzy”) na czacie**:
   - Daje **Ciepłą Kurtkę** 🧥 (`ITEMS.WARM_JACKET`, ID 46).
   - Informuje gracza, że kurtka chroni przed chłodem, a na mapie czeka Robot gotowy zabrać go w niezwykłą podróż.
2. **Porywający Robot (Przeniesienie do innego świata)**:
   - W normalnym świecie gry, gdy gracz zbliży się do Robota Transformera (lub kliknie na niego PPM), Robot aktywuje cyber-promień ⚡ i przenosi gracza do Mrocznego Wymiaru.
   - Jeśli Boss został już pokonany, Robot przyjaźnie piszczy ("Bip-bip! Boss Robot został pokonany!").
3. **Mroczny Wymiar Bossa Robota (Ciemna i czarna mapa)**:
   - Koordynaty areny: platforma z Bedrocku i bloków technologii w odległym sektorze (np. x=1000, z=1000).
   - Ciemne/czarne niebo (`0x06060c`), mroczna mgła, ale na arenie jest widocznie dzięki stalowo-niebieskiemu światłu otoczenia ("Ale jest też trochę jasno").
   - **Brak zwykłych potworów**: Na tej mapie NIE spawnują się żadne Zombie, Szkielety, Creepery ani Dirtiki ("Żadne potwory się nie pokazują na tej mapie").
4. **Dynamiczne rozświetlanie mroku przez ataki Bossa**:
   - Gdy Boss Robot wymachuje mieczami, atakuje lub przyzywa robociki, arena jest oświetlana potężnym błyskiem neonowego światła laserowego (cyjan/czerwień) ⚡✨, które po uderzeniu gaśnie do mroku ("I tylko jak atakuje to ci rozświetla to trochę ten ciemny świat").
5. **Małe Robociki (Mini-Roboty)**:
   - Boss Robot w trakcie walki przywołuje fale małych robocików (MiniRobot).
   - Małe robociki biegają szybko i zadają dokładnie **2 HP** (1 serduszko) obrażeń.
   - Mają 12 HP, mini-mecha wygląd z czerwoną diodą i mechanicznymi ramionami.
6. **Jednorazowy Boss i powrót do świata ze skarbami**:
   - Bossa można pokonać tylko raz na dany świat gry (`bossRobotDefeated = true`).
   - Po pokonaniu Bossa:
     - Wypada mnóstwo skarbów (Diamenty, Rubiny, Niebieskie Pierwiastki, Laserowy Miecz, Mystery Box).
     - W centrum areny pojawia się złoty portal powrotny / teleport po kilku sekundach.
     - Gracz wraca do swojego świata ze zdobytym uzbrojeniem, a wymiar zostaje zamknięty.

---

## 2. Architektura i Etapy Implementacji (Atomic Commits)

### Etap 1: Tajne hasło „3” w czacie ➔ Ciepła Kurtka 🧥
- `js/ui.js`: W `submitChat()` dodanie obsługi `3` oraz `trzy` ➔ dodaje ID 46, wyświetla komunikat o kurtce i porywającym robocie.
- Test w przeglądarce i Commit 1.

### Etap 2: Mroczny Wymiar i Arena (Wymiar Ciemności, czarne niebo, dynamiczne światło ataków)
- `js/world.js`: Generowanie areny z Bedrocku i bariery na koordynatach (1000, 1000) z biomem `DarkDimension`.
- `js/main.js`:
  - Obsługa wejścia/wyjścia z ciemnego wymiaru (`enterDarkDimension()`, `exitDarkDimension()`).
  - Zmiana nieba na czarne, mroczna mgła, lekka poświata otoczenia.
  - Dodanie `bossAttackLight` rozświetlającego arenę podczas ciosów.
- `js/entities/entity-manager.js`: Blokada spawnowania zwykłych mobów (zombie, szkielety itp.) w ciemnym wymiarze.
- Test w przeglądarce i Commit 2.

### Etap 3: Klasa Małego Robocika (`MiniRobot`) i przyzywanie przez Bossa
- `js/entities/mobs/hostile.js`:
  - Nowa klasa `MiniRobot`: mały model mecha, zwinny bieg, atak za dokładnie 2 HP.
  - Rozbudowa `BossRobot`: funkcja `summonMiniRobots()`, wyzwalanie błysku światła i wezwanie 2-3 małych robocików co określony czas/falę.
- Test w przeglądarce i Commit 3.

### Etap 4: Teleportacja przez Robota (Cyber-promień) i powrót po pokonaniu Bossa
- `js/entities/mobs/hostile.js` & `js/interaction.js`:
  - Gdy gracz zbliży się do Robota w normalnym świecie lub kliknie na niego PPM, Robot rzuca cyber-promień i przenosi gracza do ciemnego wymiaru na arenę Bossa.
  - Zapisanie flagi `bossRobotDefeated`.
  - Po śmierci Bossa: pojawienie się portalu i powrót do normalnego świata ze skarbami.
- Bump wersji pamięci podręcznej `?v=...` w `index.html` i `js/main.js`.
- Test w przeglądarce i Commit 4.
