# Trek triathlon museum: handover (2026-09-27)

Repo: `~/Developer/trek-tri-museum-3d`. **No git repo yet** (never `git init`-ed). Reference implementation
(read-only, another session is working in it): `~/Developer/speedmax-cfr-3d`. The brief this work follows is
`speedmax-cfr-3d/docs/BRAND_MUSEUM_AGENT_PROMPT.md` (brand = Trek, category = triathlon/TT).

## What the owner asked for, in order

1. Build a Trek museum like the Canyon one, using Blender.
2. Serve a page with the current bikes so they can test it (done: see "Local site").
3. **Current priority:** model the **newest** Trek tri bike (Speed Concept SLR, 3rd gen) and **the Trek raced at
   Kona 2025** (Taylor Knibb's Speed Concept SLR), and "make it amazing in Blender". The first pass was called
   "very basic".
4. **No wind tunnel / aero lab in this work.** That belongs in its own PR.

## Local site

- Serve: `python3 -m http.server 8742 --bind 127.0.0.1 --directory site` (from the repo root), then open `http://127.0.0.1:8742/`.
- Rebuild: `node tools/heritage/build_site.mjs` (reads `museum/heritage/catalog.json`, bundles `web/heritage/viewer.js`).
- The viewer has orbit, click-to-inspect parts (spec and data basis), explode, side view and the source photo.
  It has no aero or wind-tunnel features.
- Only the draft Equinox 9 (2004) viewer exists. Speed Concept exhibits are not on the site yet.

## Research status (primary sources saved and hashed)

- `assets/reference/heritage/catalogs/`: all 60 PDFs from Trek's official catalog archive (1976–2005), URLs in `urls.txt`.
- `assets/reference/heritage/web/` and `pages/`: Wayback captures of trekbikes.com images and pages (2003–2015).
- `assets/reference/heritage/sources.json`: 106 files with URL, capture and SHA-256. Rebuild with `tools/heritage/register_sources.py`.
  It refuses to proceed if an existing file's hash changed.
- `assets/reference/speed-concept-slr/`: Trek CDN studio PNGs (native size, `f_png`): SLR 9 AXS side 3000 px (transparent),
  frameset side 4000 px (transparent), top (Alt2) and front (Alt3) 4000 px, geometry diagram. The CDN serves an upscaled image
  if you ask for `w_4000`, so always download native size.
- `assets/reference/kona-2025-knibb/`: 12 Triathlete.com photos (Brad Kaminski, editorial, copyrighted: **reference only, do not
  publish or embed**) and one Trek Race Shop photo. **Not yet added to `sources.json`.** Hash them before use.

### Lineage (details and sources in `museum/heritage/catalog.json`)

| Generation | Model years | Material | Buildable? |
|---|---|---|---|
| Tri Series 500/700 | 1986 | Reynolds 531 steel, road geometry | **Owner decision pending**: does it count as a tri generation? |
| Race/Triathlon category | 1987–1999 | Road frames only | Gap, not a generation |
| Hilo 1000/2000 | 2000–2002 | Alpha SLR alu, 650c | Yes, lower confidence (≈1,100 px scan, front tyre clipped) |
| USPS Team Time Trial / Equinox 11 | 2001–2006 | OCLV HC carbon | Yes (identical geometry in the 2004/05 spec manuals) |
| Equinox 9/7 Alpha SL | 2004 | Aluminium | Draft model built |
| Equinox 9/7 ZR9000 | 2005 (2006 unconfirmed) | Aluminium | Yes |
| TTX / Equinox TTX | 2006–2010 | OCLV carbon | Yes (geometry still to fetch from 2007/08 archived pages) |
| Equinox 9 aero alu | 2007? | Aluminium | Needs geometry and start year |
| Speed Concept gen 1 | 2010– | OCLV carbon | 2,000 px archived images exist |
| Speed Concept SLR gen 3 | 2022– (current, MY2027 images) | 800 Series OCLV | **In progress (priority)** |

## Speed Concept SLR 9 AXS (newest): state

- Spec record: `museum/current/specs-speed-concept-slr-gen3.json`. Geometry S–XL (converted cm to mm) and the full SLR 9 AXS
  component list, transcribed from the rendered trekbikes.com product page on 2026-09-27. Trek's site is client-rendered and
  bot-blocked for curl. The data was read in the browser: the geometry table is in the DOM, the specs are `dt`/`dd` pairs.
- Manifest: `museum/bikes/trek-speed-concept-slr-9-axs-my2027.json` (adapter id `trek-speed-concept-slr-gen3-pillow-v1`;
  **the adapter module `adapters/speed_concept_slr_gen3.py` is not written yet**).
- Calibration (`blender/heritage_data/trek-speed-concept-slr-9-axs-my2027/calibration.json`): tyre circle fits have
  RMS ≈1 px and aspect 1.00. Photo wheelbase is 978 mm, which sits between S (967) and M (995), so neither is within 1%.
  **Size M** was chosen from the crank: 171.6 mm at tyre scale vs 170 mm published for M (S = 160).
  The 160 mm front rotor measures ~155 mm. It sits on the far side of the wheel, so perspective is the likely cause. These
  Trek images may be CGI with perspective. `calibration.json` currently still says `size_match: S, within_1pct: false`,
  so `build_heritage.py` will refuse to build until the size decision is recorded properly (add an explicit, documented
  `size_override` with this evidence rather than editing the fit).
- Frame method ("pillow", like the Canyon photo frame): `tools/heritage/pillow_fields.py` fits the frameset photo to the
  published size-M skeleton using 3 hand-marked landmarks. Scale is 0.3849 mm/px; residuals are ≤4 mm at the axles and
  6.9 mm at the BB. It splits the silhouette into main, stays and fork regions and writes height fields to `pillows.npz`,
  with an overlay in `pillows-overlay.png` (checked: regions are correct).
  Spec is in `blender/heritage/adapters/speed_concept_slr_gen3_pillow.json`. **Half-widths are inferred** (from Trek front/top views).
- `blender/heritage/pillow_surface.py` builds each region as a watertight triangle shell. `blender/heritage/pillow_mesh.py`
  joins the regions, remeshes, and projects UVs into the photo. The de-lit albedo is `frameset_albedo.png`
  (from `tools/heritage/delight_texture.py`).
- **Main frame is in the mesh.** The previous shell left 2,202 stairstep slits on the main frame (an edge from the
  pinched rim to an interior vertex, as tall as the local half-width). The voxel remesh dropped that open shell and
  kept the stays. Wall triangles now close those slits. `tools/heritage/test_pillow_surface.py` requires every region
  to have zero boundary edges (main has 8 non-manifold edges; the fork crown has 32). Both are closed volumes.
- Shape gate, 2026-09-27, Blender 5.2.2: frame 158,758 polys, X from −428 mm to +452 mm (head tube is in the mesh);
  fork 49,177 polys, outer Y ±66 mm, which is `y_dropout` 57 mm plus the 9 mm blade half-width.
  Side silhouette against the frameset photo (`tools/heritage/compare_frame_silhouette.py`,
  `blender/heritage_data/trek-speed-concept-slr-9-axs-my2027/qa/silhouette_report.json`): IoU 0.964, boundary
  median 1.54 mm, p95 3.08 mm. Missed photo area 87.7 mm²; extra mesh area 6,389 mm² from the 1.2 mm remesh bloom.
  The 22.4 mm maximum is one photo-edge pixel at (2972, 1172), the fork/head-tube split, not a missing triangle.
  Renders: `qa/side.png`, `qa/front.png`. Clay only — decals are not on this render.
- NumPy on this Mac still emits a spurious Accelerate "divide by zero" warning on a finite `matmul`. The silhouette
  script checks the projection is finite and suppresses that warning around the call.
- Half-widths remain inferred. Fork blade spacing has not been checked against the front photo beyond the spec
  values above. Junctions between the frame, stays and fork are separate shells, so a crease remains where the
  masks meet.

### Next steps for "amazing"

1. Done: main frame meshes, and the side silhouette is scored against the frameset photo.
2. Done: `blender/heritage/modern_parts.py` is the Canyon component file retargeted onto this skeleton.
   Header names the source. Crank 170 mm on M (160 on S), rings 48/35, photo crank angle −11.63°
   (spindle 1315, 1752.5 to pedal-eye hole 1615.5, 1814.3; photo length 171.7 mm at tyre scale).
   Front derailleur body is BB-relative (`bb_off` subtracts the Canyon BB height 264.5). Cassette 10–33,
   both rotors 160 mm, flat-mount calipers, 100×12 / 142×12 axles, UDH rear derailleur.
   Gate: `blender -b --factory-startup --python-exit-code 1 -P tools/heritage/test_modern_parts.py`
   (passed 2026-09-27). Caliper clock angles are still the Canyon photo's: the Trek drive-side photo hides the
   rear caliper and only shows the front one behind the fork leg.
3. Done in the same module: Aeolus RSL 51 (measured radial span 51.0 mm; external width inferred), R4 320
   700×25 (radius 336 mm) with a black tread and a tan flank as two materials.
4. Cockpit from the side photo plus Alt2/Alt3: integrated mid-rise bar/stem, towers, armrest pads, J-bend extensions,
   SRAM RED Aero levers, Blips. Also the aero seatpost, Bontrager Hilo Pro Carbon saddle and downtube storage box.
   Photo landmarks (complete photo px): saddle tail x≈810, nose ≈1240, top y≈460; post head (1010, 540); base bar y≈740
   from x 2150 to 2550; levers (2480–2520, 780–870); pads (2030–2200, 580–640); extension tips (2720, 400);
   storage box x 1300–1680, y 1200–1560; axles (623.9, 1609.7) and (2372.0, 1607.0); spindle (1315, 1752.5).
5. Materials: matte "Deep Smoke" over carbon (photo albedo plus roughness/coat), then Cycles studio renders
   (`blender/heritage/render_views.py`; it currently over-exposes, so lower the light energies).
6. **Kona 2025 Knibb bike** (Triathlete, 9 Oct 2025, specs from Trek's Mark Andrews; Trek Race Shop story):
   - Frame: size M Speed Concept SLR, Project One "Gamut" (same paint as Holly Lawrence).
   - Wheels and tyres: Aeolus 62 front, Aeolus 75 rear, Continental GP5000 S TR 28 mm.
   - Drivetrain: SRAM Red AXS 12-speed, 54/41, 170 mm, 10–28; Dura-Ace pedals.
   - Cockpit: Drag2Zero .66 extensions on Trek's low base bar, D2Z risers, stacked BTA bottles on a D2Z Gen2 mount.
   - Storage: top-tube storage, downtube bottle and flat kit.
   - Seat: GebioMized STRIDE saddle; EZ Gains rear double BTS with XLab cages.
   - Race: women's IM World Championship, Kona, 11 Oct 2025.
   Reuse the SC SLR frame (same generation; document the reuse in its adapter). Paint by projecting colours sampled from
   the side "Featured" photo. Local study only, never published.

## Equinox 9 MY2004 (pilot, draft)

- Adapter `blender/heritage/adapters/equinox_alphasl_2004.py` (published size-58 skeleton, photo-traced tube depths).
  Build: `blender -b --factory-startup --python-exit-code 1 -P blender/heritage/build_heritage.py -- museum/bikes/trek-equinox-9-my2004.json`.
- Calibration is solid: bolt circle 129.8 vs 130 mm, crank 176.4 vs 175, tyre fit RMS 0.45 px.
- **Recorded conflict:** Trek's photo sample has a ≈375 mm chainstay and ≈294 mm BB height, vs 410/266 published.
  The model follows the published table (owner decision pending).
- Known visual issues: flat saddle loft, rough cranks, stem too far forward, over-bright renders.
  Not yet run through the geometry/silhouette validation.

## Housekeeping and open decisions

- Copied Canyon files (`web/src/*` incl. aero lab/wind tunnel, `blender/build.py`, `frame.py`, `cockpit.py`, …) are still in
  the repo. Trashing them was blocked by a permission check. The Trek build does not use them. The owner should decide
  whether to remove them, and they must not go into any commit.
- Pipeline fixes from the brief:
  - Done in the Trek code path: manifest-driven data and adapter (`build_heritage.py`, `pipeline` block);
    per-photo segmentation and calibration (no hard-coded pixel windows); metadata from the manifest.
  - Not yet: a manifest-driven `tools/build_museum.py` for the heritage path, a parameterised browser smoke test,
    and the `not-modelled` status in the schema.
- Owner decisions pending: whether the 1986 Tri Series counts; published table vs photographed geometry.
- Session close per `performance-os/AGENTS.md` does not apply (different repo). Record an outcome in the knowledge hub
  when a Speed Concept build is validated.
