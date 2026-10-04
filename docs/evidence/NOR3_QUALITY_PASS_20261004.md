# NOR // 3 quality and performance pass — 2026-10-04

Status: **candidate / unwired**. This pass does not change public wiring, athlete claims, brand rights, or room ownership.

## Goal

Improve the canonical Norwegian Engine review in the dimensions that were visibly weakest:

- signature-view composition;
- physical legibility of the Fjord and Kona features;
- lived-in detail;
- renderer efficiency;
- deterministic error-free review evidence.

The source of truth remains:

`web/src/engine/room-installations.js → buildInstallation('norwegian', ...)`

The review harness remains:

`web/src/room-review-norwegian.js`

## Baseline evidence

Live review measured before this pass:

| Tier | Draw calls | Triangles | Browser errors |
|---|---:|---:|---:|
| Desktop 1440×900 | 666 | 39,600 | 1 CSP/WASM error |
| Mobile 390×844 | 352 | 24,488 | 1 CSP/WASM error |

Declared room budgets are:

- desktop: <= 180 draw calls, <= 450k triangles;
- mobile: <= 95 draw calls, <= 180k triangles.

The baseline therefore failed the draw-call gate despite modest triangle count.

## Root causes found

1. Most room primitives were one mesh per beam, rail, support, fallback-bike tube or fan blade.
2. Desktop transmissive glass forced an additional Three.js scene pre-pass.
3. Nearly every room mesh was configured as a realtime shadow caster.
4. The review attempted to load three canonical Speedmax specimens through the full museum decoder.
5. Fjord and Kona features were mounted behind the room's smoked-oak service wall, so dedicated cameras mostly saw an occluding wall.
6. The Fjord geometry read as small floor clutter rather than a signature environmental artifact.

## Changes

### Renderer / geometry

- merged repeated static box geometry by semantic material;
- instanced treadmill rollers, trainer flywheels, trainer axles and lane bottles;
- merged fallback-bike tubes/wheels into a small number of material batches;
- instanced fan blades;
- batched environment-bay framing;
- disabled transmissive glass pre-pass and retained alpha/roughness/PMREM response;
- removed broad realtime mesh shadow casting in favor of the room's explicit contact-shadow language.

### Signature composition

- moved Fjord relief and Kona signal onto the room-facing surface of the service wall;
- added a grazing Fjord practical;
- changed the Fjord from a dense bar field to fewer sculptural fins plus one merged family of sinuous contour lines;
- made the Kona line a visible emissive physical route that turns onto the floor;
- corrected fixed Fjord and Kona cameras.

### Human detail

The three rails now contain different generic traces of use, merged into three material batches:

- shoe / rubber forms;
- loose protocol paper;
- small metal/equipment objects;
- deliberately uneven towel placement;
- shared bottles.

The protocol zone gains one restrained `AGAIN.` note. These are original, rights-safe environmental details and do not make athlete-specific equipment claims.

## Canonical Speedmax decision

Allowing WebAssembly in the review and loading three canonical `speedmax_web.glb` clones produced approximately:

- 317 desktop draw calls;
- 1.53M rendered triangles.

That is incompatible with this room's declared performance budget.

Therefore the candidate review intentionally keeps the neutral lightweight bike study until a verified canonical LOD/proxy path exists. This is a performance truth boundary, not a replacement bike authority.

## Post-pass evidence

Local exact-source build after the quality pass:

| Tier | Draw calls | Triangles | Browser errors |
|---|---:|---:|---:|
| Desktop 1440×900 | 113 | 16,674 | 0 |
| Mobile 390×844 | 95 | 13,850 | 0 |

Result:

- desktop draw-call gate: **PASS**, with 67 calls headroom;
- mobile draw-call gate: **PASS**, exactly at the declared ceiling;
- desktop triangle gate: **PASS**;
- mobile triangle gate: **PASS**;
- browser/page error gate: **PASS**.

## Remaining visual gap

This pass improves composition, world coherence and renderer economics, but it does **not** claim final photorealism.

The next authored-asset decision remains evidence-driven:

1. direct-drive trainer;
2. run deck;
3. protocol analyser.

Those remain the highest-leverage candidates because they dominate close-up silhouettes and are still primitive studies. Generate them only if fixed-view before/after evidence improves the visual score without violating the restored performance budget.

## Promotion decision

Remain **candidate / unwired**.

Do not promote to approved-unwired until the full visual rubric is rescored on desktop, portrait phone and short landscape after authored-asset testing.
