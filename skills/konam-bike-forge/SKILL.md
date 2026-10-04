---
name: konam-bike-forge
description: Generate hyper-detailed, efficient, inspectable bike GLBs (concept studies or reference-calibrated replicas) with the canonical Blender generator, pack them, register provenance and mount them in any room. Use whenever a room, page or pitch needs a bike that is not already in assets/.
---

# Kona.m Bike Forge

One pipeline for every bike: a parametric skeleton in `museum/atlas/bikes.json` → `blender/atlas_build.py` → `tools/pack-glb.mjs` → `build-meta.json` → a room mounts it with `web/src/engine/decor.js`. Do not write a second bike generator, a room-local bike schema, or a hand-sculpted one-off. AUTHORITY_MAP: bike truth = `museum/bike.schema.json` (extend, never fork); inspection = `web/src/engine/machine-inspection.js`.

## Why this path (and when it is not enough)

- A photo-traced reconstruction (e.g. `assets/museum/speedmax_web.glb`, 510k triangles) spends triangles smoothing large surfaces. Decimating it for a room (→ 109k) blurs exactly the parts people look at.
- The generator builds each tube from an analytic section (round / aero / kamm) swept along its skeleton and spends triangles on detail: chainring teeth, 11 cogs, chain links, rotors, calipers, derailleurs, split-nose saddle, bottle and cage. Measured: **39k triangles hero, 8.5k lite, 305 KB / 85 KB packed, 24 semantic parts**, versus 109k for the decimated Canyon.
- **Detail is not accuracy.** A generator bike is only as accurate as its skeleton. For a real product use `representation: reference-calibrated`: put the published geometry chart (stack, reach, angles, chainstay, wheel size, crank) in `geometry`, measure tube chords/widths from reference photos scaled by the wheel (700c tyre ≈ 668 mm) into `tubes`, cite every source in `facts`/`ref`, and compare the silhouette against the reference (`tools/compare_silhouette.py`). Otherwise label it `concept` or `geometry-study` and never present it as the product.
- A real brand's bike (shape or marks) beside an athlete needs that brand's approval. Until then: unbranded study + the athlete's equipment as sourced text.

## Steps

1. **Search first.** `node tools/decor.mjs find <word>` (atlas bikes, decor, room assets) and `museum/atlas/bikes.json`. Reuse or ADAPT a skeleton before creating one.
2. **Write the skeleton** in `museum/atlas/bikes.json` (copy the closest entry; keep keys stable). Add `"detail": "hero"` for anything seen close-up, `"representation"`, `"museum": false, "studio": false` unless it belongs in the atlas wing, and an honest `facts` line.
3. **Build** (bpy as a module works headless; no Blender install needed):
   `pip install --target <scratch>/bpyenv bpy` once, then `PYTHONPATH=<scratch>/bpyenv python3 blender/atlas_build.py <key>`
   → `assets/atlas/<key>/bike.glb` (+ `bike-lite.glb` for hero), `build-meta.json`, merged `assets/atlas/build-report.json`. Every object carries `part` + `explode` extras for machine inspection.
4. **Pack:** `node tools/pack-glb.mjs assets/atlas/<key>/bike.glb assets/atlas/<key>/bike-lite.glb` (meshopt; names and extras survive; byte counts refreshed).
5. **Validate:** `node tools/validate-bikes.mjs`; check `semantic_parts` include at least `frame, rim, tyre, saddle` (ASSET_INTAKE). Render it in its room with `node tools/room-evidence.mjs --review <room> --shots <close-up>` and look at it.
6. **Mount** through the room's decor file (see `konam-room-dressing`): `{"id": "...", "kind": "bike", "ref": "<key>", "at": [[x, y, z, yaw]]}`. `engine/decor.js` aligns by the hubs (forward +z, ground y = 0), merges parts per material and instances every placement: one draw per material for all copies; phones get `bike-lite.glb` automatically.
7. **Look:** the room's `materialFor` hook owns materials. Liveries without UVs: paint them in the shader along the bike (`vBikePos`), select per placement with `instanceColor` (see `livery()` in `web/src/nor3-winter.js`). No brand marks unless sourced and approved.
8. **Register** the asset in the room's asset manifest (`world/konam/candidates/<room>-asset-manifest-v1.json`): decision, generator, sha256, tris, rights, representation, lifecycle.

## Extending the generator

Add capability inside `blender/atlas_build.py`, behind spec keys, so existing bikes rebuild unchanged: new sections in `section()`, new architectures in `build()`, hero-only parts in `hero_parts()`, part naming in `PARTS`/`EXPLODE`. Rebuild only the keys you touch (the report merges). Commit the script, spec, GLBs, build-meta and report together.

## Done means

- packed GLB(s) + build-meta + report entry committed; validate-bikes passes
- close-up render inspected (drive side, wheels on the ground, nothing floating or intersecting)
- room budget receipt within limits on phone and desktop
- representation and rights stated where the bike appears
