# Canyon triathlon museum asset workflow

This repository contains one reconstructed exhibit: **Speedmax CFR AXS, MY2027, size M, Pro White**. The manufacturer uses MY2027 in image names and published launch material in 2026. There are no finished historical exhibits yet. Do not relabel this geometry to represent a different generation.

## Open the result

- `Speedmax_Museum.html`: self-contained, offline interactive exhibit. The existing loopback viewer at `http://127.0.0.1:8731/` serves the updated `web/dist/index.html` while its server is running.
- `assets/museum/speedmax_cfr_master.blend`: editable bike with semantic parts and modifiers.
- `assets/museum/speedmax_museum.blend`: bike plus reusable Cycles lighting, packed side reference, floor and five named cameras.
- `assets/museum/museum_{hero,side,cockpit,drivetrain,rear}.png`: rendered views.
- `assets/museum/speedmax_web.glb`: compressed, metre-scale glTF with semantic metadata.
- `export/museum/`: refreshed FBX/GLB levels. The prior `export/zwift/` remains the original version.

Original source scripts and original Blend/GLB/HTML files are preserved in `assets/original-2026-09-27/`. Nothing was published or uploaded. The existing old `Speedmax_CFR_AXS.html` is retained for comparison.

## Prerequisites and build

Validated on macOS, Blender 5.2.2 LTS, Python 3.9 with the versions in `requirements-museum.txt`, Node 24 and the committed npm lockfile. Blender needs the DIN Condensed Bold macOS system font used by the legacy component builder. Browser checks use local Google Chrome. The geometry pipeline itself has no network calls.

```sh
cd ~/Developer/speedmax-cfr-3d
python3 -m venv .venv
.venv/bin/pip install -r requirements-museum.txt
cd web
npm ci
cd ..
.venv/bin/python tools/build_museum.py --lods
node web/smoke.mjs
```

The Python interpreter running the pipeline supplies NumPy, SciPy and Pillow. Blender uses its own bundled Python. `blender` must be on PATH or installed in `/Applications/Blender.app`. `--samples 64` controls the render sample count; `--skip-renders` skips presentation rendering. Always inspect new renders after geometry changes.

Build stages: reference hashes → reference mask/profile → original decal sampling → Blender bike → geometric checks and fixed-camera silhouette → meshopt web GLB → bundled HTML → Cycles scene/stills → optional game exports. Each stage logs to `assets/museum/`. `build-receipt.json` records source and artifact hashes. Failure stops the pipeline; Blender Python exceptions are checked explicitly. A completed export alone is not visual validation.

## Sources and confidence

`museum/bikes/canyon-speedmax-cfr-axs-my2027-m.json` is the source manifest; `museum/catalog.json` is the collection index. Every source file has a URL, a purpose and SHA-256. `assets/reference/geometry-source.json` retains the manufacturer's size-M structured properties. The wheelbase field is serialized with a locale-grouping anomaly (`1.013 mm`); the model uses **1013 mm**, consistent with the displayed geometry and full-size bicycle scale.

Primary references:

- [Canyon product 4524](https://www.canyon.com/en-ie/road-bikes/triathlon-bikes/speedmax/cfr/speedmax-cfr-axs/4524.html): size geometry and stock components.
- [Canyon media kit](https://media-centre.canyon.com/en-INT/assets/240433/): official studio photography.
- [Fizik Aeris Long Distance R1](https://www.fizik.com/en-us/products/saddles-transiro-aeris-long-distance-r1-black-aerldr1fa0): split nose, 242 mm length, 135 mm width, 55 mm nose and 7×9 mm rails. Padding contours and slot dimensions remain interpreted.

Separate **published dimensions**, **photo-derived shape**, and **inferred geometry**. The silhouette score uses a threshold-derived mask from the same source used to build the model; it is a regression check, not independent metrology. Its upper-frame ROI excludes BB, derailleur, stays, fork and accessories. The maximum residual remains higher around occlusion/segmentation boundaries. Do not describe a 98% mask overlap as “98% accurate in 3D.”

The photo reconstruction fixes axle scale and camera projection for both old and new models. No separate best-fit camera is allowed to hide geometric differences. Occluded carbon behind the drivetrain is reconstructed explicitly rather than modelling the black derailleur as a hole in the frame.

## Parts and export contract

Blender: metres, X forward, Z up, rider's left +Y; drivetrain -Y. glTF: metres, Y up. Named wheel and crank parent origins are axles/BB. `part` IDs remain stable for picking, focus, isolation and the build sheet. `explode` vectors are stored in Blender XYZ and converted by the viewer. Decorative children do not duplicate parent part IDs. Wheel graphics and valves remain wheel children.

The dense static chain is `baked` and stays in Blender/game exports; the web instantiates the two `template` meshes along the pitch path. Legacy substitute-font graphics are `obsolete`, preserved in the Blend but excluded from rendering/exports. Optional bottles are exported for configuration but hidden in the default photo setup. The photo variant still uses the same stock component builder where dimensions are supported.

Micro-surface procedural shading is Blender-specific. GLB retains geometry, base PBR materials and UVs already supplied by the component builder; procedural Cycles noise is not a baked texture pack. The viewer adds deterministic rim and tyre surface textures. Game exports have reduced geometry and materials, **not** a completed production normal/roughness atlas, rider rig, collision pack or verified Zwift integration.

## Adding another bike

1. Establish exact generation, year designation, trim, size, stock wheels/cockpit and photographed configuration. Record both launch date and model year when they differ. Find the earliest triathlon model through primary catalogs/archives before assigning a “first Canyon” exhibit.
2. Create a manifest following `museum/bike.schema.json`. Keep original photos unchanged and hash them. Record source URLs, licensing context, dimensions and confidence for each component. Obtain side plus front/top/three-quarter references; one side photo cannot establish hidden width.
3. Fit wheel circles/axles and BB landmarks; store projection, pixel scale, known geometry and uncertainty. Review masks and occlusions. Do not reuse the 4524 pixel ROIs on another image.
4. Implement a **generation-specific adapter** under `blender/`, using reusable helpers in `lib.py`, applicable component builders, semantic IDs and pivot conventions. Register the adapter explicitly in the pipeline. The current runner intentionally rejects unregistered adapters instead of silently building a 4524 under a different name.
5. Use the shared checks, updating their manifest-driven dimension expectations and reviewed photo ROIs for that bike. Keep the baseline/reference separate from the candidate. Validate frame/fork topology, metre scale, rotating pivots, tyre/fork and drivetrain clearances, mirrored geometry and optional components.
6. Reuse the exhibition rig, then adjust framing to the bike bounds. Render hero, side, front/top, non-drive and close views. Inspect grounding, intersections, seams, highlights, typography and material response. Fix geometry before lighting it to conceal issues.
7. Export web and LOD assets. Verify all part IDs, chain/wheel motion, accessories, explodes returning to rest, configuration round trips, screenshots and downloads. Test desktop and phone-sized viewports; record real-device limits separately.
8. Add the catalog entry only after validation. Attach the build receipt, QA report and known limits; record an evidence-cited outcome and recipe in the knowledge hub. Historical research and future models remain future work until their own source-backed builds exist.

## Recovery and limitations

Never delete original source assets. Build into the museum output directory, retaining the original snapshot. If a reference hash changes, inspect and document it before updating the manifest. If segmentation fails, inspect region samples rather than broadening thresholds until it “looks right.” If a render/export fails, use its stage log and rerun only after correcting the source.

Public photography cannot provide factory-level shape tolerances. Hidden lateral widths, cockpit interior, basebar sweep, attachment interfaces, detailed derailleur bodies, brake levers, spoke lacing and drivetrain machining are still interpretations. This is not an aerodynamic simulation or manufacturing asset. The single-file viewer does not require authentication or cloud services; configuration is saved locally and in its URL, and can be reset.

## Aero, rider and artwork modules

See [AERO_FIT_PAINT.md](AERO_FIT_PAINT.md) for local input/output contracts, assumptions, model validity and checks. Reuse the pure physics and fit modules for future exhibits, but source each bike’s geometry, contact-point coordinate mapping and aerodynamic curves independently. The build generates hidden native disc/mannequin options and the interactive viewer; optional assets do not alter the calibrated stock geometry or game LOD contract.

## SLX adapter: what the second bike teaches us

The Speedmax CF SLX 8 Di2 (product 4520) shares Canyon's published size-M frame
geometry with the CFR AXS (4524) — same wheelbase, chainstay, stack, reach, head
and seat angles. What differs is everything visible on top of that frame:

- Shimano Ultegra Di2 drivetrain (52/36, 11–30 cassette) instead of SRAM Red AXS.
- DT Swiss ARC 1600 wheels: 65 mm front, 85 mm rear (not 85/85). Canyon's own
component listing conflicts with its generic geometry table on this point;
the explicit component listing wins and the discrepancy is preserved in the
spec record.
- Standard SP102 seatpost — no Splitter Plate wing, no rear bottle carrier. The
rear bottles option is disabled in the SLX viewer with an explanation.
- Continental GP5000 S TR 28 mm tyre (both wheels), not the TT-specific front
tyre of the CFR.
- Light Lavender finish as the stock colourway, not Pro White.
- No Fizik Transiro Aeris LD R1 — the LD R5 with steel rails.

The SLX adapter is `blender/slx_adapter.py`, registered as
`speedmax-4520-photo-v1` in the build runner (`tools/build_museum.py` selects
the SLX path when the manifest's `product_id` is `4520`). It does not reuse the
CFR frame mesh: `blender/data-slx/` holds its own frame, stays and fork traced
from the 4520 photograph, plus its own `calibration.json`, `profile.json`,
decal data and mask. The adapter wraps the shared component builders to set the
Ultegra cassette and chainrings, the 65 mm front rim profile and 24-spoke
wheels, and then replaces the seatpost (SP102 outline), the chainring/spider
geometry, the saddle rail material and the paint colour. It hides the rear
bottles and front AeroFuel accessories. `blender/extract_graphics.py` accepts
`--slx` to read `assets/reference/slx/p01.png`; the silhouette comparison uses
`assets/reference/slx/p04.png`.

### Known data conflicts on the 4520 record

- Canyon's geometry table lists rim height as 85 mm; the wheelset component row
says 65 mm front. The 65/85 split is taken from the explicit component listing.
- Marketing copy says 30 mm tyre clearance; the frame and fork component rows say
28 mm. The spec record marks both and uses 28 mm as the figure from the
authoritative component source.

### Consistency checklist for every new bike

Before adding a new exhibit to the collection page:

1. `museum/bikes/<bike-id>.json` manifest exists, has a unique
`reconstruction_adapter` string, and every reference photo has a SHA-256.
2. `tools/build_museum.py --manifest <manifest>` runs without error, with
`--skip-renders` during iteration and without it for delivery.
3. `blender/validate_asset.py` reports no issues: finite, manifold meshes;
wheelbase, chainstay, BB drop and axle alignment within 0.02 mm of the
manifest; chainrings, cassette and rotors centred within 3 mm. Boundary
edges are counted in the report but are not a failing check.
4. `tools/compare_silhouette.py` runs and its output score and image are in
`assets/museum[-*]/silhouette-report.json` and `overlay_revised.png`.
5. A browser smoke check passes for the new viewer HTML: no page errors, no
`scrollWidth` overflow at 390 px and 1512 px. `web/workshop-smoke.mjs`
currently loads only `Speedmax_Museum.html` (the CFR viewer), so a new
bike's viewer needs that script parameterised or an equivalent check.
6. `node --test web/test/*.test.mjs` passes with no failures (16 tests as of
2026-09-27).
7. The viewer was opened in a real browser once. Orbit to the bike before
dismissing a broken render as a headless bug.
8. The catalog entry is updated from `status: 'not-modelled'` to
`status: 'reference-study'` in `museum/catalog.json` only after steps 1–7
pass. Then `node tools/build_collection.mjs` regenerates
`Canyon_Collection.html`, `web/dist/Canyon_Collection.html` and
`web/dist/index.html` from the catalog.

### Rebuild everything from scratch

```sh
cd ~/Developer/speedmax-cfr-3d
python3 tools/build_museum.py --manifest museum/bikes/canyon-speedmax-cfr-axs-my2027-m.json --lods
python3 tools/build_museum.py --manifest museum/bikes/canyon-speedmax-slx-8-di2-my2027-m.json --lods
