# Museum exhibit validation — 2026-09-27

Agent-run checks on the local Mac; not independent manufacturer certification.

## Results

- Full procedural build succeeded on Blender 5.2.2 LTS, including master Blend, museum scene, five Cycles renders, compressed GLB, offline HTML and three FBX/GLB LODs.
- Main frame: 190,000 triangles, finite coordinates, zero boundary edges, zero non-manifold edges. Fork: 70,000 triangles, finite coordinates, zero boundary edges, zero non-manifold edges.
- Wheelbase 1013.00004 mm; chainstay 420.00003 mm; BB drop 74.99999 mm. These validate configured geometry, not independent physical measurements.
- Visible upper-frame photo-mask overlap: original 0.73942; revised 0.98759. Median and 95th-percentile boundary distance: original 9.172 / 29.479 mm; revised 0.834 / 0.834 mm. Maximum revised boundary residual: 22.512 mm. The rectangular ROI and segmentation limitations are in `assets/museum/silhouette-report.json`; maximum residuals must not be hidden by reporting only the percentile.
- Comparison projection is unchanged across versions: orthographic, 2400×1350, wheelbase-derived scale approximately 0.83379 mm/pixel. ROI x890:1580, y385:785 covers the visible upper frame, excluding other components. The reference mask also drives reconstruction, so this is a regression measure, not independent 3D accuracy.
- The current downloaded Canyon P02 matches the inherited palette-converted reference closely: alpha-mask IoU 0.998705, opaque RGB mean absolute difference 0.635/255. Both files are preserved with separate hashes.
- Offline Chromium checks passed at 1512×982 and 390×844: 45 semantic parts present; frame/fork IDs preserved; five tour stops; exploded fork moves and returns to rest; ride rotates wheels and reports 40.8 km/h at 90 rpm; front/rear accessory toggles; no document overflow; zero page/console errors. Report: `assets/museum/browser-checks.json`.
- Game exports contain 44,360 / 19,362 / 6,100 triangles, with six rigid groups at LOD0/1 and the chain omitted at LOD2. These are export counts, not a verified game-engine integration.
- Visual inspection covered Blender hero, side, cockpit, drivetrain and rear views, the aligned silhouette overlay, and desktop/mobile browser screenshots. Real phone hardware was not tested.

## Reproduce

Run `python3 tools/build_museum.py --lods`, then `node web/smoke.mjs`. Install dependencies per `MUSEUM_WORKFLOW.md`. `build-receipt.json` contains source/artifact hashes; each stage has a log. Do not substitute a successful file export for render inspection.

## Remaining limits

No factory CAD, photogrammetry scan or physical caliper measurements. Hidden tube sections, fork crown depth, cockpit interiors, basebar sweep and attachment interfaces remain inferred. Derailleur bodies, brake levers, ring machining, spoke lacing and some upholstery shapes remain simplified. The Aero 111's 48 tread cavities are not modelled. Close-up silhouettes/materials should receive another physical-reference pass before any claim of a digital twin.

Blender procedural surface noise is not baked into a portable PBR atlas. Game exports still need production texture baking, collision/rider attachments and engine-specific acceptance checks. Brand graphics are reference-derived; this remains an unofficial study. Historical bikes are future individually sourced exhibits, not completed assets.

## Interactive lab extension

`node --test web/test/*.test.mjs`: 11 checks cover independently evaluated force balance, humid density, cubic still-air scaling, crosswind conventions, head/tailwind/grade solver residuals, signed gains and losses, no curve extrapolation, malformed input rejection, configuration binding, invalid rider/system comparisons, 3D segment lengths across a crank cycle and the 15-candidate posture search.

`web/lab-smoke.mjs` covers desktop (1512×982) and phone-size (390×844): rear disc visibility, crosswind response, rider measurements/contact fitting, search/apply, baseline pinning, local curve import, stale-curve rejection, unsupported-yaw rejection, local image texture upload/placement/removal, and zero browser errors. Desktop also downloads and reopens a self-contained painted HTML file. These tests exercise browser/device-size behavior, not actual phone hardware or empirical aerodynamic correctness. Reports: `assets/museum/lab-browser-checks.json`; screenshots: `output/playwright/aero-lab-*.png`, `paint-studio-*.png`.

See `docs/AERO_FIT_PAINT.md` for coefficient provenance, model boundaries and the distinction between calculated forces, estimated drag coefficients, and illustrative flow. No actual CFD convergence, wind-tunnel correlation, medical fit validation or manufactured contact-point travel is claimed.
