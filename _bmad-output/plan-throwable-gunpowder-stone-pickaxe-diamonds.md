---
title: 'Throwable Gunpowder Bomb & Stone Pickaxe Requirement for Diamond Ore'
type: 'feature'
ticket: ''
created: '2026-10-10'
status: 'built'
baseline_revision: '427a71fb8a8b8625b34b0753a92b3c8d12ea4fe1'
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

**Problem:** Gunpowder was purely a passive drop with no direct throwing or explosive utility, and Diamond Ore could previously be mined with bare hands or weaker wooden tools.

**Approach:**
1. Make Gunpowder (item ID: 36) throwable with right-click as a ballistic explosive charge. On impact, it detonates with explosion particles and sound, destroying nearby blocks and ores (Coal Ore, Stone, Cobble, Dirt, etc.) and spawning drops, while strictly protecting Diamond Ore (15), Ruby Ore (16), and Bedrock (14) from blast damage.
2. Require at least a Stone Pickaxe (ID: 22) or Diamond Pickaxe (ID: 33) to mine Diamond Ore (ID: 15), blocking bare hands and wooden tools with a warning message.

</frozen-after-approval>

## Implementation Notes

- Created `ThrownGunpowder` entity in `js/entities/projectile.js`:
  - 3D pouch mesh with smoking red fuse.
  - Ballistic trajectory and tumble rotation.
  - Impact detonation destroying non-protected blocks and dealing 15 damage to nearby mobs.
  - Excludes Diamond Ore (15), Ruby Ore (16), and Bedrock (14).
- Added `spawnThrownGunpowder` in `EntityManager` (`js/entities/entity-manager.js`) and exported through `js/animals.js`.
- Implemented `throwGunpowder()` on right-click in `js/interaction.js`.
- Enforced Stone Pickaxe requirement for Diamond Ore in `breakBlock()` (`js/interaction.js`).
- Bumped cache busters (`?v=throw_gunpowder_1`).

