# Spatial frame-budget stress R0: synthetic characterization
2026-10-23. Independently executed with Node on a locally mirrored copy of the branch's frame-budget policy. No live WebGL renderer, hardware GPU timing, actual asset corpus or physical phones were tested. This record MUST NOT be promoted to production performance evidence.

## Synthetic stress observations
| Case | Frames | Final resolution scale | Scale changes | Observation |
|---|---:|---:|---:|---|
| Steady 16 ms | 200 | 1.00 | 0 | correct: no downgrade |
| Constant 45 ms | 200 | 0.65 | 4 | correct: min scale respected |
| Alternating 10/60 ms | 400 | 0.65 | 4 | conservative: p95 responds to heavy frames |
| 150 ms stall every 20 frames | 400 | 1.00 | 0 | p95 definition ignores one outlier per 20-sample window; does NOT measure stutter impact |
| 1001 ms pause every 40 frames | 400 | 1.00 | 0 | 10 invalid samples filtered; documented threshold |
| 30+20*sin(i/15) ms | 1000 | 0.65 | 25 | CHURN: repeated scale transitions, potential GPU reallocation and visual flicker |
| 4000x3000 viewport, DPR 3, cap 1M | N/A | pixel ratio 0.288675 | N/A | effective ~1 million framebuffer pixels |

Experiment settings: 20-frame windows, cooldownWindows=0 (intentionally worst-case sensitivity), target=33.33 ms, minScale=.65, maxScale=1. Results are synthetic deterministic workloads and not representative field distributions. Existing production-default cooldown is 2 windows.

## Evidence scorecard
| Dimension | Score / 5 | Evidence label |
|---|---:|---|
| Deterministic pure policy behavior | 4 | synthetic-reproduced; targeted cases |
| Scale bounds and pixel cap | 4 | synthetic-reproduced; not security certification |
| Response to sustained pressure | 4 | synthetic-reproduced |
| Stability under workload oscillation | 2 | concern: 25 changes per 1000 frames with zero cooldown |
| Visual fidelity | 0 | NOT TESTED |
| Real GPU/frame-time improvements | 0 | NOT TESTED |
| Mobile thermal/memory stability | 0 | NOT TESTED |
| Asset rights/provenance | 0 | NOT APPLICABLE/NOT TESTED |
| Accessibility and task completion | 0 | NOT TESTED |

Scores are subjective completeness indicators, NOT a weighted release score; zeros mean no evidence, not measured failure.

## Release blockers and recommended refinement
- Add a transition-rate budget or a longer hysteresis/cooldown once repeated device traces show whether resolution changes cause frame spikes. Avoid changing control heuristics based only on synthetic sinusoidal input.
- Collect real GPU/CPU frame time when available; requestAnimationFrame deltas mix timing sources.
- Measure p50/p95/p99, stall durations, shader compile events, draw calls, triangles, GPU texture memory where obtainable, total transferred bytes, power/thermal state and browser context losses.
- Include physical mid/low Android and iOS Safari and desktop, identical camera paths and visual comparisons.
- Test actual target scenes with corrupt/missing assets, offline/slow network, context loss/restoration, repeated mount/dispose, and full production gate.
- Rights-cleared source assets: use existing `museum/schemas/asset-manifest.schema.json`; store hashes, artifact provenance and evidence under approved repo-local records. Do not mint another asset registry or upload unlicensed content.
- Reject if the visual UX worsens despite higher FPS, or performance becomes worse after dynamic buffer resizing.

## Knowledge reuse
The reusable method is bounded p95 characterization plus real-device/visual gates. It may be adapted to Bellagio/Studio Kona only through their existing render loops following independent evaluations. Do not declare 'lag-free on every device'. No Greatlinq/T.2 runtime validation has occurred.

## Next controlled experiment
Compare production defaults (90-frame window, 2-window cooldown) with stress defaults, then reproduce actual device traces and choose stability thresholds based on field evidence. Keep frame budget feature opt-in.
