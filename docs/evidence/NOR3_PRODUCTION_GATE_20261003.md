# NOR // 3 production gate — 2026-10-03

## Goal

Decide whether cinematic-production-v3 is good enough as procedural/shared geometry, and identify the smallest authored-asset set required to reach production quality.

No asset is generated merely because a Blender generator exists.

## Evidence source

Canonical runtime only:

`web/src/engine/room-installations.js → buildInstallation('norwegian', ...)`

Review:

`norwegian-engine-review.html`

Evidence harness:

`web/nor3-canonical-evidence.mjs`

The old review geometry snapshot and old `review/norwegian-engine/` surface are not valid evidence.

## Required captures

Desktop 1440×900:
- overview
- three rails
- protocol
- environment bay
- podium vault
- fjord relief
- recovery
- Kona line

Phone 390×844:
- overview
- three rails
- protocol
- recovery
- Kona line

Landscape phone 844×390:
- overview
- three rails
- protocol
- fjord
- Kona line

## Technical gate

No browser/page/network errors.

Metrics must remain within the room manifest's device budgets:
- mobile: <= 95 draw calls, <= 180k triangles
- desktop: <= 180 draw calls, <= 450k triangles

The evidence harness fails automatically on budget violations.

## Visual gate

Score each dimension 0–2 for every signature view.

- 0 = clearly prototype/blockout
- 1 = credible but visibly procedural/simple
- 2 = production-ready for the room's intended aesthetic

Dimensions:
- composition and depth
- material response
- silhouette/detail richness
- scale and physical credibility
- environmental storytelling
- lived-in detail / traces of use
- lighting hierarchy
- typography integration
- interaction/readability
- mobile framing

Promotion target:
- no 0 scores in any signature view
- average >= 1.6 across all signature views
- overview, lanes and protocol each average >= 1.8

## Authored-asset hypotheses

### Tier 1: generate only if evidence confirms weakness

1. trainer
   - repeated three times
   - one of the dominant lane silhouettes
   - current representation is cylinders + boxes
   - authored detail could improve all three lane views simultaneously

2. run-deck
   - repeated three times
   - visually communicates that each lane is a complete multisport station
   - current representation is simple deck/rollers/console geometry

3. analyser
   - focal prop in the dedicated Protocol view
   - current representation is a simple body/screen block
   - likely highest close-up credibility gain per single new asset

### Tier 2: conditional

4. environment bay
   - authored frame/hardware only if current glass composition lacks believable depth
   - do not replace working procedural glass/material/atmosphere merely to create a GLB

5. protocol table
   - author only if close-up evidence shows the simple geometry is visibly limiting
   - furniture silhouette alone is not enough reason

### Procedural preferred

- podium vault: abstraction is intentional
- fjord relief: layered procedural geometry is the concept
- fans: simple repeated mechanical prop; keep procedural unless a close-up becomes important
- vial rack: instancing is efficient and visually appropriate
- recovery bench/rollers/bottles/towels: ordinary objects should stay composed/shared
- wet fields, contact shadows, atmosphere, typography, lighting: render/environment primitives, not GLBs

## Comparison method

If a Tier 1 asset is generated:
1. capture the exact same fixed views before and after;
2. compare only the views materially affected by that asset;
3. reject the authored asset if it does not improve the relevant visual score or if it creates a performance regression disproportionate to the gain;
4. keep one representation only after the decision.

Do not keep procedural and authored versions as parallel production authorities.

## Promotion decision

Current state: `candidate / unwired`.

Possible next state after evidence: `visual-review`.

Do not promote to `approved-unwired` until:
- canonical builder is stable;
- asset/layout/story mapping is complete;
- visual gate passes;
- technical budgets pass;
- truth and rights boundaries remain clean;
- no duplicate geometry/review/runtime authority exists.
