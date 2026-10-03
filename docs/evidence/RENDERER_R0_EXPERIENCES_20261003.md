# Renderer R0 Experiences Migration

Status: implementation review.  
Parent state: Collectible Stage (#57) and Race Self (#59) use the shared renderer kernel.  
Consumer: `web/src/exp/engine.js`.  
Primary page: `Experiences.html`.

## Why this consumer

`exp/engine.js` is already a shared runtime stage for:
- night experiences;
- History Lane.

Migrating this one renderer authority therefore benefits multiple experiences without touching the high-risk World, Hall or Studio runtimes.

## Scope

Moved to `web/src/render/renderer.js`:
- WebGLRenderer construction;
- output color space;
- AgX tone mapping;
- DPR cap;
- document-hidden animation suspension;
- renderer disposal/context loss.

Preserved in `exp/engine.js`:
- scene;
- PerspectiveCamera;
- orbit camera implementation;
- rail camera implementation;
- scene builders;
- machine inspection;
- Speedmax loading;
- interactions;
- audio;
- story UI.

Lifecycle additions:
- resize listener removal;
- PMREM disposal;
- environment render-target disposal/replacement;
- pagehide disposal from `exp/main.js`.

## Architecture count

Before:
- 13 renderer constructors repo-wide;
- 11 browser/viewer constructors;
- 10 under `web/src`;
- 6 duplicate public-runtime renderer authorities;
- 1 canonical kernel constructor.

After source migration:
- **12** repo-wide;
- **10** browser/viewer;
- **9** under `web/src`;
- **5** duplicate public-runtime authorities;
- **1** canonical kernel constructor.

## Validation required before merge

- deterministic `Experiences.html`/generated outputs current;
- PWA seal hashes current when generated files change;
- unit + renderer-authority tests;
- architecture/repository/brand hygiene;
- Experiences browser smoke;
- Visual Evidence V2 where the page is included;
- UI interaction evidence where applicable;
- release security;
- integration contract;
- app release seal.

No FPS, battery, memory, thermal or download improvement is claimed until measured.

## Not in scope

- Heritage migration;
- Hall;
- World;
- Studio;
- renderer quality tiers;
- KTX2;
- LOD;
- WebGPU;
- Door Convergence;
- Plan;
- Brand Room V2;
- About/Collection work.
