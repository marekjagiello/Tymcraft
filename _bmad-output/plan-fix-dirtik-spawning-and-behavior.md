---
title: 'Fix Dirtik Mimic Mob Spawning, Alignment and Awakening'
type: 'bug'
ticket: ''
created: '2026-10-10'
status: 'built'
baseline_revision: '19e9f1d'
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

**Problem:** The player (an 8-year-old child) reported that "Dirtiki don't work, there are none of them at all". Investigation revealed:
1. Dirtiks were only created twice at fixed startup coordinates `(34, 32)` and `(24, 38)`. If the player moved away, loaded a saved position elsewhere, or killed them, zero Dirtiks would ever spawn again.
2. Coordinates were not grid-centered (`+0.5`), causing raycast and mining distance calculations (`dist < 1.15`) to fail.
3. Disguised Dirtiks lacked proximity detection, so walking right past them never triggered the mimic ambush.

**Approach:**
1. Dynamic Spawning in `EntityManager`:
   - Spawn 2-3 disguised Dirtiks near the player's initial position on solid surface blocks (Grass/Dirt).
   - In `EntityManager.update()`, maintain 2 to 3 Dirtiks near the player: spawn every 12s within 12-25m on valid surface terrain; despawn if > 45m away.
2. Grid Alignment & Geometry:
   - Center Dirtik coordinates on block centers (`Math.floor(x) + 0.5, Math.floor(z) + 0.5`).
   - Ensure `snapToGround()` places the disguise flush on ground level.
3. Proximity & Hitbox Triggers:
   - If player gets within 2.3m of a disguised Dirtik, Dirtik automatically pops out with battle cry: `🗣️ „Ja to Dirtik, a tyś chciał mnie zabić!” 🗡️🟫`.
   - Widen break/place block detection radius to `1.5m` in `js/interaction.js` so mining/placing near Dirtik immediately triggers him.
   - Cache bust to `?v=dirtik_fix_1`.

</frozen-after-approval>

## Implementation Notes

- Edit `js/entities/entity-manager.js`:
  - Add `spawnInitialDirtiks(count = 2)`.
  - Add periodic spawn loop in `update(dt, playerPosition)`.
  - Add distance cleanup for far Dirtiks.
- Edit `js/entities/mobs/hostile.js`:
  - In `Dirtik`: snap `x` and `z` to `Math.floor(...) + 0.5`.
  - In `Dirtik.update()`: check `distToPlayer <= 2.3` to awaken.
- Edit `js/interaction.js`:
  - Ensure distance check in `breakBlock()` and block placing awakens Dirtik when within 1.5 blocks.
- Bump cache buster in `index.html` and `js/main.js` to `?v=dirtik_fix_1`.
