# 3D quality: KONA.m world vs Beast Cave (2026-10-04)

Compared surfaces:
- World: `web/src/landing.js`
- Bike studio (Speedmax museum pages): `web/src/main.js`
- Beast Cave room: `web/src/beast-cave.js`

## What the world and bike studio do better

| Area | World / studio | Why it matters |
|---|---|---|
| Bike engineering data | Real component tree (~45 `part` ids, `explode` vectors) via `engine/machine-inspection.js`, exploded view, animated InstancedMesh chain (`main.js:248-292`) | Truthful components. The cave reuses this bike rather than faking one |
| Post-processing | Studio "high" runs GTAO + 4×MSAA HalfFloat + OutputPass (`main.js:129-142`) | Ambient occlusion grounds components (crank in frame, bars in stem) |
| Paint | MeshPhysical clearcoat 1, micro-noise roughness "orange peel" (`tex.js:100-117`) | Close-up paint reads as lacquer, not plastic |
| Adaptive quality | Profiles + pixel ratio drop while moving (`profile.js`, `landing.js:1871`); studio fps step-down (`main.js:808`) | Stays smooth on phones |
| Scale and streaming | Region culling, progressive room queue (`landing.js:1939-2003`) | A big world on a phone at all |
| Aero storytelling | Streamline "tunnel" + CdA/yaw maths labelled *illustrative, not CFD* (`main.js:341-379`, `aero.mjs`) | Honest aero explanation |

## What the Beast Cave does better

| Area | Beast Cave | Why it matters |
|---|---|---|
| Lighting realism | RectAreaLight from the screen, bare bulbs, washes, motes and light shafts; low env intensity for a true dark mood | Light comes from *objects in the scene*, so the room has depth and contrast. The world mostly lights with a hemisphere light, a sun and point lights |
| Textured assets | Generated GLBs with **normal maps**, meshopt + quantization + WebP, 0.5–0.9 MB each, with provenance and hashes | Surface detail without polygons. The world's bikes and surfaces have no normal maps |
| Instancing | Foam cells, joists and slats are all InstancedMesh | Hundreds of objects for a handful of draw calls |
| Interaction tied to 3D | Fans, flywheel, lights and sound respond to simulated watts | The 3D *does* something, not just sits there |
| Art direction per room | Per-room exposure, fog colour and hemi/sun dimming (mood system) | Each room has its own atmosphere |

## Gaps that limit realism everywhere (ranked)

1. **Only one IBL.** `RoomEnvironment` is used everywhere; there's no HDRI and no local probe, so bikes in the sunlit hall and in dark rooms reflect the same grey box.
2. **No carbon weave.** Frames are flat colour plus clearcoat, with no normal, anisotropy or roughness maps (`main.js:146-151`).
3. **No AO or anti-aliasing in the world.** There's no composer, and lite devices also run without MSAA (`landing.js:120,1879`).
4. **Blurry sun shadows.** One 2048 shadow map covers ±36 m, about 3.5 cm per texel (`landing.js:793`).
5. **Flat tyres and bar tape.** No bump, normal or sheen.
6. **Fake contact shadows.** Canvas gradient decals, no baked AO.
7. **Unvalidated iridescence.** Iridescence 1 on every paint preset, not checked against photos (`main.js:146`).
8. **No real-time aero.** Streamlines bend around 11 hard-coded spheres, not around the bike geometry.

## Efficiency risks

1. No render-on-demand: the full shadow frustum re-renders every frame.
2. Toggling visibility on point and spot lights changes the light count, which forces shader recompiles at room boundaries.
3. The studio GLB is inlined as base64 (~2.7 MB, can't be cached). Atlas GLBs are uncompressed.
4. Rooms are never disposed, despite `WORLD_STREAMING_V1.md`.
5. `config/performance-budgets.json` (frame-time controller) is written but nothing implements it.

## Plan: the same bar for every 3D project

Order: biggest visual gain for the least risk. Every step stays inside the existing renderer authority (`landing.js`, `main.js`) and needs no new renderer.

1. **Shared material kit** (`engine/materials.js`, new module):
   - Carbon: a procedural 2×2 twill normal map at 512, `anisotropy` .6, clearcoat 1.
   - Tyre: a sidewall bump map plus sheen .3.
   - Bar tape: sheen plus a wrap normal map.
   - Alloy: anisotropic brushing.
   - Paint presets: iridescence off unless a reference photo supports it.
   Apply the kit by `part` id through machine-inspection, so studio, world and rooms share one truth.
2. **Lighting per context:**
   - A small CC0 HDRI (1k, ~1 MB) for the outdoor hall.
   - Rooms keep RoomEnvironment at low intensity, plus a one-time CubeCamera capture per room baked into PMREM (no per-frame cost).
3. **World post at High quality only:** GTAO (8 samples) + SMAA + OutputPass, frame-time gated through `performance-budgets.json`. Finally implement that controller.
4. **Sharper bike shadows:**
   - A second, tight shadow-casting light (±2 m frustum, 1024) on the focused bike.
   - The sun shadow updates only when the camera moves.
5. **Geometry:** decimated LOD0/1/2 for hero bikes, meshopt for atlas GLBs, and a texture cap at 1024. No more base64 inlining.
6. **Aero:**
   - Streamlines driven by a signed-distance field baked from the bike mesh, replacing the hand-placed spheres.
   - Yaw slider tied to `aero.mjs`.
   - Still labelled illustrative unless CFD data with a source exists.
7. **Evidence gate:** before and after headless renders at fixed cameras, plus draw-call, triangle and frame-time numbers for every 3D PR.

Steps 1, 2 and 4 are worth doing first: they change how every bike looks, everywhere, for little GPU cost.
