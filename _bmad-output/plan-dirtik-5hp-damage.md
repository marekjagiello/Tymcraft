---
title: 'Dirtik 5 HP Damage (2.5 Hearts Attack)'
type: 'feature'
ticket: ''
created: '2026-10-11'
status: 'completed'
baseline_revision: '4c8066e'
route: 'oneshot'
route_source: 'pinned'
risk: 'low'
review: 'none'
review_source: 'pinned'
lenses_ran: []
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** 
8-letni gracz poprosił w nagraniu: „Zrób tak, żeby Dircik zadawał 5 HP”. Dotychczas Dircik zadawał 2 HP (1 serduszko). Mając w ręku diamentowy miecz, powinien zadawać 5 HP (2.5 serduszka), czyniąc go groźniejszym przeciwnikiem.

**Approach:**
1. W `js/entities/mobs/hostile.js`:
   - Dodać `this.attackDamage = 5;` w konstruktorze `Dirtik`.
   - Zaktualizować wywołanie `takeDamage` przy ataku na `5` HP: `this.manager.survival.takeDamage(this.attackDamage, 'Cios Dirtika diamentowym mieczem! 🗡️');`.
2. Zaktualizować cache buster do `?v=dirtik_5hp_1` w `index.html`, `js/main.js`, `js/animals.js`, `js/entities/entity-manager.js`.
3. Przetestować i wykonać atomic commit.

## Boundaries & Constraints

**Always:**
- Całkowity zakaz przycisków na HUD.
- Commit po zakończeniu i przetestowaniu zmiany.
- Zgodność z instrukcjami dla 8-letniego gracza (pozytywna, jasna komunikacja).

</frozen-after-approval>

## Tasks & Acceptance

- [ ] `js/entities/mobs/hostile.js`: Ustawienie zadawanych obrażeń przez Dirtika na 5 HP.
- [ ] Bump cache busters do `?v=dirtik_5hp_1`.
- [ ] Weryfikacja działania w grze.
- [ ] Atomic commit w Git.

**Acceptance Criteria:**
- Given gracz zbliża się do obudzonego Dirtika, when Dirtik trafia gracza mieczem, then gracz traci dokładnie 5 punktów życia (2.5 serduszka bez zbroi).
