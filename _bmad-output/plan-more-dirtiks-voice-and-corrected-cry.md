---
title: 'More Dirtik Mobs, Real Voice Speech Synthesis, and Corrected Battle Cry'
type: 'feature'
ticket: ''
created: '2026-10-10'
status: 'built'
baseline_revision: '400d42c'
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
1. The user wants more Dirtiks in the world (currently limited to 2-3).
2. The user requested that Dirtik actually speaks aloud using voice ("żeby mówił"), and corrected the phrase from the archaic "tyś chciał mnie zabić" to the proper Polish "ty chciałeś mnie zabić" ("nie mówi: tyś chciał mnie zabić, nie mówi tak!").

**Approach:**
1. Increase Dirtik population and spawning:
   - Spawn 5 initial Dirtiks near the player at startup.
   - Maintain 5 to 7 active Dirtiks around the player (within 10-28m).
   - Lower spawn timer check from 10s to 4.5s so new Dirtiks appear swiftly and populate the landscape.
2. Voice Speech Synthesis (`js/audio.js`):
   - Add `speakDirtikCry()` using the browser's Web Speech API (`SpeechSynthesisUtterance` with `pl-PL`, pitch 1.3, rate 1.15).
   - Call `speakDirtikCry()` in `Dirtik.awaken()`.
3. Correct Battle Cry text:
   - Change popup and console text to: `🗣️ „Ja to Dircik, a ty chciałeś mnie zabić!” 🗡️🟫`.
4. Bump cache busters (`?v=dirtik_voice_1`).

</frozen-after-approval>

## Implementation Notes

- Edit `js/audio.js`:
  - Export `speakDirtikCry()`.
- Edit `js/entities/mobs/hostile.js`:
  - Import `speakDirtikCry` and invoke in `Dirtik.awaken()`.
  - Update battle cry text to `🗣️ „Ja to Dircik, a ty chciałeś mnie zabić!” 🗡️🟫`.
- Edit `js/entities/entity-manager.js`:
  - Spawn 5 initial Dirtiks in `spawnInitialAnimals()`.
  - In `update()`, maintain 5 to 7 active Dirtiks around player; spawn interval 4.5s; despawn distant ones (> 45m).
- Bump cache busters in `index.html` and `js/main.js` to `?v=dirtik_voice_1`.
