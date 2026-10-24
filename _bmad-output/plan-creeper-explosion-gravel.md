# BMad Implementation Plan: Creeper Mob, Explosion AoE, Gravel Drop & Zapalniczka Crafting

## User Requirements Analysis
1. **Creeper Mob**:
   - Wanders around the world.
   - Detects the player, approaches, hisses, flashes white/expands, and explodes after ~1.5s fuse.
   - Explodes permanently (does not respawn, is gone from the world).
   - Explosion deals damage to the player and can kill nearby Zombies and Skeletons.
   - **Protection Rule**: Explosion does NOT destroy world blocks / player houses.
2. **Ruby Sword 1-Hit Kill**:
   - Creeper has <= 20 HP, so the Ruby Sword (20 HP damage) defeats him in a single hit ("na hita").
3. **Drop: Żwir (Gravel)**:
   - When killed by the player before exploding, Creeper drops Żwir (ID 12).
4. **Crafting: Zapalniczka (Flint & Steel / Lighter)**:
   - Item ID 36 (Zapalniczka).
   - Craftable in 2x2 grid using Żwir (ID 12) + Kamień/Bruk (ID 3 lub ID 11).
   - Icon: 🔥 with glow.
5. **Language Coaching for 8-Year-Old User**:
   - "po wybuchnięciu" -> "po wybuchu" 💥
   - "moje wymarzenia" -> "moje marzenia" ✨
   - "na hita" -> "jednym ciosem" ⚔️
   - "robimy z tego zapalniczka" -> "robimy z tego zapalniczkę" 🔥

---

## Technical Architecture

### 1. Audio Synthesis (`js/audio.js`)
- `playHissSound()`: Synthesize white noise hiss buffer for 1.2s.
- `playExplosionSound()`: Synthesize booming low rumble + noise burst.

### 2. Creeper Class (`js/entities/mobs/hostile.js`)
- Extends `Mob`.
- Visual model:
  - Green box head with iconic sad face (black pixels).
  - Green patterned torso.
  - 4 animated walking legs (2 front, 2 back).
- AI states: `'idle'` | `'walk'` | `'fusing'`.
- `fuseTimer`: counts down from 1.5s when within 3.2m of player.
- Flashing white pulse and scale expansion during fuse.
- If player retreats > 5.0m, defuses back to `'walk'`.
- `explode()`:
  - Sounds boom, spawns explosion cloud + flame particles.
  - AoE damage: entities in 4.5m radius (Player takes up to 14 damage; mobs take 20 damage).
  - No block destruction.
  - Removes Creeper immediately.
- `die(exploded=false)`:
  - If killed by player, drops Żwir (ID 12).

### 3. Entity Management (`js/entities/entity-manager.js` & `js/animals.js`)
- Spawns initial Creeper wandering in the world.
- Periodic population check: maintains 1-2 Creepers.
- Support `spawnCreeperInFrontOfPlayer(player, distance)`.
- Export `Creeper` in `js/animals.js`.

### 4. Items & Crafting (`js/items.js`, `js/crafting.js`, `js/ui.js`)
- Register `LIGHTER: { id: 36, name: 'Zapalniczka', type: ITEM_TYPES.TOOL, icon: 'lighter' }`.
- Recipe in `crafting.js`: Żwir (12) + Kamień (3) / Bruk (11).
- Slot icon in `ui.js`: 🔥 with flame glow.

### 5. Cache Busting & Verification
- Bump cache bust version `?v=creeper_1`.
- Verify JS syntax and runtime logs.
