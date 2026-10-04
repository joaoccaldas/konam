# BenchmarkSpec v1 — Draft

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
- test_date
- tester/tool
- confidence

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

## Visual evidence
- identical before/after canonical camera
- identical viewport / DPR / quality tier
- still image pair
- motion clip if temporal behavior changed
- visual-quality rubric score
- explicit reviewer notes
- no generated concept art accepted as runtime evidence

## Pass/fail
A candidate passes only if:
1. the target metric improves materially or an explicit quality objective is achieved;
2. no P0/P1 regression appears;
3. visual score does not materially decline unless the experiment explicitly studies a quality/performance trade-off;
4. results are reproducible;
5. known baseline failures are separated from newly introduced failures.

## Confidence
- 0.95–1.00: repeated on representative devices and scenes
- 0.85–0.94: strong controlled evidence, limited device diversity
- 0.70–0.84: promising, incomplete
- <0.70: research only

## Canonical benchmarks
- NOR // 3: engineering/performance
- Beast Cave: atmosphere/narrative regression
- Breitling × KONA: hero-product fidelity
- Gaudí / Living Threshold: architectural/procedural complexity
- Studio-Kona: outdoor/world-scale streaming

## Rule
Never claim an optimization from one FPS number or one screenshot.