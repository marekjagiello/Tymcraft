# Plan: Nowy Boss Król Świnia, Świnie z Czerwonymi Oczami oraz Mięsny Portal ze Świniowego Bloku

## 1. Wymagania od Tymka
Tymek (8 lat) nagrał wiadomość audio:
> *"Dodaj kolejnego bossa, czyli takiego... takiego Króla Świnię. I dodaj Króla Świnię. Król Świń będzie przywoływać swoje świnie z czerwonymi oczami, i będzie trzeba zbudować... bo będzie trzeba zbudować mięsowy portal ze zgniłego mięsa. I jak się położy na blok taki... cztery... taki dwa po bokach, po lewej i po prawej w craftingu, to wtedy się robi świniowy blok, i świniowy blok jak położysz na portal, i zapala się je też krzesiwem, to wchodzisz do portalu świń, i jesteś u świniowego króla."*

---

## 2. Architektura i komponenty

### A. Nowy blok: `Świniowy Blok` (ID 59)
- **Pliki**: `js/items.js`, `js/textures.js`, `js/ui.js`, `js/crafting.js`
- **Receptura 2x2**:
  - Ze zgniłego mięsa (ID 26, Rotten Flesh) położonego w craftingu (4 sztuki w kratkach 2x2 LUB po bokach po lewej i prawej) powstaje **Świniowy Blok** (ID 59)!
- **Tekstura**:
  - Różowy blok z charakterystyczną marmurkową fakturą boczku i ryjkiem świnki.
- **Właściwości**:
  - Blok solidny, stawialny na ziemi, odporny na eksplozje wewnątrz areny bossa.

### B. Mięsny Portal (Portal Świń)
- **Pliki**: `js/interaction.js`
- **Wykrywanie portalu**:
  - `checkPigPortal(cx, cy, cz)`: sprawdza obecność co najmniej 4 bloków Świniowego Bloku (ID 59) w układzie bramy/drzwi.
- **Zapalenie krzesiwem (ID 52)**:
  - Efekt różowo-czerwonego błysku, dźwięk cyber-teleportu, komunikat w czacie i popup.
  - Teleportacja do Królestwa Świń na pozycję (x=2000, y=12.5, z=1992).

### C. Świńskie Królestwo (Wymiar / Arena Króla Świń)
- **Pliki**: `js/world.js`, `js/main.js`
- **Koordynaty**:
  - Sektor x=1960..2040, z=1960..2040 (centrum x=2000, z=2000).
- **Struktura**:
  - Podłoga ze Świniowych Bloków (59) i Bedrocka (14).
  - Wysokie ściany z Bedrocka (8 bloków) i dach na y=20 (zabezpieczone przed zniszczeniem).
  - Ozdobna brama powrotu pod ścianą (x=2012, z=2000) klikana PPM lub komenda `/wroc`.
- **Atmosfera**:
  - Karmazynowo-różowe niebo (`0x330919`), lekka purpurowa mgła.

### D. Boss: Król Świnia (`PigKing`, `boss_pig_king`)
- **Pliki**: `js/entities/mobs/hostile.js`, `js/entities/entity-manager.js`
- **Wygląd**:
  - Gigantyczna świnia (skala 3.2), na głowie lśniąca złota korona 👑 z rubinami, złote bransolety na kopytach.
- **Statystyki**:
  - Zdrowie: 150 HP.
  - Boss Bar: `👑 KRÓL ŚWINIA`.
- **Zdolności**:
  - Szarża i potężne tąpnięcie ziemne.
  - **Przyzywanie Świń z Czerwonymi Oczami**: co 8-12 sekund Król Świnia ryczy i przywołuje 2 świnie z czerwonymi oczami!
- **Łupy (Dropy)**:
  - Mnóstwo soczystego Schabu (Porkchop ID 38), Złote monety/bryłki, Rubiny (34).

### E. Minion: Świnia z Czerwonymi Oczami (`RedEyedPig`, `red_eyed_pig`)
- **Pliki**: `js/entities/mobs/hostile.js`
- **Wygląd**:
  - Świnia o płonących, jaskrawoczerwonych oczach (`emissive: 0xff0000`).
- **Zachowanie**:
  - Agresywny minion Króla Świń – biegnie za graczem, atakuje zębami (2 HP obrażeń).

---

## 3. Plan implementacji krok po kroku
1. Dodać `PIG_BLOCK` do `js/items.js`, `js/textures.js`, `js/ui.js`.
2. Dodać recepturę craftingu Świniowego Bloku w `js/crafting.js`.
3. Dodać `generatePigKingdomChunk` w `js/world.js` dla sektora 2000, 2000.
4. Zaimplementować klasy `PigKing` i `RedEyedPig` w `js/entities/mobs/hostile.js` oraz metody w `entity-manager.js`.
5. Zaimplementować aktywację portalu ze Świniowych Bloków Krzesiwem w `js/interaction.js`.
6. Dodać obsługę wejścia i wyjścia z Królestwa Świń w `js/main.js`.
7. Napisać testy E2E CDP `tests/test_cdp_pig_king_boss.py` weryfikujące cały cykl.
8. Utworzyć commit i odpowiedzieć Tymkowi z przyjazną korektą językową i podsumowaniem nowości.
