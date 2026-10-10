# BenchmarkSpec v1 - Draft

Status: research draft. Not production authority.

## Purpose
Make 3D performance and visual comparisons reproducible across NOR, Beast Cave, Breitling, Gaudí, Studio-Kona and future worlds.

## Required identity
- benchmark_id
- project
- scene
- canonical_camera_id
- baseline_commit_sha
- candidate_commit_sha
- evidence_source_ref
- evidence_source_sha
- test_date
- tester/tool
- confidence

## Result classification
Every run must be classified before any performance conclusion is allowed:

1. `blocked-preflight`
   - the benchmark did not reach the measurement phase;
   - examples: stale deterministic outputs, unresolved canonical route, missing camera, asset/decode failure before sampling, unavailable runtime.
2. `measured-fail`
   - sampling executed, but the candidate failed a performance, visual, interaction or stability gate.
3. `measured-pass`
   - sampling executed and all declared gates passed.

A `blocked-preflight` result is not evidence that the renderer or scene regressed.

## Preflight gates
Required before measurement:
- deterministic build completes;
- generated outputs are either clean or explicitly isolated as research-only generated artifacts;
- canonical scene route resolves to the intended current scene variant;
- canonical camera/path exists;
- viewport, DPR and quality tier are declared;
- required assets decode/load without blocking error;
- baseline and candidate SHAs are recorded;
- evidence directory is writable and uniquely keyed by benchmark/run.

## Environment
- device_model
- OS/version
- browser/runtime/version
- GPU if known
- viewport_css_px
- physical_pixel_ratio
- configured_DPR
- quality_tier
- power_mode if known
- thermal/state notes if observable

## Run protocol
- cold or warm start
- cache state
- warm-up seconds
- sample duration
- number of repetitions
- deterministic camera path or fixed camera
- interaction sequence if applicable

## Performance metrics
Required where measurable:
- FPS mean
- frame time p50/p95/p99
- draw calls
- triangles
- material count
- texture count / transferred bytes
- model bytes transferred
- total network bytes
- time to first useful frame
- JS heap / GPU memory proxy where available
- shader/program count where available
- WebGL context loss / renderer errors
- asset/decode errors

## Visibility and residency metrics
For visibility, HLOD, streaming or unload experiments, also record:
- declared_zone_count
- instantiated_zone_count
- resident_zone_count
- visible_zone_count
- active_zone_count
- active_mesh_count
- build_event_count
- unload_event_count
- rebuild_event_count
- resident_asset_bytes where observable
- unload_hysteresis / activation thresholds

This separates semantic existence from construction, memory residency and rendering.

## Visual evidence
- identical before/after canonical camera
- identical viewport / DPR / quality tier
- still image pair
- motion clip if temporal behavior changed
- visual-quality rubric score
- explicit reviewer notes
- no generated concept art accepted as runtime evidence
- scene variant and source SHA must match the scene being claimed

## Pass/fail
A candidate passes only if:
1. the target metric improves materially or an explicit quality objective is achieved;
2. no P0/P1 regression appears;
3. visual score does not materially decline unless the experiment explicitly studies a quality/performance trade-off;
4. results are reproducible;
5. known baseline failures are separated from newly introduced failures;
6. the run status is `measured-pass`, never `blocked-preflight`.

## Confidence
- 0.95-1.00: repeated on representative devices and scenes
- 0.85-0.94: strong controlled evidence, limited device diversity
- 0.70-0.84: promising, incomplete
- <0.70: research only

## Canonical benchmarks
- NOR // 3: engineering/performance
- Beast Cave: atmosphere/narrative regression
- Breitling × KONA: hero-product fidelity
- Gaudí / Living Threshold: architectural/procedural complexity
- Studio-Kona: outdoor/world-scale streaming

## Current preflight lesson - 2026-10-04
PR #114's Museum, Visual Evidence V2, UI Interaction and Hostile Runtime gates are currently `blocked-preflight`: `tools/build_pages.mjs` changes `app/admin-assets.json`, `app/hall.js` and `app/museum-data.js` before visual/runtime evidence can run. The unit suite reaches 448 tests with 0 failures before this deterministic-output block. No visual regression claim may be inferred from those red checks.

## Rule
Never claim an optimization from one FPS number, one screenshot, or a CI color that did not reach measurement.