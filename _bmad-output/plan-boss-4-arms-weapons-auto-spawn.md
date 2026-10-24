# Plan BMAD: Boss Robot – 4 Ramiona (Miecze i Pistolety), Sekwencyjne Wysuwanie & Auto-Spawn w Mrocznym Wymiarze

## 1. Kontekst i zgłoszenie Tymka (8 lat)
Tymek w nagraniu audio zgłasza:
1. **"Nie ma bossa, czyli jakby jak wejdziesz do tego to nie ma bossa. Napraw to, bo boss się nie pojawia."**
   - Po wejściu portalem do Mrocznego Wymiaru arena była pusta, bo wymagała budowy totemu. Tymek oczekuje, że po wejściu do wymiaru Boss od razu się pojawia!
2. **"Ma się jeden boss pojawić, taki koks, najpierw ma jedną rękę, potem drugą, potem trzecią, potem czwartą..."**
   - Boss Robot ma dokładnie 1 potężnego koksa (kolos).
   - Budzenie Bossa: ręce wysuwają się kolejno jedna po drugiej!
     - 1. ramię wysuwa się,
     - 2. ramię wysuwa się,
     - 3. ramię wysuwa się,
     - 4. ramię wysuwa się!
3. **"i wszystkie mają miecze i pistolety i takie tam i okej?"**
   - Uzbrojenie 4 ramion:
     - 1. ramię (górne prawe): Potężny Czerwony Miecz Laserowy ⚔️
     - 2. ramię (górne lewe): Cyber-Pistolet Laserowy z lufą i celownikiem 🔫
     - 3. ramię (dolne prawe): Działko Plazmowe / Pistolet Plazmowy 🔫
     - 4. ramię (dolne lewe): Błękitny Miecz Energetyczny ⚔️
   - W walce:
     - Bliski dystans: cięcia mieczami!
     - Średni/daleki dystans: pistolety strzelają pociskami laserowymi (`BossLaserBolt`) w gracza!

## 2. Zakres zmian w kodzie
1. **`js/audio.js`**:
   - Dodanie syntezy dźwięku `playLaserPistolSound()`.
2. **`js/entities/mobs/hostile.js`**:
   - Klasa `BossLaserBolt` (pocisk laserowy lecący w gracza).
   - Zbudowanie modeli pistoletów (korpus, lufa, świecący wylot) dla lewego górnego i prawego dolnego ramienia.
   - Sekwencyjna animacja wysuwania 4 ramion w `BossRobot.update()`.
   - Strzelanie z pistoletów na dystans.
3. **`js/main.js`**:
   - W `enterDarkDimension()`: natychmiastowe spawnowanie `BossRobot(1000, 1000)` jeśli jeszcze nie żyje, uruchomienie muzyki i paska Boss Bar.
4. **Wersjonowanie i testy**:
   - Bump query string do `?v=portal_boss_v6`.
   - Test CDP sprawdzający auto-spawn Bossa po wejściu do wymiaru, 4 ramiona z mieczami i pistoletami oraz sekwencję budzenia.
