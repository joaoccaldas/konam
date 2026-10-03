---
name: konam-room-studio
description: Create, refactor, validate, and promote Kona.m rooms and room assets without forking product architecture. Use for athlete rooms, exhibitions, seasonal rooms, portals, partner rooms, and any new spatial experience.
---

# Kona.m Room Studio

## Goal

Turn a room idea into a production-ready Kona.m room using the existing world, renderer, interaction, bike, progression, brand, asset, evidence, and release systems.

The room may have a radically different atmosphere. The product architecture may not fork.

## Non-negotiable architecture

Before writing room code, run:

`node tools/check-before-create.mjs room <room-name-or-id>`

Before creating a room asset, run:

`node tools/check-before-create.mjs asset <asset-name-or-id>`

Record the reuse decision in the room/asset planning notes. Then inspect:
- `docs/BRAND_SYSTEM.md`
- `brand/tokens.css`
- `world/konam/rooms-v1.json`
- `world/konam/rooms/<room-id>.room.json`
- `docs/architecture/ROOM_ASSET_CONTRACT_V1.md`
- `museum/bike.schema.json`
- `web/src/engine/machine-inspection.js`
- `tools/validate-room-package.mjs`

A room must reuse the host:
- renderer and render quality policy
- camera/player/navigation
- route/walkability conventions
- pickables and semantic interaction surfaces
- global cards/dialogs/UI
- progression and storage
- machine inspection
- bike/product identity
- brand tokens and typography
- release/evidence conventions

Do not create a room-local renderer, camera framework, navigation shell, modal framework, progression engine, storage namespace, bike schema, or design system.

## Reuse-first rule

Always apply this order:

1. REUSE existing canonical asset or primitive.
2. ADAPT or RESTYLE an existing asset.
3. COMPOSE existing primitives differently.
4. CREATE a new asset only when the first three cannot express the room truthfully.

Search before generating:
- `museum/catalog/`
- `museum/bikes/`
- `museum/art/`
- `assets/`
- `app/admin-assets.json`
- `collections/`
- existing room modules and installations
- candidate/Next100 inventory

For every planned asset, record one decision: `REUSE`, `ADAPT`, `RESTYLE`, or `NEW`.

## Room package contract

Every room uses `world/konam/rooms/<room-id>.room.json`.

Required conceptual fields:
- stable `id`
- `parent_room` when the room is a child experience
- classification and lifecycle
- implementation adapter
- story
- subjects
- rights/provenance
- spatial definition
- assets
- interactions
- performance budgets
- brand authority
- release/evidence requirements

Athlete rooms are children of canonical `room-026` unless the world taxonomy explicitly changes.

Implementation adapters may differ:
- `installation`
- `native-room`
- future approved adapters

Different adapter does not mean different product architecture.

## Story before geometry

Write the room's narrative loop in one line before modeling.

Examples:
- NOR // 3: measure → adapt → repeat
- Beast Cave: experiment → miss → inspect → adapt → return

Then define 4–9 spatial zones that physically express that loop. Avoid filling space with props that do not advance story, interaction, orientation, or atmosphere.

## Asset production

Choose the cheapest truthful representation:
- existing GLB
- procedural Three.js geometry
- Blender-generated GLB
- 2D artwork
- environmental typography
- material/lighting treatment
- editorial/story surface

Not every collectible or story needs a bespoke GLB.

For generated assets:
- deterministic source preferred
- preserve source/provenance metadata
- optimize before promotion
- use LOD where useful
- do not embed unsourced likenesses, copied photos, or third-party marks
- do not assert athlete equipment without a source

Asset lifecycle:
`candidate → generated → visual-review → provenance-review → optimized → approved → canonical → archived`.

## Shared visual primitives

When a room needs a capability likely to recur, extract a composable primitive rather than copying room-specific code.

Good reusable primitives:
- surface/material generators
- contact shadows
- environmental typography/signage
- decals/floor markings
- light rigs
- fog/atmosphere helpers
- prop clusters
- semantic inspection bindings
- device-aware camera framing helpers

Do not create a generic “makeCoolRoom” abstraction. Keep composition room-specific.

## Semantic interaction

Interactions describe meaning, not mesh implementation.

Prefer concepts such as:
- story
- machine
- artifact
- source
- collectible
- portal
- challenge

The host decides how semantic interactions render.

## Performance

Respect the room manifest budgets for mobile, tablet, and desktop.

At minimum validate:
- triangle budget
- draw calls
- max texture edge
- DPR policy
- LOD policy
- particle/transmission/shadow policy

Mobile is a first-class target, not a reduced desktop screenshot.

## Visual quality gate

A technical PASS is insufficient.

Inspect evidence for:
- composition
- depth
- material richness
- lighting hierarchy
- environmental storytelling
- intentional empty space
- prop density
- typography integration
- interaction legibility
- mobile crop/framing
- brand consistency

If the room is technically valid but visually blockout-like, keep it in review.

## Evidence matrix

Capture the exact candidate build at:
- desktop
- phone portrait
- phone landscape

Capture at least:
- entry
- overview
- signature zone
- interaction state
- story/editorial state
- deepest room angle
- exit/return path when applicable

Record browser errors and render/performance metrics.

Generated concept images are references, never implementation evidence.

## Promotion

Lifecycle promotion must be evidence-based.

Do not move:
`concept → candidate → approved-unwired → release-candidate → public`
unless the manifest's required gates are satisfied.

Before public wiring:
- rights/truth review complete
- no unsupported partnership/endorsement claim
- implementation exists on the same branch
- canonical parent/world relationship is explicit
- mobile evidence is acceptable
- room validator passes
- standard Kona.m release gates pass

## Refactor policy

While building a room, extract reusable code only when:
1. at least two rooms need the capability, or
2. the capability is clearly host-level architecture.

Prefer small bounded refactors. Do not combine room art-direction changes with unrelated storage, navigation, progression, or app-shell rewrites.

Every visual complaint should become one of:
- a room-specific art fix
- a reusable primitive
- a validator/test rule
- a new instruction in this skill

## Deliverables

For a new or materially revised room produce:
1. room manifest
2. asset decision table
3. room implementation using an approved adapter
4. provenance/rights notes
5. evidence captures
6. validator/test updates when architecture changes
7. a short promotion decision: keep in review or promote

## Reference implementation strategy

NOR // 3 is the current reference for proving cinematic quality under the shared room contract.
Beast Cave is the second acceptance test: it must feel radically different while reusing the same host architecture.

If Beast Cave requires its own renderer, camera framework, UI shell, storage, progression, bike loader, or inspection engine, stop and refactor the shared system instead.
