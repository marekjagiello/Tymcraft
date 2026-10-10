---
title: 'Dirtik Mimic Mob (Dirt Block Disguise, Diamond Sword Attack & Speech)'
type: 'feature'
ticket: ''
created: '2026-10-10'
status: 'built'
baseline_revision: '423b7c7'
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

**Problem:** The game lacks disguise/mimic mobs that surprise players exploring the world.

**Approach:** Implement "Dirtik", a playful mimic mob disguised as an ordinary Dirt block on surface terrain. When the player tries to mine it (left click) or place a block on top of it (right click), Dirtik pops out into an animated dirt-creature wielding a glowing Diamond Sword, shouts the comic message "Ja to Dirtik, a tyś chciał mnie zabić! 🗡️🟫", chases and attacks the player dealing 1 heart (2 HP) per hit, and drops a generous stash of Dirt blocks upon defeat (8 HP).

</frozen-after-approval>

## Implementation Notes

- Created `Dirtik` class in `js/entities/mobs/hostile.js`:
  - Disguised model: a static dirt block mesh indistinguishable from normal dirt blocks.
  - Awakened model: articulated dirt-themed humanoid mob with glowing Diamond Sword in hand.
  - Triggers: interaction raycast (mining or placing on Dirtik) immediately awakens him.
  - Battle shout: popup on screen `Ja to Dirtik, a tyś chciał mnie zabić! 🗡️🟫`.
  - Attack: deals 2 HP (1 heart) damage on hit with sword swing animation and "bum bum bum" audio hits.
  - Health & Drops: 8 HP; drops 4-6 Dirt items (ID: 2) upon death.
- Integrated into `EntityManager`:
  - Spawns initial Dirtik disguised on the grassy plains near player.
  - Exposes helper `spawnDirtikInFrontOfPlayer()` for easy testing.
- Updated `js/interaction.js` to detect interaction with disguised Dirtik when clicked with left or right mouse button.
- Bumped cache busters (`?v=dirtik_1`).

