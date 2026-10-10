---
title: 'Rebalance Deep Ore Rarity: 10% Ruby Ore and 20% Diamond Ore Deep Underground'
type: 'feature'
ticket: ''
created: '2026-10-10'
status: 'built'
baseline_revision: '0806c892149af85940a5e0f68fbc25d9bd0d1ad4'
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

**Problem:** Diamond and Ruby ores were previously too common or generated at higher elevations, making valuable gemstones too easy to find.

**Approach:** Restrict Diamond Ore to deep layers (Y <= 10) with 20% occurrence chance in rare underground veins, and make Ruby Ore ultra-rare by burying it mega deep (Y <= 7, near bedrock) with only 10% occurrence chance. This rewards deep exploration and mining expeditions.

</frozen-after-approval>

## Implementation Notes

- Updated `js/world.js` ore generation loop:
  - Diamond Ore (ID: 15): Y <= 10 in deep stone, calibrated to exactly 20% occurrence in rare veins.
  - Ruby Ore (ID: 16): Y <= 7 in deepest stone layers near bedrock, calibrated to 10% occurrence.
- Bumped cache busters (`?v=rare_ores_1`).

