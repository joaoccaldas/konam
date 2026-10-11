# R1 benchmark identity audit | 11 October 2026

Status: evidence-only correction. No production or runtime changes.

## Finding
KONA PR #114 describes itself as documentation-only, but its diff changes both `web/src/engine/roomscene.js` and `museum/world/brand_rooms.json`. Those affect brand-room display geometry and lighting. The changes have not been merged into production, but they require separate runtime review.

The new `web/3d-benchmark-r1.mjs` measures the older `norwegian-engine-review.html` scene and accesses Breitling using `__museumGo('breitling')`. Neither identifies the final review rooms `room:konam:nor3-winter` and `room:konam:breitling-kona` pinned by recovery PR #124. The benchmark does not enforce `window.__reviewRoomIdentity` before accepting a measurement.

## Decision
Treat current R1 NOR/Breitling measurements as **legacy-generation benchmarks only**, not evidence for final-room readiness. Do not promote capabilities or merge the research PR based on these measurements. Split rendering/descriptor edits into an independently verified runtime PR if desired.

## Rechecked CI
- R1 checks run 38121758305: seven jobs fail at the Real 3D journey step. The available job summaries do not isolate a browser-startup root cause.
- R1 visual run 38121758290: generated output clean-tree gate fails before visual evidence.
- Weekly branch run 38151213132: seven app journeys succeed, but this does not establish correct final-room benchmark identity.

## Mandatory next gate
Before benchmarking, assert pinned source SHA, exact `window.__reviewRoomIdentity`, dependency and staged-asset integrity, clean generated output, fixed viewpoint and device details. On mismatch, emit `BLOCKED_WRONG_TARGET` without performance metrics. Only after this gate should the KONA-host vs Bellagio-adapter visual and frame-time comparison count.

Evidence:
- https://github.com/joaoccaldas/konam/pull/114
- https://github.com/joaoccaldas/konam/pull/124
- https://github.com/joaoccaldas/konam/actions/runs/38121758305
- https://github.com/joaoccaldas/konam/actions/runs/38121758290
- https://github.com/joaoccaldas/konam/actions/runs/38151213132

Confidence (evidence-conditioned judgment): legacy-target diagnosis 0.99; R1 final-room benchmark validity 0.08; PR #114 docs-only scope claim 0.05. Not statistical probabilities.
