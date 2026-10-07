<!-- bmad:context -->
<!-- Verified 2026-10-07 against 6784a3c. Managed by bmad-project-context; edits inside this block are replaced on refresh. Keep anything you want preserved outside the markers. -->

## Minecraft Web POC

Voxel survival game prototype inspired by Minecraft, built in Vanilla JavaScript with Three.js (ES Modules, WebGL). Runs directly in browser with no build step or bundler. Architectural plans and design documents live in `_bmad-output/`.

## Policy

- No UI action buttons on screen — strictly prohibited by user (no reset buttons, kill buttons or debug triggers in HUD; all actions must be in-game keyboard/mouse controls).
- Maintain strictly at most 1 Snake in the world (`killSnakesExceptOne()` in `AnimalManager`).
- Never push or commit without verifying browser execution or user consent.

## Where things are

- Entry point: `index.html` loads `js/main.js`.
- World generation & voxel chunk storage: `js/world.js`
- Procedural textures & atlas generation: `js/textures.js`
- Player physics, collision & camera: `js/player.js`
- Interaction, raycasting, mining & combat: `js/interaction.js`
- Animals, monsters, AI & projectiles (Pig, Sheep, Snake, Zombie, Skeleton): `js/animals.js`
- Dropped items physics & pickup: `js/drops.js`
- Survival logic (HP, Hunger, Fall damage): `js/survival.js`
- 2x2 Crafting grid & recipes: `js/crafting.js`
- UI, HUD, Hotbar & inventory modal: `js/ui.js`
- LocalStorage persistence: `js/storage.js`
- Launch scripts: `start_game.sh` and `stop_game.sh`

## Running and verifying

- Start local dev server: `./start_game.sh` or `python3 -m http.server 8000`.
- Verify JS syntax: Node is not installed on system; verify syntax via Python AST / bracket checks.
- End-to-end browser tests: `tests/test_playwright.py`.
- Play & verify game: `http://localhost:8000/`.

## Conventions that differ from defaults

- Cache busting: Browser aggressively caches ES modules. Any change to `main.js`, `animals.js`, `interaction.js`, or `ui.js` MUST bump query parameter `?v=...` in `index.html` and `js/main.js`.
- Tall humanoid hitbox: Tall mobs (Zombie, Skeleton) are 1.85m tall; raycasting hitbox cylinder must be height 1.85 with radius 0.95.
- Item IDs: Blocks are 1-14; tools/items are 20-28; non-placeable items must be guarded in `placeBlock()`.

## Known pitfalls

- `node` command is not available in environment; use Python3.
- Modifying UI to add debugging/cheat buttons violates project rules.
- Forgetting to bump `?v=...` leads to user seeing outdated cached code upon refresh.

<!-- /bmad:context -->
