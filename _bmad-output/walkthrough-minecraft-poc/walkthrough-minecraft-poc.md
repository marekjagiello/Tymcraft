# Walkthrough: Minecraft POC Browser Game

Target: commit `4fd1902` — feat: implement Minecraft POC browser game

## Review blocks

- [ ] **Block 1: Intent** (current)
- [ ] **Block 2: Broad strokes**
- [ ] **Block 3: Procedural Generation & Biomes** (`js/simplex-noise.js`, `js/textures.js`, `js/world.js`)
- [ ] **Block 4: First-Person Controller & Physics** (`js/player.js`)
- [ ] **Block 5: Mining, Building & Interaction** (`js/interaction.js`, `js/ui.js`)
- [ ] **Block 6: Animated Animals & AI** (`js/animals.js`)
- [ ] **Block 7: Periphery & Styling** (`css/style.css`, `index.html`)

---

### Block 1: Intent

**Problem:** Need a lightweight, playable Proof-of-Concept browser game replicating core Minecraft dynamics (procedural terrain generation, distinct biomes, resource gathering/mining, block placement, and voxel animals) with zero build-tool friction in an environment without Node/npm.

**Approach:** Implement a modular browser application using Three.js (ES modules via CDN) and procedural canvas textures, featuring Simplex noise terrain generation across 4 biomes, raycast-based block mining and placement, first-person physics with voxel collision, and animated voxel animals with autonomous wandering AI.

*(Source: `_bmad-output/plan-minecraft-poc.md`)*
