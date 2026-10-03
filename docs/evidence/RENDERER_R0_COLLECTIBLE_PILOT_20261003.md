# Renderer R0 Collectible Pilot Evidence

Status: implementation review.  
Parent architecture PR: #56.  
Consumer: `web/src/ui/collectible-stage.js`.  
Kernel seam: `web/src/render/renderer.js`.

## Scope

This pilot moves only cross-surface renderer lifecycle policy out of Collectible Stage.

Moved to the shared kernel:
- `THREE.WebGLRenderer` construction;
- output color space;
- tone mapping;
- exposure;
- DPR cap;
- document-visibility animation suspension;
- renderer disposal.

Preserved in Collectible Stage:
- scene;
- PerspectiveCamera;
- OrbitControls;
- framing;
- lights;
- GLTF/Meshopt loading;
- collectible node selection;
- object animation intent;
- ResizeObserver/camera aspect;
- scene resource disposal;
- product/UI behavior.

## Source-level evidence

Before:
- Collectible Stage owned one `new THREE.WebGLRenderer(...)` constructor.

After:
- Collectible Stage owns zero renderer constructors.
- `web/src/render/renderer.js` owns the canonical constructor.
- repository source constructor count remains 14 during the first migration because one local constructor was replaced by one kernel constructor.
- remaining **duplicate public runtime constructor authorities**: 7.
- canonical kernel constructors: 1.

The authority inventory records Collectible Stage under `migrated_consumers`.

## Lifecycle improvement

Before, Collectible Stage kept its animation loop active whenever the document was visible to JavaScript, including hidden-document lifecycle unless the browser throttled it implicitly.

The shared renderer context now:
- removes the animation loop while `document.hidden`;
- restores the registered loop when the document becomes visible;
- removes its visibility listener during disposal;
- centralizes renderer disposal.

This is a lifecycle improvement, not a claim of measured battery/FPS improvement.

## Tests

Source contracts require:
- Collectible Stage imports `createRendererContext`;
- Collectible Stage contains no local WebGLRenderer constructor;
- the kernel owns the constructor;
- the kernel does not import/construct camera, controls or GLTF loader;
- the canonical renderer inventory matches source constructors;
- public non-kernel constructors retain a migration disposition.

## Existing browser evidence path

`web/ui-interaction-audit.mjs` already:
1. opens KONA Finds;
2. chooses a modeled Find;
3. opens the collectible 3D stage;
4. waits for `canvas.__collectibleStage`;
5. captures the item 3D screenshot;
6. returns from the viewer.

The pilot adds `canvas.__collectibleRendererAuthority='shared-r0'` for read-only acceptance/debug evidence.

## Evidence still required before merge

- deterministic generated `app/collectible-stage.js` is current;
- unit tests;
- architecture authority;
- P0 browser journey;
- UI interaction matrix at phone/desktop/landscape;
- screenshot parity of collectible stage;
- no console regressions;
- exact-head app seal/security/integration checks.

No FPS, memory, battery, thermal or visual-performance improvement is claimed until measured.

## Not in scope

- Race Self migration;
- Hall/World/Studio migration;
- renderer quality tiers;
- RoomEnvironment/PMREM cache;
- resource reference counting;
- KTX2;
- LOD;
- WebGPU;
- product flow or visual redesign.
