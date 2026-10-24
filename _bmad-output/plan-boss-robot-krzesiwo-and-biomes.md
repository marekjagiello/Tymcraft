# Plan Implementacji BMad: Boss Robot (4 ręce, rośnięcie, totem), Krzesiwo, Populacja Mobów i Ukończone Biomy

## 1. Wymagania 8-letniego Gracza (Tymka)
Z drugiego nagrania głosowego:
1. **Krzesiwo (Flint & Steel)**:
   - Tworzone w craftingu z 2 patyków ułożonych obok siebie w siatce 2x2 (`🪵 + 🪵`).
   - Służy do podpalania i aktywacji totemu Bossa Robota.
2. **Przywołanie Bossa Robota (Totem: Dirt + Stone)**:
   - Gracz buduje totem: na dole **Ziemia (Dirt - ID 2)**, a bezpośrednio na niej **Kamień (Stone - ID 3)**.
   - Kliknięcie Prawym Przyciskiem Myszy (PPM) z **Krzesiwem** w dłoni na tę strukturę podpala ją i wyzwala potężne uderzenie energii!
   - Klocki totemu rozpadają się w pył i kamienie.
3. **Boss Robot (Mech o 4 rękach, wielki, niszczący drzewa)**:
   - **Wybudzanie**: Budzi się z kamienia – najpierw jest mały (skala 0.4), wykopuje się i w widowiskowy sposób rośnie do gigantycznych rozmiarów (skala 2.2, ok. 4.5 metra wysokości)!
   - **4 mechaniczne ręce**: Dwie górne i dwie dolne ręce z cyber-ostrzami wymachujące w szybkim tempie.
   - **Statystyki**: Dużo punktów życia (120 HP), pasek zdrowia Bossa.
   - **Atak**: Szybkie ciosy zadające 2 serduszka (4 HP) bez zbroi, lub 1 serduszko (2 HP) przy założonej zbroi.
   - **Niszczenie drzew**: Gdy idzie w stronę gracza, taranuje i ścina pnie drzew (Drewno ID 4) oraz liście (ID 5) na swojej drodze! 🌲💥
4. **Więcej mobów i czysty drop**:
   - Więcej ukrytych Dirtików (limit zwiększony z 2 do 4-5).
   - Więcej zwykłych Robotów Transformerów (limit 3).
   - Ze zwykłych Robotów wypada wyłącznie Niebieski Pierwiastek (ID 49).
5. **Poprawka biomów (Góry i Pustynia nie w nieskończoność)**:
   - Pustynia i Góry przestają być nieskończonymi pasami (`dx < -11` i `dx > 14`).
   - Stają się naturalnymi, zamkniętymi strefami/biomami (np. 30-40 bloków szerokości), po których znów pojawiają się lasy, polany, sawanna i ośnieżona zima!

---

## 2. Etapy Implementacji (Atomic Commits)

### Etap 1: Krzesiwo w craftingu (2 patyki) + Przedmiot i Ikona
- `js/items.js`: Dodanie przedmiotu `FLINT_AND_STEEL` (ID 52, `Krzesiwo`).
- `js/crafting.js`: Przepis craftingu z 2 patyków (`🪵 + 🪵`).
- `js/ui.js`: Ikona `🔥` / `🪨⚡` dla ID 52 w ekwipunku i hotbarze.
- Usunięcie starego kodu 1234, dodanie kodu 626.
- Test w przeglądarce i Commit 1.

### Etap 2: Moby – Więcej Dirtików i Robotów, czysty drop Niebieskiego Pierwiastka
- `js/entities/entity-manager.js`: Zwiększenie limitu populacji Dirtików (do 4) i Robotów (do 3).
- `js/entities/mobs/hostile.js`: Zmiana dropu ze zwykłego Robota: tylko Niebieski Pierwiastek (ID 49).
- Test w przeglądarce i Commit 2.

### Etap 3: Boss Robot – Klasa, model 4 rąk, animacja rośnięcia, niszczenie drzew
- `js/entities/mobs/hostile.js`: Nowa klasa `BossRobot` z 4 ramionami, animacją wyłaniania się i rośnięcia (`scale.set(...)`), niszczeniem bloków drewna/liści na trasie chodu, atakiem 4 HP (2 HP ze zbroją).
- `js/entities/entity-manager.js`: Metoda `spawnBossRobot(x, y, z)`.
- Test w przeglądarce i Commit 3.

### Etap 4: Totem Bossa Robota (Dirt na dole + Stone na górze + Krzesiwo PPM)
- `js/interaction.js`: Detekcja kliknięcia Krzesiwem (ID 52) na blok Kamienia stojący na Ziemi (lub Ziemi pod Kamieniem).
- Efekt iskier, zniszczenie klocków i przywołanie Bossa Robota w tym miejscu.
- Test w przeglądarce i Commit 4.

### Etap 5: Ograniczenie zasięgu biomów pustyni i gór w świecie
- `js/world.js`: Płynne, skończone wyspy biomów Pustyni i Gór, przejście w inne biomy.
- Test w przeglądarce i Commit 5.
