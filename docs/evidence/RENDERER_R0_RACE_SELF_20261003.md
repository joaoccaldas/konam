# Renderer R0 Race Self Migration

Status: implementation review.  
Parent state: Collectible Stage kernel migration merged in #57.  
Consumer: `web/src/ui/race-self-stage.js`.  
Kernel: `web/src/render/renderer.js`.

## Scope

Move only renderer construction and shared GPU lifecycle policy to the existing renderer kernel.

Moved:
- WebGLRenderer construction;
- output color space;
- ACES tone mapping / exposure;
- DPR cap;
- document-hidden animation suspension;
- renderer disposal and explicit context loss.

Preserved in Race Self:
- scene;
- PerspectiveCamera;
- OrbitControls;
- avatar generation;
- bike/shoe GLTF + Meshopt loading;
- camera fitting;
- local lighting;
- avatar animation behavior;
- settings-panel pause;
- ResizeObserver;
- scene-resource disposal.

## Source-level result

Before this migration:
- 14 renderer constructors repo-wide;
- 12 browser/viewer constructors;
- 11 under `web/src`;
- 7 duplicate public-runtime renderer authorities;
- 1 canonical kernel renderer.

After this migration:
- **13** renderer constructors repo-wide;
- **11** browser/viewer constructors;
- **10** under `web/src`;
- **6** duplicate public-runtime renderer authorities;
- **1** canonical kernel renderer.

Race Self is now recorded as a migrated consumer of `web/src/render/renderer.js`.

## Behavioral boundary

The kernel does not own:
- Race Self camera;
- OrbitControls;
- avatar state;
- equipment;
- framing;
- lighting;
- UI;
- progression.

The existing explicit `settings-open` pause remains local because it is product-surface state, not renderer lifecycle.

## Required validation

Before merge:
- deterministic `app/race-self-stage.js` regenerated and committed;
- PWA manifest/service-worker seal regenerated if hashes change;
- unit + renderer authority tests;
- architecture hygiene;
- P0 journey;
- Studio/Race Self layout matrix;
- avatar persistence;
- Escape/focus behavior;
- UI interaction evidence;
- Visual Evidence V2;
- release security/integration/app seal.

No performance improvement is claimed until measured.
