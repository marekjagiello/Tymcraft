---
title: 'Survival Mechanics, 2x2 Crafting, and LocalStorage World Persistence'
type: 'feature'
ticket: ''
created: '2026-10-05'
status: 'built'
baseline_revision: '50af29a'
route: 'full'
route_source: 'auto'
risk: 'low'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The POC currently operates in an unlimited creative mode without survival stakes (no health, hunger, or damage), has no tool progression or crafting (all blocks are mined with bare hands at equal speed), and loses all world modifications and player state upon browser refresh.

**Approach:** Implement a cohesive survival gameplay loop consisting of:
1. Survival stats (Health & Hunger bars, fall damage calculation, hunger depletion, food consumption like apples from leaves to heal).
2. 2x2 Crafting & Inventory modal (toggled with 'E' key: wood -> planks -> sticks -> wooden/stone pickaxes, mining speed boost when using appropriate tools).
3. LocalStorage Persistence (auto-saving block delta modifications, player position, health, hunger, and inventory items, with a 'Reset World' button).

## Boundaries & Constraints

**Always:**
- Keep pure client-side architecture (zero Node/server requirements), persisting state via `localStorage` with JSON serialization.
- Toggle Crafting/Inventory overlay with key 'E' (or ESC), unlocking/locking PointerControls seamlessly.
- Health display: 10 hearts (20 HP) styled with retro pixel-art hearts; Hunger display: 10 hunger icons (20 points).
- Fall damage: calculate based on falling velocity / distance (falls > 3 blocks inflict damage with a red screen flash effect).
- When hunger is > 18 points, health slowly regenerates; when hunger drops to 0, player takes starvation damage down to 1 HP.
- 2x2 Crafting grid with output slot:
  - 1 Wood Log -> 4 Planks
  - 2 Planks (vertical) -> 4 Sticks
  - 3 Planks + 2 Sticks -> Wooden Pickaxe (breaks stone 3x faster)
  - 3 Cobblestone + 2 Sticks -> Stone Pickaxe (breaks stone 5x faster)
- Tool durability / held item: show active held item in player hand or hotbar.
- Auto-save to `localStorage` every 5 seconds and on block place/destroy.

**Never:**
- Do not make `localStorage` store raw 130k voxel array (that would exceed browser 5MB quota!). Store only the sparse block modification delta (`{ "x,y,z": blockId }`) and player state, keeping memory usage tiny (< 50 KB).
- Do not break existing Three.js rendering performance; keep UI lightweight DOM elements overlaid on the canvas.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Open Inventory/Crafting | Press 'E' key in-game | Release pointer lock, show 2x2 crafting UI with player inventory slots | Close on 'E' or 'Escape' or close button |
| Craft Planks | Place 1 Wood Log in any 2x2 grid slot | Output slot shows 4 Planks; clicking output consumes 1 Wood and adds 4 Planks to inventory | Handle dragging/clicking when inventory full |
| Fall Damage | Player falls from height > 3 blocks | Player takes damage proportional to fall distance, brief red vignette flash on screen | Clamp HP between 0 and 20; if HP == 0, show Respawn screen |
| Hunger Depletion & Food | Sprinting or walking over time | Hunger bar decreases by 1 point per 30-40s; clicking food (Apple/Bread) consumes item and restores 4 hunger | Prevent eating when hunger is at maximum (20) |
| World Persistence | Place/break blocks, refresh page | On reload, world loads with all placed/broken blocks restored from `localStorage`, player spawns at saved XYZ | Fallback to freshly generated procedural world if `localStorage` corrupted or empty |
| Reset World | Click "Reset World" button in UI | Clear `localStorage` delta, reload page, regenerate fresh pristine world | Ask confirmation before clearing |

</frozen-after-approval>

## Code Map

- `js/storage.js` -- New module: Manages `localStorage` world delta, player coordinates, inventory, health/hunger state, auto-save timer, and reset.
- `js/survival.js` -- New module: Manages Health (20 HP), Hunger (20 pts), fall damage detection, red hurt flash effect, health regeneration, and respawn.
- `js/crafting.js` -- New module: Manages 2x2 crafting recipes (Planks, Sticks, Wooden Pickaxe, Stone Pickaxe), recipe matching, and crafting grid state.
- `js/player.js` -- Update: Hook fall distance into `survival.js` on landing, hook sprint energy/hunger, sync position to `storage.js`.
- `js/interaction.js` -- Update: Dynamic mining speed based on held tool (pickaxe speeds up stone mining), notify `storage.js` on block change.
- `js/ui.js` -- Update: Health hearts HUD, Hunger icons HUD, 'E' Inventory & 2x2 Crafting modal overlay, red hurt vignette, and save/reset buttons.
- `css/style.css` -- Update: Pixel-art hearts and hunger bars, inventory/crafting modal styling, damage flash vignette.
- `js/main.js` -- Update: Integrate `Storage`, `Survival`, and `Crafting` systems into main game loop.

## Tasks & Acceptance

**Execution:**
- [ ] `js/storage.js` -- Implement LocalStorageManager for sparse block deltas and player stats -- Ensures world and progress survive page refreshes.
- [ ] `js/survival.js` -- Implement SurvivalManager (health, hunger, fall damage, starvation, regeneration, eating) -- Introduces true survival stakes.
- [ ] `js/crafting.js` -- Implement CraftingManager with 2x2 grid recipes for planks, sticks, wooden and stone pickaxes -- Adds resource progression.
- [ ] `css/style.css` -- Add styles for hearts, hunger icons, damage vignette, and crafting modal -- Provides retro Minecraft survival HUD.
- [ ] `js/ui.js` -- Render hearts, hunger bar, 'E' crafting dialog, and save/reset controls -- Connects survival and crafting data to screen.
- [ ] `js/player.js` -- Integrate fall damage detection and inventory toggle input -- Links player physics with survival manager.
- [ ] `js/interaction.js` -- Apply tool-based mining speed and record block changes to storage -- Differentiates hand vs pickaxe mining.
- [ ] `js/world.js` -- Apply saved block modifications from storage on generation -- Restores player's built structures.
- [ ] `js/main.js` -- Wire up storage, survival, and crafting in the game loop and auto-save -- Coordinates all new subsystems.

**Acceptance Criteria:**
- Given the player is in survival mode, when falling from high places, then health decreases, hearts update, and red screen flash triggers.
- Given the player presses 'E', when in game, then the 2x2 crafting interface opens with recipe output (planks, sticks, pickaxe).
- Given a pickaxe is crafted and held, when mining stone, then stone breaks significantly faster than with bare hands.
- Given blocks are placed or mined, when the browser page is refreshed, then all modifications remain exactly as the player left them.

## Implementation Notes

- LocalStorage uses key `mc_poc_world_delta` and `mc_poc_player_state` storing sparse modifications to remain < 50 KB.
- Visual hearts and hunger bars are generated dynamically with SVG/Canvas pixel-art so no external images are required.

## Plan Change Log

_None._

## Review Triage Log

_None._

## Verification

**Commands:**
- `uv run --with playwright python3 tests/test_playwright.py` -- expected: Game loads with new survival HUD, no console errors.
