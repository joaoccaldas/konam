# Caldas Studio: measured capability claims

The supplied October 18 handoff records **48 → 24 draw calls** using cached shadows in one controlled scene study. This is a 50% reduction in recurring draw calls **in that measured scene**, not a 50% FPS gain, faster GPU render time or a general product improvement. Another study records **63 draws vs 28** comparing scene reflection to environment fallback; this measures different techniques, not a before/after quality win. Safari GPU timing was unavailable. Both findings require original run logs, source pinning and environment reconciliation before public investor use.

## Measurement contract
Input JSON: `{"measurements":[{"id":"...","metric":"...","unit":"...","source":"evidence log/ref","sha":"40-hex-commit","baseline":48,"candidate":24,"direction":"lower","environment":{"baseline":{"scene":"...","device":"..."},"candidate":{"scene":"...","device":"..."}},"limitations":[]}]}`.

`node tools/evidence-metrics.mjs /private/evidence.json` produces a claim-state and calculated improvement only when baseline/candidate, metric, and environment are comparable. Do not put private logs or customer data into the public repo.

## Baseline and next-run protocol
For every tested page/asset/room store: source SHA, exact URL, browser+version, hardware/device, display size and DPR, asset and scene IDs, warm/cold cache, network profile, quality profile, first **correct** frame, p50/p95 frame time, FPS, draw calls, triangles, GPU texture footprint estimate, transfer bytes, memory where available, loading failures, screenshots and manual visual score (blind independent reviewer). Report missing metrics as unknown. Attach real raw outputs, not fabricated percentages.

For production efficiency store: brief complexity, reused asset IDs and count, generation start/finish, human corrections, failed attempts, accepted output count, accepted visual score, integration target and output bytes. Compare matched scene briefs using identical acceptance gates. Efficiency hypotheses must be labeled hypotheses until tested across repeats.

## Investor-safe evidence
Three scopes: (1) verified measured result bound to run and SHA; (2) historical observation clearly labeled as such; (3) hypothesis with next validation test. No unmeasured claims of superior realism, proprietary rights, speed advantage or guaranteed share conversion.

## Why this matters
This is the first reusable measurement contract for the Founder's Preview, not a replacement for KONA's existing performance tests, technical asset contracts or runtime. Connect approved measurement receipts to existing canonical asset IDs and skills, then display them in an expandable 'How it was built' section. Source relations: #137, #138, PR #139.
