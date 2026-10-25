# Plan BMAD: Boss Robot – Druga Wersja (Faza 2) z 12 Ramionami, Odpornością na Kolorowe Przedmioty i Odwracaniem Gracza Tyłem

## 1. Kontekst i zgłoszenie Tymka (8 lat)
Tymek w nagraniu audio zgłasza:
1. **"Zrób drugi typ, czyli taki drugi, drugą wersję tego bossa. Czyli że jak ktoś pokona pierwszą, to jest druga wersja..."**
   - Po pokonaniu Bossa Robota (Faza 1) następuje potężny wybuch i na arenie budzi się **Faza 2: ULTRA BOSS ROBOT**!
2. **"i nie działają na tego bossa kolorowe rzeczy, okej? Tylko jakieś tam... nie działają na niego kolorowe rzeczy żadne."**
   - Druga wersja bossa ma absolutną tarczę na przedmioty kolorowe (Kolorowy Miecz ID 54, Kolorowy Łuk ID 55, Magiczna Kolorowa Strzała ID 56, Magiczna Różdżka ID 50 i jej czary).
   - Zadają one **0 obrażeń**! Działają tylko bronie zwykłe i elitarne (Diamentowy Miecz, Rubinowy Miecz, Laserowy Miecz, Kamienny/Żelazny Miecz, zwykły łuk).
3. **"i druga wersja ma już sześć rąk po każdej stronie. I on tak atakuje."**
   - Druga wersja bossa ma dokładnie **12 ramion** – po 6 rąk po lewej stronie i 6 po prawej stronie!
   - Ramiona są uzbrojone w laserowe miecze (cięcia wręcz) oraz blastery / działka plazmowe (serie pocisków na dystans).
4. **"I typ się zawsze odwraca tyłem, okej? Że gracz się zawsze odwraca tyłem, żeby było utrudnienie."**
   - Utrudnienie: za każdym razem, gdy gracz trafi Bossa Fazy 2 (wręcz lub z dystansu), kamera gracza zostaje gwałtownie obrócona o 180° tyłem do bossa z dźwiękiem dezorientacji!

---

## 2. Architektura i Szczegóły Implementacji

### A. Przejście do Fazy 2 (`BossRobot.die()` / `BossRobotPhase2`)
- Kiedy `BossRobot` (faza 1) traci całe HP (160 HP):
  - Zamiast od razu stawiać bramę powrotu, następuje eksplozja (`playExplosionSound()`) i dym.
  - Z dymu budzi się Faza 2 – potężny kolos z 12 ramionami i mrocznym pancerzem ze świecącymi żyłami energii!
  - Pasek zdrowia na górze ekranu (Boss Bar) odnawia się: `👑 ULTRA BOSS ROBOT - FAZA 2 (12 RAMION)` z 240 HP.
  - Muzyka bossa gra dalej w trybie wzmożonym.
  - Na czacie: `⚠️ UWAGA! Boss Robot przeszedł transformację w FAZĘ 2 z 12 RAMIONAMI! Kolorowe bronie na niego nie działają!`

### B. 12 Ramion Bossa (po 6 z każdej strony)
- Model 3D:
  - Lewa strona: 6 ramion (3 górne, 3 dolne) ułożonych w rzędach.
  - Prawa strona: 6 ramion (3 górne, 3 dolne) symetrycznie.
  - Uzbrojenie:
    - 6x Miecze Energetyczne / Laserowe (czerwone, fioletowe, cyan)
    - 6x Blastery Laserowe / Działka Plazmowe
- Animacja:
  - Wszystkie ramiona poruszają się w walce synchronicznie i falowo.
  - W zwarciu: jednoczesne cięcia wieloma ostrzami.
  - Na dystans: jednoczesny ostrzał laserami w gracza (`BossLaserBolt`).

### C. Niewrażliwość na Kolorowe Przedmioty (`Rainbow Shield`)
- Sprawdzanie źródła ataku w `onAttacked` / `takeDamage`:
  - Jeśli gracz używa Kolorowego Miecza (54), Kolorowego Łuku (55), Kolorowej Strzały (56) lub Magicznej Różdżki (50):
    - Obrażenia = 0!
    - Efekt dźwiękowy odbicia `playShieldDeflectSound()`.
    - Cząsteczki rozbłysku tarczy wokół Bossa.
    - Komunikat/popup: `🛡️ TARCZA ANTY-KOLOROWA! Kolorowe bronie nie zadają obrażeń Fazie 2! Użyj Diamentowego, Rubinowego lub Laserowego Miecza! ⚔️💎`

### D. Utrudnienie: Obrót Gracza Tyłem (`turnAround`)
- W `Player` (`js/player.js`):
  - Dodanie metody `turnAround()` modyfikującej quaternion/orientację yaw kamery o 180° (`Math.PI`).
- Przy każdym udanym trafieniu w Bossa Fazy 2:
  - Gracz obraca się natychmiast o 180° (`player.turnAround()`).
  - Dźwięk dezorientacji `playDisorientSound()`.
  - Popup: `🌀 Boss odrzucił Cię i obrócił tyłem!`

### E. Ostateczne Pokonanie Fazy 2 i Drop
- Po zbiciu 240 HP Fazy 2:
  - Olbrzymi wybuch, cząsteczki dymu.
  - Brama zwycięstwa (`spawnVictoryPortal()`).
  - Drop gigantyczny: 8 Diamentów, 6 Rubinów, 6 Niebieskich Pierwiastków, 2 Laserowe Miecze, 2 Mystery Boxy.
  - Zapis do `localStorage`: `m2_boss_robot_defeated = 'true'`.

---

## 3. Pliki do Modyfikacji
1. `js/audio.js`: Dźwięki `playShieldDeflectSound()` oraz `playDisorientSound()`.
2. `js/player.js`: Metoda `turnAround()` do obracania gracza o 180 stopni.
3. `js/entities/mobs/hostile.js`:
   - Rozbudowa `BossRobot` o obsługę Fazy 2 (model 12 ramion: 6 po lewej, 6 po prawej, tarcza anty-kolorowa, obrót gracza przy uderzeniu, animacje i ataki).
   - `spawnBossRobotPhase2(x, z)` w managerze.
4. `js/interaction.js` & `js/entities/projectile.js`:
   - Przekazanie typu broni / źródła ataku i reakcja na niewrażliwość oraz wywołanie obrotu gracza.
5. Cache buster `?v=boss_phase2_v1` w `index.html` oraz `js/main.js`.
6. Test automatyczny CDP: `tests/test_cdp_boss_robot_phase2_12_arms.py`.
