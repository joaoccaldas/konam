# Consolidation evidence: preserve best work without merging stale branches
Observed 2026-10-23 via GitHub compare and exact blob SHA checks. This is a source-level comparison, **not** a claim that code is tested or that each PR is merged.

## Why duplicates arise
Multiple streams evolved simultaneously: Canyon Museum historical factory, Kona.m consumer app, Bellagio geography, Studio Kona island, plus experiments and release branches. Git history ahead/behind counts measure ancestry only; a diverged branch can have changes fully transplanted into main.

## Verified facts
- `konam/architecture/room-asset-contract-v1`: 15 commits ahead / 93 behind. Both `museum/schemas/asset-manifest.schema.json` and `museum/schemas/room-manifest.schema.json` have **identical Git blob SHAs** on the branch and main: `280ca1bc79e7bb9fb2970ee693914674b44e9a07`, `bc17c19b2a118143b612b47d1ece110e9e2a8949`. **Do not re-merge these schema files.**
- Same branch's `tools/validate-room-package.mjs` differs: main `4122799220342b5df27e1ef0555cb7751a79b771`, branch `1b97548689403674faa6cbd74ed4fd58aec20e7d`. Main test `web/test/room-asset-contract.test.mjs` differs too: `2d6469dc5fe70e17d036eca3dfc1476190fec399` vs branch `59df983293f5bb8f816e4cb0ae0b3d70943ff2a3`. Treat as **selective review only**, not automatic upgrade.
- `konam/architecture/canonical-runtime-v1-20261004`: 26 ahead / 11 behind, with modifications to public UI, SW, generated app artifacts and tests. Review `web/test/canonical-room-runtime.test.mjs` and `world/konam/founding-runtime-v1.json` separately; no wholesale cherry-pick of `app/kona-core.js`, `sw.js` or shell.
- `bellagio/research/reconstruction-r1-20261004`: 9 ahead / 16 behind. New benchmark and Vegas lab docs/scenes are candidate R&D; deployment workflow modifications and template changes require production diff and regression evidence before adoption.
- `studio-kona/feat/xr-readiness-baseline-20261018`: 4 ahead / 0 behind, adding 4 isolated files: `.github/workflows/xr-readiness.yml`, `docs/XR_READINESS.md`, `tests/xrCapabilities.test.mjs`, `web/src/xrCapabilities.js`. Best candidate for an independent additive feature review, but status does not prove passing CI.

## Preservation taxonomy
| Disposition | Condition | Action |
|---|---|---|
| IN_MAIN_IDENTICAL | Current main and branch blob identical | Record as integrated; do not reapply |
| IN_MAIN_EQUIVALENT | Behavioral equivalence shown via tests and review | Link evidence; archive proposal after approval |
| UNIQUE_CANDIDATE | New/changed functionality absent from main | Evaluate independent test and narrowly cherry-pick/extract |
| EXPERIMENT | Prototype with uncertain quality/rights | Keep branch/tag and evidence; never route to production |
| SUPERSEDED | Superior canonical implementation with evidence | Link lineage, preserve historical commit/tag |
| UNRESOLVED | No trustworthy comparison or owner | Do not delete, merge or declare redundant |

## Safe sequence
1. Capture protected main SHA, candidate SHA, merge base, current CI checks, live deployment, issue and PR status. Refresh before decisions.
2. Compare **blob SHA** for exact identity, then assess semantic equivalence for changed source and generated outputs separately.
3. Retain original branches and commits until acceptance. Extract smallest new behavior into a short-lived branch off current main.
4. Require unit/contract, visual, mobile, security/rights and perf gates appropriate to the change; verify failure cases (missing texture, WebGL context loss, slow network, large scenes).
5. Land one feature behind compatibility/feature controls. Test post-deploy exact SHA and preserve rollback instructions.
6. Only after acceptance mark duplicates as integrated/superseded in an inventory. No deletion without separate explicit approval.
7. Publish cross-project lessons as rights-screened ADRs/recipes; keep private strategic context in the private company repo.

## Fundamental missing evidence
Actual open-PR list and CI checks, source-to-source parity for every candidate, license audit, run-time benchmark and independent deploy verification have not been established by this comparison. Avoid percentages of consolidation completion until the denominator is inventoried.

## Next executable gate
Run a scripted, pinned comparison and manifest scan across explicitly authorized clones. Use the existing `tools/3d-knowledge.mjs`, canonical schemas and spatial-01 scanner; create no second asset registry. Prioritize narrow review of Studio Kona XR branch, then preserve/compare Kona runtime tests and Bellagio reconstruction research.
