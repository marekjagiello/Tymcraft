# BMAD Implementation Plan: Świniowy Blok (Teleportacja, Dialog z Królem Świń i Boss: Wielkie Świnioły + Łatwy Król)

## 1. Problem i Życzenie Użytkownika (Tymek, 8 lat)
- **Audio prompt Tymka**:
  > *„Ten świński blok ma dawać do takich... Najpierw gadasz z królem: 'Cześć, czego chcesz? Ja tu przybyłem przez przypadek.' Ale nie zmieniasz głosu, robisz taki jak te... ja teraz tylko świński taki bardziej [chrrr / chrumk]. 'Straże! Zaatakować go!' Straże wtedy takie wielkie świnioły atakują cię i to jest boss. A potem król, a król jest łatwy.”*
- **Wymagania i poprawki**:
  1. **Świniowy Blok (ID 59)**:
     - Po postawieniu 1 bloku następuje efekt i natychmiastowa teleportacja do Królestwa Świń na pozycję przed tronem Króla Świń.
  2. **Dialog z Królem Świń**:
     - Dokładne kwestie:
       - Król Świń: *„Chrum! Cześć, czego chcesz?”*
       - Ty (Tymek): *„Ja tu przybyłem przez przypadek.”*
       - Król Świń: *„Chrrr! Straże! Zaatakować go!”*
  3. **Głos i Efekty Dźwiękowe (TTS & Audio)**:
     - Zgodnie z życzeniem Tymka: *„nie zmieniasz głosu, robisz taki jak ja teraz”* -> normalny, naturalny pitch (1.0), brak sztucznych przesterów i zniekształceń.
     - *„tylko świński taki bardziej [chrumk/chrr]”* -> dodanie autentycznego, podwójnego chrumknięcia syntezatora Web Audio (`playPigGruntSound(true)`) przed wypowiedziami Króla oraz dopisanie „Chrum!” i „Chrrr!” do tekstu czytanego przez lektora.
  4. **Boss: Wielkie Świnioły (Straże Króla)**:
     - *„Straże wtedy takie wielkie świnioły atakują cię i to jest boss.”*
     - Pasek bossa na górze ekranu: `⚔️ BOSS: WIELKIE ŚWINIOŁY (2 Pozostały)`.
     - Dwa potężne, pancerne Wielkie Świnioły (po 55 HP, łącznie 110 HP), szarżujące na gracza.
     - Król Świń podczas Etapu 1 stoi na podwyższeniu za tronem i jest nietykalny.
  5. **Łatwy Król Świń (Etap 2)**:
     - *„A potem król, a król jest łatwy.”*
     - Po pokonaniu obu Wielkich Świniołów, Król Świń wkracza do walki (`health = 25 HP`, łatwy do pokonania, małe obrażenia).
     - Pasek bossa: `👑 KRÓL ŚWINIA (Łatwy Władca)`.
     - Po pokonaniu Króla: wypada mnóstwo soczystego schabu, rubiny, żelazo i pojawia się pod ścianą portal powrotny do normalnego świata.

## 2. Zmiany w Kodzie
- `js/audio.js`:
  - Wzmocnienie i ulepszenie `playPigGruntSound(isKing)` na soczyste podwójne chrumknięcie ("chrum-chrum / chrrr").
- `js/ui.js`:
  - Import `playPigGruntSound`.
  - Aktualizacja `showPigKingdomDialogue`:
    - Naturalny `pitch: 1.0` dla wszystkich wypowiedzi.
    - Odtwarzanie `playPigGruntSound(true)` przy kwestiach Króla.
    - Dokładne teksty wskazane przez Tymka.
- `js/main.js`:
  - Boss bar Etapu 1 nazwany `⚔️ BOSS: WIELKIE ŚWINIOŁY (2 Pozostały)`.
  - Spawnowanie Wielkich Świniołów.
- `js/entities/entity-manager.js`:
  - Aktualizacja pasków życia i komunikatów dla Wielkich Świniołów.
- `js/entities/mobs/hostile.js`:
  - `GiantPigGuard`: aktualizacja nazwy na `Wielki Świnioł Strażnik` oraz paska bossa przy otrzymywaniu obrażeń.
  - `PigKing`: ustawienie `health = 25` i `maxHealth = 25` w Stage 2 („a król jest łatwy”), dostosowanie komunikatów.
- Aktualizacja wersji modułów w `index.html` oraz `js/main.js` (cache busting `?v=...`).

## 3. Weryfikacja i Testy
- Testy E2E CDP w `tests/test_cdp_pig_king_boss.py` weryfikujące:
  - Dialogue texts i normalny pitch.
  - Spawnowanie Wielkich Świniołów jako Bossa (pasek bossa).
  - Przejście do Etapu 2 z łatwym Królem Świń (25 HP).
  - Pokonanie Króla i brama powrotu.
- Commit po pomyślnych testach.
