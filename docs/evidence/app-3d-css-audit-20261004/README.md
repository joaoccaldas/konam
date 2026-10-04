# App-wide 3D + CSS audit · 2026-10-04

Runtime evidence and an honest scorecard for the world-wide audit (commits 17045db → 98ced7a on
`claude/sharp-ritchie-lycv70`). All numbers come from headless Chromium with **software WebGL (SwiftShader, no GPU)**,
so absolute frame times are 100–1000× a real device; only the *ratios* between before and after matter.

## Folders

| Folder | What |
|---|---|
| `before/` | every world area (31) at the commit before the audit, overview camera, 960×540, plus `areas.json` (calls, triangles, lights) |
| `after/` | the same cameras after the audit (where captured) |
| `css/` | before/after of About (desktop + phone), the entry page and the ride HUD |
| `lod/` | full Speedmax vs the derived display LOD, at 1.6 m and 8 m |

Reproduce: `node tools/room-evidence.mjs --review world --room hall --areas [--areas-only id,id] --size 960x540 --out <dir>`.

## Scorecard

### Faster — yes, where it was measured

| Measure | Before | After | Change |
|---|---:|---:|---|
| GLB bytes downloaded per world load | 27.0 MB | 15.5 MB | **−42 %** (meshopt-packed 25 legacy GLBs: 8.5 → 3.0 MB) |
| Shared GLB parsing | CFR parsed 7× | parsed once, cloned | `loadShared()` |
| Geometries in memory (hall) | 1,041 | 903 | −13 % |
| Wing · Kona Light view: triangles | 6.47 M | 2.73 M | **−58 %** (display-bike LOD) |
| Wing · Kona Light view: render time | 16.2 s | 8.0 s | **−50 %** |
| Hall view: draw calls | 1,482 | 1,342 | −9 % (palm crowns merged, 11 → 1 per palm) |
| Shadow-map renders | every frame | on demand / ≤ 4 Hz | see *Shadows* below |

### Better quality — yes, with one correction

- Carbon parts have a clearcoat (desktop/balanced). Tyres, saddles and bar tape are matte instead of plastic-shiny.
- **Correction made during the audit:** the first version also added sheen. A same-page A/B showed +12–25 % frame
  time (hall 12.5 → 15.7 s) for a barely visible effect, so sheen was removed and the clearcoat is skipped in lite mode.
- Brand-room sign: fitted to its text, kicker visible, ink picked from the wall. Breitling shows its name in neutral type
  because there is no approval to use brand marks (`marks_allowed:false`).
- Display LOD: invisible at display distance; up close (< 6 m) the full model is always used. Faceting of the LOD
  is visible at 1.6 m, which is why it never serves inspection, explode or hero views.

### CSS — conflicts fixed, duplicates removed

| Problem | Effect before | Fix |
|---|---|---|
| `.btn.primary` / `.btn.ghost` beat `.ride-hud__push/quit` | push button near-black, quit unreadable paper-on-paper | `.btn.ride-hud__*` selectors, brand sunrise |
| entry trust links with no colour | browser blue on the dark entry | inherit + underline |
| literal `\n` in system.css | the `[hidden]` bottom-nav rule was dead | removed |
| hall-web.css re-declared colours and fonts as raw values | two sources of truth for ink/paper/fonts | aliases of `brand/tokens.css` |
| system.css duplicated `.t-title` / `.t-body` | overrode the brand scale: About/Promo section titles 28 px on phone, *smaller* than the cards below them | removed; brand/typography.css rules (43 px phone, 64 px desktop) |

No new `!important`. Brand, authority and repository hygiene pass.

### Structure (reuse over create)

- `engine/env-capture.js` — one local reflection capture, used by NOR // 3 and Breitling (was duplicated).
- `engine/bike-materials.js` — one bike finish for every bike.
- `assets/museum/speedmax_web-lod1.glb` — derived from the canonical CFR, provenance in `.meta.json`.
- `tools/pack-glb.mjs --unpack` — Blender can't read meshopt; `blender/atlas_preview.py` uses it.
- All registered in `docs/architecture/AUTHORITY_MAP.md` and the bike-forge / room-dressing skills.

### Not improved yet — needs a decision

| Item | Why it matters | Risk |
|---|---|---|
| Hall still draws ~5.6 M triangles / ~1,300 calls at its overview | the inspectable collection bikes are full-resolution (510k each) | LOD on inspectable bikes changes what you see when you walk up; needs a near-distance rule tied to inspection |
| Region culling (Champions, WYLD, brand rooms always drawn) | draw calls everywhere | pop-in at doorways if done badly |
| ~28 always-on point lights | per-pixel cost on phones | a light pool changes the lighting mood per room |
| hall-mobile.css ~108 `!important`, two button grammars, 760 vs 899/900 breakpoints | maintainability | visual regressions across many screens |
| Onboarding hierarchy (`#konaQuest h2` vs eyebrow) | inverted emphasis | product copy/design call |
| Service-worker version | GLB bytes changed under the same URLs | stamped by the release build (`tools/build_app.mjs`); old cached GLBs still load |

Concept art is not runtime evidence; everything here is a runtime frame or a measured number.
