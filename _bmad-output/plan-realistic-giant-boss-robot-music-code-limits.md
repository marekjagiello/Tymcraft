# Plan BMad: Realistyczny Gigantyczny Boss Robot, Robotyczna Muzyka "Bźi-Bźi" i Jednorazowe Kody z Resetem po Bossie

## 1. Wymagania 8-letniego Gracza (Tymka)
Z nagrania audio i odpowiedzi na pytania:
1. **Limit kodów w czacie (Koniec z nieskończonością kodów)**:
   - Wszystkie kody z nagrodami (`3`, `626`, `6261`, `cz`, `tecza`, `czar`, `miał`, `tymek`, `dada`) działają **TYLKO RAZ**.
   - Próba ponownego wpisania kodu informuje: *"🔒 Ten kod został już wykorzystany! Pokonaj Bossa Robota w Mrocznym Wymiarze, aby odnowić kody!"*.
   - **Wyjątek**: Kod na wodę (`grat`, `woda`, `butelka`) działa **W NIESKOŃCZONOŚĆ** bez limitu!
   - Po pokonaniu Bossa Robota wykorzystane kody odnawiają się (resetują), więc gracz może ich użyć ponownie w nowej przygodzie.
2. **Realistyczny, większy i potężniejszy Boss Robot**:
   - **Gigantyczna skala**: Skala docelowa zwiększona do **3.5** (potężny kolos ~7 metrów wysokości!).
   - **Życie**: Zwiększone ze 100 do **160 HP**!
   - **Realistyczny wygląd mecha**:
     - Podwójne rury wydechowe na plecach emitujące dym i iskry z reaktora.
     - Płyty pancerza naramiennego i napierśnika, pulsujący rdzeń energetyczny.
     - Hydrauliczne siłowniki w stawach.
   - **Trzęsienie ziemi**: Ciężkie stąpanie giganta wywołuje dudnienie i wstrząsy kamery gracza, gdy Boss idzie w jego stronę.
3. **Dźwięk "dżżżżż" i robotyczna piosenka "bźi bźi bźi bźi"**:
   - Podczas ładowania cyber-promienia robot wydaje dźwięk wibrującego hiper-reaktora `dżżżżżżżż`!
   - W Mrocznym Wymiarze / podczas walki z bossem gra rytmiczna robotyczna muzyczka na syntezatorze: cyber-beat z nutkami mecha *"bźi-bźi-bźi-bźi"* w Web Audio API!

---

## 2. Etapy Implementacji (Atomic Commits)

### Etap 1: System limitu kodów w czacie z wyjątkiem dla wody i resetem po Bossie
- `js/ui.js`:
  - Tablica / Set `usedCodes` (przechowywany w LocalStorage / sesji).
  - Sprawdzanie czy kod był już użyty przed przyznaniem nagrody.
  - Wyjątek dla wody (`grat`/`woda`/`butelka`) – brak limitu.
  - Funkcja `resetCodes()` wywoływana przy zdarzeniu `boss_robot:defeated`.
- Commit 1 po teście w przeglądarce.

### Etap 2: Dźwięk reaktora "dżżżżż" i syntezatorowa muzyka mecha "bźi-bźi-bźi"
- `js/audio.js`:
  - `playReactorChargeSound()` (dźwięk wibrującego reaktora "dżżżżż").
  - `startBossRobotMusic()` i `stopBossRobotMusic()` (rytmiczny cyber-beat z melodyjką "bźi-bźi-bźi-bźi").
- `js/entities/mobs/hostile.js` & `js/main.js`:
  - Włączenie dźwięku ładowania przy cyber-promieniu robota.
  - Włączenie muzyki mecha po wejściu do Mrocznego Wymiaru i wyłączenie po powrocie do bazy.
- Commit 2 po teście w przeglądarce.

### Etap 3: Realistyczny Gigantyczny Boss Robot (Skala 3.5, 160 HP, rury wydechowe, dym, trzęsienie ziemi)
- `js/entities/mobs/hostile.js`:
  - Zwiększenie `maxHealth` do 160, `targetScale` do 3.5.
  - Rozbudowa modelu 3D: podwójne rury wydechowe, dymiące cząsteczki, potężniejszy pancerz.
  - Trzęsienie ziemi (wstrząsy kamery gracza przy ciężkich krokach).
- Commit 3 po teście w przeglądarce.
