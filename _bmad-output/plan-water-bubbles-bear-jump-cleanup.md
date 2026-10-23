# Plan Implementacji BMad: Ładna Woda, Bąbelki Tlenu, Pływanie, Poprawka Skoku Niedźwiedzia i Usunięcie Gracza 2

## 1. Wymagania Gracza (8 lat)
1. **Ładniejsza woda & niebieskawy ekran pod wodą**:
   - Piękniejsza tekstura wody: czystszy błękit, turkusowe refleksy, animowane fale.
   - Po zanurzeniu głowy pod wodę: ekran robi się niebieskawy (nakładka `#underwater-overlay` + błękitna mgła podwodna Three.js).
2. **Bąbelki przy pływaniu & pasek tlenu (bąbelki, które jak znikną, to biją)**:
   - Cząsteczki bąbelków wody wokół gracza podczas płynięcia i poruszania się w wodzie.
   - Pasek bąbelków tlenu (`#bubbles-bar`) z 10 bąbelkami 🫧 nad paskiem głodu.
   - Gdy gracz ma głowę pod wodą: pasek staje się widoczny, bąbelki pękają co 1.5 sekundy.
   - Gdy znikną wszystkie bąbelki (tlen = 0): gracz otrzymuje obrażenia od tonięcia (2 DMG co 1.2 sekundy).
   - Po wynurzeniu: bąbelki szybko się regenerują i pasek znika.
3. **Koniec z lataniem na niedźwiedziach**:
   - Usunięcie błędu ciągłego dodawania wysokości w powietrzu przy wciśniętej spacji.
   - Wprowadzenie fizyki skoku dla niedźwiedzia:
     - Możliwy skok tylko wtedy, gdy miś stoi na twardym gruncie (`isGrounded`).
     - Prawdziwy skok z siłą pionową i grawitacją (wysokość ~1.2 bloku), brak możliwości skakania w powietrzu.
4. **Wykasowanie drugiego gracza (Player 2)**:
   - Całkowite usunięcie instancji drugiego gracza, klawisza `Q` oraz kamery dwuosobowej `updateCoopCamera` (co usunie też błąd `subScaledVector`).

---

## 2. Etapy Wdrażania (Atomic Commits)

### Etap 1: Wykasowanie drugiego gracza (Player 2) i naprawa kamery
- Usunięcie z `js/main.js` importu `SecondPlayer`, instancji `this.player2`, metody `updateCoopCamera` oraz obsługi klawisza `Q`.
- Wyczyszczenie `js/player2.js`.
- Bump wersji cache `?v=water_1`.
- Weryfikacja braku błędów w konsoli i commit 1.

### Etap 2: Fizyka skoku niedźwiedzia (Koniec z lataniem)
- W `js/player.js`:
  - Obsługa skoku niedźwiedzia oparta o `bear.isGrounded` i `bear.velocityY`.
  - Spacja nadaje impuls `bear.velocityY = 7.5` tylko, gdy miś dotyka ziemi.
  - Zastosowanie grawitacji `22.0 * dt` i detekcja podłoża `bear.getGroundHeight()`.
- Weryfikacja braku możliwości lotu w powietrzu i commit 2.

### Etap 3: Upiększenie wody, niebieskawy ekran i bąbelki pływania
- W `js/textures.js`: Ulepszenie tekstury wody (żywsze kolory, krystaliczne refleksy).
- W `index.html` i `css/style.css` (lub inline CSS w `index.html`): Styl dla `#underwater-overlay`.
- W `js/player.js`:
  - Wykrywanie zanurzenia głowy gracza `isHeadUnderwater`.
  - Aktywacja niebieskiego filtra ekranu i mgły Three.js.
  - Cząsteczki bąbelków wody generowane za graczem podczas ruchu w wodzie.
- Weryfikacja wizualna i commit 3.

### Etap 4: Pasek bąbelków tlenu w HUD i obrażenia od tonięcia
- W `index.html`: Dodanie kontenera `#bubbles-bar` w `#survival-bars`.
- W `js/survival.js`:
  - Zarządzanie tlenem (10 punktów / bąbelków).
  - Zużycie pod wodą i regeneracja na powierzchni.
  - Obrażenia co 1.2s przy braku tlenu (`takeDamage(2, 'drowning')`).
- W `js/ui.js`: Renderowanie bąbelków 🫧 i animacja ubywania.
- Bump wersji cache `?v=water_bubbles_1`.
- Weryfikacja działania w przeglądarce i commit 4.
