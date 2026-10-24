# Plan Implementacji BMad: Kolorowy Blok 626, Tajny Kod 626, Więcej Dirtików i Robotów

## 1. Wymagania Gracza (8 lat - analiza nagrania głosowego)

Gracz Tymek przekazał w nagraniu:
> *„Stwórz więcej tych dircików i doda i wykasuj 1 2 3 kod i dodaj 6 2 6. I dodaj 6 2 6, no. I daj więcej robotów i żeby z robotów nic nie wypadało tylko pierwiastek. A jak pierwiastek się da na ten kolorowy blok 6 2 6, bo kolorowy blok będzie 6 2 6, to wtedy dostajesz ten...”*

### Podsumowanie elementów do wdrożenia:
1. **Więcej Dirtików w świecie (`entity-manager.js`)**:
   - Zwiększenie limitu aktywnych ukrytych Dirtików (np. do 4-5 zamiast 2), aby częściej spotykać te zabawne klocki.
2. **Wykasowanie kodu 1 2 3 (1234) i dodanie kodu 626 (`ui.js`)**:
   - Usunięcie obsługi starego kodu `1234` (który dawał Bedrock).
   - Dodanie nowego tajnego kodu **`626`** (oraz `6 2 6` / `6-2-6`).
   - Kod `626` przyznaje graczowi **Kolorowy Blok 626**!
3. **Więcej Robotów i czysty drop z Robota (`entity-manager.js`, `hostile.js`)**:
   - Zwiększenie limitu Robotów w świecie (do 3-4 jednocześnie).
   - Zmiana dropu z pokonanego Robota Transformera: **tylko Niebieski Pierwiastek** (ID 49)! Usunięcie losowych diamentów, mystery boxa i miecza laserowego.
4. **Kolorowy Blok 626 i Magiczna Reakcja z Pierwiastkiem**:
   - Nowy blok w grze (tęczowy/neonowy z cyframi lub motywem 626).
   - Możliwość położenia bloku na ziemi i kliknięcia na niego **Prawym Przyciskiem Myszy (PPM)** trzymając w ręku Niebieski Pierwiastek (lub połączenia w craftingu).
   - Efekt: Nagroda dla gracza! *(Do doprecyzowania: nagranie audio urwało się na słowach „to wtedy dostajesz ten...”)*.

---

## 2. Pytania do 8-letniego Gracza (Doprecyzowanie)
1. **Co dokładnie gracz ma dostać po użyciu Pierwiastka na Bloku 626?**
   - ⚔️ Super Tęczowy Miecz 626 (zadający ogromne obrażenia i świecący kolorami)?
   - 🛡️ Kosmiczną Zbroję 626?
   - 🎁 Super Skrzynię z diamentami i rubinami?
   - ⚡ Coś innego według Twojego pomysłu?
2. **Jak chcesz aktywować ten blok?**
   - Czy stawiasz Kolorowy Blok 626 na trawie i klikasz na niego Prawym Przyciskiem Myszy (PPM) trzymając Niebieski Pierwiastek w dłoni?
   - Czy wolisz połączyć je w okienku craftingu [R/E]?
3. **Jak ma wyglądać Kolorowy Blok 626?**
   - Tęczowe, mieniące się piksele z neonowym połyskiem?

---

## 3. Architektura Techniczna (Atomic Commits)

### Etap 1: Czat – Usunięcie kodu 1234 i dodanie kodu 626 + Nowy Blok 626
- `js/items.js`: Rejestracja przedmiotu i bloku `COLOR_BLOCK_626` (ID 51).
- `js/textures.js`: Wygenerowanie tekstury tęczowego/wielokolorowego bloku w atlasie.
- `js/ui.js`: Usunięcie kodu 1234, dodanie kodu `626` dającego Kolorowy Blok 626.
- Commit 1.

### Etap 2: Moby – Więcej Dirtików i Robotów, czysty drop Niebieskiego Pierwiastka
- `js/entities/entity-manager.js`: Zwiększenie limitu Dirtików do 4 oraz Robotów do 3.
- `js/entities/mobs/hostile.js`: `onDeath()` Robota upuszcza wyłącznie Niebieski Pierwiastek (ID 49).
- Commit 2.

### Etap 3: Interakcja – Użycie Niebieskiego Pierwiastka na Bloku 626 i nagroda
- `js/interaction.js`: Obsługa kliknięcia PPM Niebieskim Pierwiastkiem na postawiony Blok 626.
- Efekty cząsteczkowe, dźwięk sukcesu, przemiana i przyznanie wybranej przez gracza nagrody.
- Commit 3.
