---
title: 'Minecraft POC Browser Game'
type: 'feature'
ticket: ''
created: '2026-10-05'
status: 'built'
baseline_revision: 'NO_VCS'
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

**Problem:** Need a lightweight, playable Proof-of-Concept browser game replicating core Minecraft dynamics (procedural terrain generation, distinct biomes, resource gathering/mining, block placement, and voxel animals) with zero build-tool friction in an environment without Node/npm.

**Approach:** Implement a modular browser application using Three.js (ES modules via CDN) and procedural canvas textures, featuring Simplex noise terrain generation across 4 biomes, raycast-based block mining and placement, first-person physics with voxel collision, and animated voxel animals with autonomous wandering AI.

## Boundaries & Constraints

**Always:**
- Run directly in modern web browsers (via `python3 -m http.server` or direct static serving) with zero npm/node build steps.
- Use procedural 16x16 pixel textures generated via HTML5 Canvas (dirt, grass, stone, sand, wood, leaves, snow) to guarantee zero broken image assets or CORS errors.
- First-person controls using PointerLockControls: WASD movement, Space to jump, gravity, and bounding-box collision against solid voxel blocks.
- Block interaction: Raycasting with targeted block outline; Left-Click to mine (removes block, adds to inventory), Right-Click to place currently selected block.
- Procedural world with at least 4 biomes (Plains, Desert, Forest, Mountains/Snow) using multi-octave noise, water level, and procedural vegetation (trees/cacti).
- Animated blocky animals (e.g. Pig, Sheep) with head, body, moving legs, and autonomous wandering/idle AI.
- Hotbar UI with 1-9 number keys / scroll wheel to select active block type, plus crosshair and controls guide.

**Never:**
- Do not introduce Node.js/npm dependencies (Webpack, Vite, npm packages) as Node is not installed on the system.
- Do not build infinite chunk streaming with unbounded memory allocation for this initial POC (keep a performant 64x64 or 80x80 playable area with height 32 for smooth 60 FPS).
- Do not overcomplicate with complex crafting recipes or survival health/hunger bars in this initial slice.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Launch Game | Open `index.html` in browser | Display start overlay with instructions; clicking enters Pointer Lock and starts game loop | Fallback message if WebGL unsupported |
| Mine Block | Left-Click crosshair on block within 5 units | Block destroyed, removed from voxel grid and scene, inventory incremented | Ignore clicks when distance > reach limit or pointing at air/water |
| Place Block | Right-Click crosshair on block face within reach | New block placed adjacent to targeted face, decrements inventory (or unlimited in creative/POC mode) | Prevent placing block intersecting player's own bounding box |
| Movement & Collision | WASD + Space on terrain | Player moves, jumps, collides with blocks, cannot walk through walls | Clamp position if near world boundary |
| Biome Transition | Walking across world coordinates | Terrain smoothly shifts height, color, and flora between Plains, Forest, Desert, and Mountains | Continuous noise functions prevent sharp unnatural biome cliffs |
| Animals Wandering | Animals in world during tick | Animals roam, rotate towards destination, swing legs while moving, hop up single-block obstacles | Keep within world boundaries, do not drown in deep water |

</frozen-after-approval>

## Code Map

- `index.html` -- HTML container, HUD overlays (crosshair, hotbar UI, block icons, instructions, FPS counter).
- `css/style.css` -- Retro Minecraft-like UI styling, hotbar styling, start overlay.
- `js/simplex-noise.js` -- Self-contained, lightweight 2D/3D Simplex & Perlin noise implementation for procedural generation.
- `js/textures.js` -- Procedural pixel-art texture generator for voxel blocks (grass_top, grass_side, dirt, stone, sand, wood, leaves, snow, pig, sheep) using Canvas 2D API.
- `js/world.js` -- Voxel data structure, biome heightmap computation, chunk meshing with face-culling optimization for 60 FPS performance.
- `js/player.js` -- First-person controller using Three.js `PointerLockControls`, gravity, velocity, AABB voxel collision detection.
- `js/interaction.js` -- Raycasting for block targeting, selection wireframe, left-click break, right-click build.
- `js/animals.js` -- Procedural voxel animal models (Sheep, Pig) with leg-swing animation and autonomous state-machine AI (wander, idle, obstacle hopping).
- `js/main.js` -- Main entry point, Three.js WebGLRenderer, scene, lighting (sun, ambient), day-night cycle, render loop.

## Tasks & Acceptance

**Execution:**
- [ ] `index.html` -- Create clean entry point with HUD, hotbar, crosshair, and instructions modal -- Provides UI and canvas mount.
- [ ] `css/style.css` -- Style HUD, hotbar slots, selection highlight, retro font, crosshair -- Ensures immersive Minecraft look.
- [ ] `js/simplex-noise.js` -- Implement fast 2D/3D noise with fractal octaves -- Foundation for smooth procedural terrain and biomes.
- [ ] `js/textures.js` -- Build procedural 16x16 canvas textures for all block types and animal skins -- Completely eliminates external asset loading issues.
- [ ] `js/world.js` -- Implement voxel grid, biome generator (Plains, Forest, Desert, Mountains), tree/cactus placement, and face-culled geometry mesher -- Core world rendering and generation.
- [ ] `js/player.js` -- Implement player physics, WASD movement, jumping, and AABB voxel collision -- Authentic first-person player controller.
- [ ] `js/interaction.js` -- Implement raycasting, target block wireframe, block breaking (left-click) and placement (right-click) -- Core gathering and building dynamics.
- [ ] `js/animals.js` -- Create voxel Pig and Sheep models, leg walking animations, and roaming AI -- Adds lively creatures to the world.
- [ ] `js/main.js` -- Wire up Three.js scene, camera, lighting, day/night cycle, and game loop -- Coordinates all subsystems.

**Acceptance Criteria:**
- Given the game is loaded in the browser, when the user clicks the screen, then Pointer Lock engages and first-person camera responds to mouse movement.
- Given the player is in the world, when WASD and Space are pressed, then the player moves smoothly, jumps, and does not clip through solid voxel blocks.
- Given the player looks at a block within 5 blocks, when Left-Click is pressed, then the targeted block is removed from the world.
- Given the player has a block selected in the hotbar, when Right-Click is pressed on a valid block face, then a new block is placed without intersecting the player.
- Given the world is generated, when exploring, then distinct biomes (Plains with grass/trees, Desert with sand/cacti, Forest with dense trees, Mountains with stone/snow) and roaming voxel animals (Pigs/Sheep) are visibly active.

## Implementation Notes

- Using pure ES Modules with Three.js from unpkg/cdnjs.
- Procedural canvas-based pixel textures ensure zero HTTP asset 404s and no CORS taint issues.
- Face culling: only render block faces that are exposed to air or transparent blocks, ensuring high frame rates.

## Plan Change Log

_None._

## Review Triage Log

_None._

## Design Notes

- Block Types:
  1. Grass Block (`GRASS`)
  2. Dirt (`DIRT`)
  3. Stone (`STONE`)
  4. Wood Log (`WOOD`)
  5. Leaves (`LEAVES`)
  6. Sand (`SAND`)
  7. Snow/Cobblestone (`SNOW`)
  8. Planks (`PLANKS`)
  9. Glass (`GLASS`)
- Animal Models:
  - Sheep: White wool body, pink/gray face, 4 legs.
  - Pig: Pink body, snout, floppy ears, 4 legs.

## Verification

**Commands:**
- `python3 -m http.server 8000` -- expected: Server starts and serves `index.html` at `http://localhost:8000`.

**Manual checks (if no CLI):**
- Verify 60 FPS in browser with WebGL.
- Test pointer lock, WASD movement, jumping, and terrain collision.
- Test block breaking with Left-Click and block placing with Right-Click.
- Observe roaming animals and verify biome variations across the terrain.
