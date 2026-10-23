# Plan Implementacji BMad: Łupy ze Zwierząt (Świnie, Owce, Krowy) i Dodanie Krowy do Świata

## 1. Wymagania Gracza (8 lat)
1. **Świnie (Pigs)**:
   - Po pokonaniu świnki wypada **Surowy Schab (Raw Porkchop)** 🥩 (1-2 sztuki).
   - Można go zjeść (PPM), odnawia 4 punkty głodu i leczy 2 serduszka HP.
2. **Owce (Sheep)**:
   - Po pokonaniu owcy wypada **Biała Wełna (White Wool)** 🧶 oraz **Surowa Baranina (Raw Mutton)** 🍖 (1-2 sztuki).
   - Baranina odnawia 3 punkty głodu i leczy 1 serduszko.
3. **Krowy (Cows)**:
   - Dodanie do gry klockowej **Krowy (Cow)** (klasyczna czarno-biała łaciata krówka z rogami i wymionami).
   - Krowy pasą się na łąkach i polanach razem ze świnkami i owieczkami.
   - Po pokonaniu krowy wypada **Surowa Wołowina (Raw Beef)** 🥩 (1-3 sztuki) oraz **Skóra (Leather)** 🟤 (1-2 sztuki).
   - Wołowina odnawia 5 punktów głodu i leczy 3 serduszka.
4. **Karmienie Niedźwiedzi**:
   - Wszystkie surowe mięsa (schab, baranina, wołowina) mogą też służyć do karmienia i leczenia zaprzyjaźnionego niedźwiedzia (PPM)!

---

## 2. Architektura Techniczna i Nowe Przedmioty

### Rejestr Przedmiotów (`js/items.js`):
- `PORKCHOP` (ID 38, typ `food`, nutrition: 4, heals: 2, name: 'Surowy Schab', icon: '🥩')
- `MUTTON` (ID 39, typ `food`, nutrition: 3, heals: 1, name: 'Surowa Baranina', icon: '🍖')
- `BEEF` (ID 40, typ `food`, nutrition: 5, heals: 3, name: 'Surowa Wołowina', icon: '🥩')
- `LEATHER` (ID 41, typ `material`, name: 'Skóra', icon: '🟤')
- `WOOL` (ID 42, typ `material`, name: 'Biała Wełna', icon: '🧶')

### Modele 3D Leżących Łupów (`js/drops.js`):
- `createPorkchopMesh()`: Różowo-czerwony kotlet schabowy z białą kostką.
- `createMuttonMesh()`: Ciemnoczerwona baranina.
- `createBeefMesh()`: Marmurkowy soczysty stek wołowy.
- `createLeatherMesh()`: Płat brązowej wyprawionej skóry.
- `createWoolMesh()`: Biała, puszysta miniaturowa kostka wełny.

### Klasa Krowy (`js/entities/mobs/passive.js`):
- Klasa `Cow extends Mob`:
  - Klockowy model: łaciate biało-czarne ciało, głowa z rogami, różowy pyszczek, wymiona i 4 kopytka.
  - 10 punktów życia, spokojny spacer, muczenie.
  - Metoda `die()` upuszczająca wołowinę i skórę.
- W `Pig.die()`: upuszczanie schabu.
- W `Sheep.die()`: upuszczanie wełny i baraniny.

### Zarządzanie Populacją (`js/entities/entity-manager.js`):
- Spawnowanie krów na starcie gry i utrzymywanie populacji zwierząt gospodarskich.

---

## 3. Etapy Wdrażania (Atomic Commits)
1. **Etap 1**: Rejestracja przedmiotów w `js/items.js`, ikon w `js/ui.js` oraz modeli 3D w `js/drops.js`.
2. **Etap 2**: Implementacja klasy `Cow` oraz metod `die()` ze spadaniem łupów dla świni, owcy i krowy w `js/entities/mobs/passive.js`.
3. **Etap 3**: Aktualizacja `AnimalManager` (spawnowanie krów), rozszerzenie karmienia niedźwiedzi w `interaction.js`, bump wersji cache `?v=drops_1`.
4. **Etap 4**: Weryfikacja składni pythonem, test w przeglądarce i zatwierdzenie zmian (git commit).
