# Renderer Authority R0

Status: architecture freeze for Wave 2.  
Branch intent: inventory and enforce renderer ownership before any renderer migration.  
Current production base when opened: `main@897a9654`.

## Decision

Kona.m will converge GPU/lifecycle policy into one shared renderer kernel under:

`web/src/render/`

This document does **not** create that kernel and does not change rendering behavior.

The immediate goal is to stop renderer authority from growing while the existing surfaces are migrated one at a time.

The machine-readable source of truth is:

`config/renderer-authority-v1.json`

`tools/authority-hygiene.mjs` requires the inventory to match every source-level `new THREE.WebGLRenderer(...)` constructor under the audited source roots.

## What the audit found

Source-level constructors:

- **14** total across audited repository source;
- **12** browser/viewer constructors;
- **11** browser/viewer constructors inside `web/src` already covered by architecture hygiene;
- **1** additional legacy browser viewer at `web/heritage/viewer.js`;
- **2** offline rendering tools.

Of the eight entries classified as current public runtime renderers:

- four visibly include a hidden-document/visibility pause guard in their own source;
- two visibly include explicit renderer/resource disposal in their own source;
- five instantiate `RoomEnvironment` locally;
- five instantiate `OrbitControls` locally.

These counts describe source ownership, not measured runtime performance.

## Renderer classes

### Public production runtime

| Surface | Class | Current disposition | Migration order |
| --- | --- | --- | ---: |
| `ui/collectible-stage.js` | embedded collectible | **kernel pilot** | 1 |
| `ui/race-self-stage.js` | embedded Race Self | kernel required | 2 |
| `exp/engine.js` | shared experience stage | kernel required | 2 |
| `heritage.js` | heritage viewer | kernel required | 3 |
| `hall.js` | standalone hall | kernel required | 4 |
| `main.js` | machine/exhibit viewer | kernel required | 5 |
| `landing.js` | walkable world host | kernel required | 6 |
| `studio/main.js` | Studio | kernel required | 7 |

The exact metadata and rationale live in `config/renderer-authority-v1.json`.

### Non-public / special-purpose

- `ui/admin-asset-preview.js`: admin utility, kernel candidate after public paths.
- `product-intake-proof.js`: test harness; must not drive production renderer design.
- `room-review-norwegian.js`: review/evidence harness; may remain isolated.
- `web/heritage/viewer.js`: legacy viewer still bundled by `tools/heritage/build_site.mjs`; reconcile or retire later.
- `tools/render_entry_art.mjs`, `tools/render_paintings.mjs`: offline build tools; not browser runtime authorities.

## What the kernel owns

Wave 2 renderer modules may own shared **GPU and lifecycle policy**:

- renderer creation and capability detection;
- output color space and tone-mapping defaults;
- DPR/quality policy;
- shadow-map policy;
- context loss/recovery hooks;
- page-visibility pause hooks;
- render-on-demand helpers;
- PMREM/environment acquisition and caching;
- shared resource disposal/reference-counting primitives;
- renderer telemetry:
  - frame time;
  - draw calls;
  - triangles;
  - textures/geometries;
  - estimated texture memory where measurable.

## What the kernel does not own

The kernel must **not** become a universal scene/application god-object.

Surface-specific code continues to own, where appropriate:

- world navigation and route planning;
- camera choreography and framing intent;
- OrbitControls or custom controls configuration;
- scene composition;
- room geometry;
- product/asset identity;
- machine-inspection state;
- cards, dialogs and product UI;
- gameplay/progression;
- brand-specific content.

Shared camera/framing helpers may exist, but there is no requirement for one universal camera behavior.

## Candidate API boundary

The exact implementation may evolve during the first pilot, but consumers should conceptually receive a context rather than instantiate Three.js renderer infrastructure directly.

Illustrative contract:

```js
const context = createRendererContext({
  canvas,
  surface: 'collectible',
  qualityHint: 'auto',
  alpha: true,
  powerPreference: 'low-power'
});

context.renderer
context.quality
context.resources
context.telemetry
context.visibility

context.dispose()
```

Additional modules can provide environment/lighting helpers without forcing every surface to use the same scene.

The contract should make the correct lifecycle easier than local renderer construction.

## First pilot: Collectible Stage

Chosen because it is:

- small;
- lazy-loaded;
- isolated from the core world;
- Meshopt-enabled;
- already explicitly disposable;
- visually easy to compare before/after;
- representative of an embedded product/object viewer.

The pilot must **not** change product flow or visual design.

### Pilot success criteria

Before deleting the local renderer constructor:

1. same collectible/model and camera framing before/after;
2. visual captures at:
   - 390×844;
   - 844×390;
   - 1440×900;
3. no new console errors;
4. no extra WebGL context;
5. same or lower first-render time within normal measurement variance;
6. hidden/inactive stage performs no continuous render work;
7. disposal removes animation loop, controls, renderer/context resources and owned GPU resources;
8. reduced-motion behavior preserved;
9. source-level constructor moves from the feature to the kernel;
10. full deterministic build and release gates remain green.

Only after the pilot passes should Race Self or the shared experience stage migrate.

## Migration rule

One bounded renderer consumer per PR where practical:

```
inventory
  ↓
kernel primitive
  ↓
one consumer
  ↓
visual parity
  ↓
lifecycle/performance evidence
  ↓
delete local authority
  ↓
lower remaining-authority count
```

Do not migrate World + Studio + Hall together.

## Quality is Wave 3, not an excuse to delay R0

R0 should provide the seam for quality policy.

Wave 3 then makes quality adaptive using:

- device memory when available;
- hardware concurrency;
- viewport;
- DPR;
- WebGL limits;
- reduced data/motion;
- measured moving frame time.

Do not mix WebGPU, KTX2, LOD, room streaming or asset-schema migration into the first renderer-kernel PR.

## WebGPU boundary

WebGPU remains a later research/pilot track.

The immediate problem is duplicated lifecycle and quality authority, not the graphics API itself.

A future WebGPU experiment should plug into the same renderer-policy boundary rather than create another parallel application stack.

## CI / architecture rule

A new source-level `new THREE.WebGLRenderer(...)` outside the inventory is an architecture failure.

Changing the inventory requires explaining:

- why an existing renderer/context cannot be reused;
- whether the new surface is production, review, test or offline;
- its migration/retirement disposition;
- its lifecycle policy;
- why the total public renderer authority count should not instead decrease.

The preferred direction is one-way: **fewer production renderer authorities over time**.
