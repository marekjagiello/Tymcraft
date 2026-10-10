---
title: 'Creeper Mob, 5x5 Block Explosion, 3 HP Damage & Gunpowder Drop'
type: 'feature'
ticket: ''
created: '2026-10-10'
status: 'built'
baseline_revision: '822f62090a5d8e82997541dcf0961b2e68f272e4'
route: 'oneshot'
route_source: 'pinned'
risk: 'medium'
review: 'none'
review_source: 'pinned'
lenses_ran: []
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The game lacks the iconic Minecraft Creeper mob, explosive interactions, block-destroying craters, and gunpowder drops for crafting.

**Approach:** Implement a hostile Creeper mob that quietly tracks the player, hisses and expands during a 1.0s fuse countdown within 3.2m, and detonates an explosion affecting a 5x5 block area. The explosion carves a crater destroying non-bedrock blocks (dropping items for collection) and deals exactly 3 HP damage (1.5 hearts) to the player and nearby entities. When killed by weapons before exploding, the Creeper drops Gunpowder (Proch Strzelniczy, item ID 36).

</frozen-after-approval>

## Implementation Notes

- Added `playHissSound()` and `playExplosionSound()` in `js/audio.js` using Web Audio API synthesis.
- Registered item ID 36 (`GUNPOWDER`) in `js/items.js` with icon in `js/ui.js` and drop rendering in `js/drops.js`.
- Implemented `Creeper` class in `js/entities/mobs/hostile.js`:
  - 10 HP (so a single Ruby Sword blow of 20 HP defeats it immediately).
  - Green textured body with classic Creeper face geometry.
  - Quiet stalk AI, 1.0s fuse timer upon getting within 3.2m of the player.
  - White flash and scale swelling during fuse; cancels if player retreats > 4.8m.
  - `explode()` destroys blocks in 5x5 footprint, spawns crater particles, deals 3 HP damage to player, damages nearby mobs, and spawns dropped blocks.
  - Drops Gunpowder (`id: 36`) when slain by player before exploding.
- Integrated Creeper spawning in `EntityManager` (`js/entities/entity-manager.js`) and exported through `js/animals.js`.
- Updated hit detection and messages in `js/interaction.js`.
- Bumped cache busters (`?v=creeper_1`) across modules.

