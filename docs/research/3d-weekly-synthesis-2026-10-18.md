# Unified 3D R&D | Weekly synthesis, 11–18 October 2026

Research-only synthesis. Sources: public GitHub source files, PR heads and workflow evidence. No production changes, promotions, rights approvals, physical-device tests or private knowledge dumps.

## Decisions

**Graduate as shared operating method:** Provenance-bound measurements, privacy-scoped knowledge lookup and fail-closed visual/release evidence. KONA [PR #136](https://github.com/joaoccaldas/konam/pull/136) merged Oct 15 after 521 reported local tests and seven passing exact-head viewport checks. [PR #139](https://github.com/joaoccaldas/konam/pull/139) merged Oct 18 with green exact-head PR checks. This is a governance improvement, not proven visitor authentication, better FPS or a universal renderer.

**Keep as candidates:** NOR // 3, Beast Cave and Breitling exact artistic modules. Current KONA main lacks the NOR and Breitling final source modules, while Bellagio's pinned KONA recovery ref `6efb28061b7101bd21660df13f76226bc04b1e55` has blob-identical sources to `cc80c48`. [Candidate PR #123](https://github.com/joaoccaldas/konam/pull/123) remains open; its [visual CI](https://github.com/joaoccaldas/konam/actions/runs/38766733297) passed. Bellagio uses same-origin pinned embedding with semantic-identity verification, **not** native cross-world renderer portability. Rights, hardware and public promotion are unresolved.

**Graduate only as within-project recipes:** Gaudí's scale-correct PBR, transmission glazing, flat-normal wet coat, per-ashlar variation, physically oriented sun and camera-depth workflow improved author-observed renders. The [realism playbook](https://github.com/joaoccaldas/ai/blob/main/projects/gaudi-nexus/docs/REALISM_PLAYBOOK.md) still rates hero/vault around 7.5/10 and notes geometry/site-truth gaps. Two procedurally exported GLBs passed structural/hash validation in [Studio 2 draft #106](https://github.com/joaoccaldas/ai/pull/106) with [green Blender/browser CI](https://github.com/joaoccaldas/ai/actions/runs/39122792497), but cross-project visual parity is not established.

**Reject current aggregate merge:** [KONA draft #114](https://github.com/joaoccaldas/konam/pull/114) combines runtime, catalog, workflow and architecture changes. At head `84cc91e`, [visual CI](https://github.com/joaoccaldas/konam/actions/runs/38528615986) failed at all seven viewports due to generated-output drift; museum 3D journeys and hostile-runtime/security checks also failed. Split research-only, runtime and catalog changes. Do not promote its 63-item cross-repo research registry as a second canonical authority over [KONA's existing map](https://github.com/joaoccaldas/konam/blob/main/docs/architecture/AUTHORITY_MAP.md).

## Week-by-project

- **KONA.m / Canyon Museum:** Main merged #136 and #139; room PR #123 and mixed research PR #114 remain unmerged. Canyon Museum's latest visible default-branch commit was Oct 2. Keep historical provenance, not parallel active product ownership.
- **NOR, Beast Cave, Breitling:** Candidate PR #123 reports desktop/phone geometry budgets of NOR 91/89 meshes and 200k/63k triangles; Beast 136/108 and 214k/169k; Breitling 102/86 and 63k/49k. Beast's earlier desktop geometry reduced 228→136 meshes, 632k→214k triangles. These are software geometry results, not physical-phone FPS, aesthetics or permissions.
- **Bellagio:** Oct 18 commits added [Fjord to Summit](https://github.com/joaoccaldas/bellagio/commit/6841e26e8ec27c68f1a09b082ac1438cf97b9f04) and [Decision Room](https://github.com/joaoccaldas/bellagio/commit/9b2492388e0c0fae213514f8bdb9e37bd7350abb), pinning KONA recovery refs. No independent device visual/performance evidence retrieved.
- **Gaudí / Living Threshold:** Oct 12 material, sky, glazing, paving and presentation changes; [cross-project method notes](https://github.com/joaoccaldas/ai/commit/4945cc6f5b6569ef51d5855f26487da03ce41fc3). Rev16 remains distinct from unpromoted site-truth Rev17. [Explicit owner override merged Gaudí to main](https://github.com/joaoccaldas/ai/commit/3cc4b83c2ba50c15eb500f5c974f538f45c17f23); older no-main-merge documentation is stale.
- **Studio-Kona:** No default-main commit observed this interval. [XR readiness draft #56](https://github.com/joaoccaldas/studio-kona/pull/56) passed capability CI, but XR remains disabled, headset and native host tests not done.
- **Studio 2:** Draft #106 passes structural/2D fallback tests, not 3D device fidelity; [stacked #107](https://github.com/joaoccaldas/ai/pull/107) introduces editorial novelty effects, not evidence of real-world demand.
- **Rawdogging, rawdog3d, BlocksCreateWorld:** No Oct 11–18 default-branch commits observed. Most recent are June 2026, April 2026 and March 2025 respectively; rawdog3d is archived. Preserve reusable historical techniques without creating new common engines.

## Visual and performance evidence

Gaudí's changed glazing/puddles/weathered PBR and lighting have *qualitative author-observed* value. KONA's geometry optimizations pass software constraints but not user-device fidelity. Separate historical KONA note records cached shadows 48→24 recurring draw calls (50% fewer draws only) and alternative reflections 63 vs environment fallback 28 draws; neither proves FPS or better image quality. [Evidence contract](https://github.com/joaoccaldas/konam/blob/main/docs/CALDAS_EVIDENCE_METRICS.md).

Repeated gaps: branch/main/site authority drift; Blender procedural-to-glTF appearance transfer; missing physical-device p95/GPU evidence; Gaudí municipal context vs render truth; room rights/marks; camera-swap occlusion; 3D Inspector FPS/CPU instrumentation; CI generated-file determinism.

## Top experiments, ranked by (information gain × leverage) ÷ (effort × risk)

Scores use subjective 1–5 ordinal planning ratings; they are **not results**.

| Rank | Bounded test | I | L | E | R | Priority | Go/no-go |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | Cyclist CFD reproducibility against rights-cleared reference geometry/pressure/wake data | 5 | 5 | 2 | 2 | **6.25** | Pin solver, units and boundary conditions; no physical-performance claim without a separate validation gate |
| 2 | ClusterLOD occlusion/camera-swap adversarial fixtures with matched p95 time and visual masks | 4 | 5 | 2 | 2 | **5.00** | Reject any incorrect culling or incomparable run |
| 3 | Gaussian-splat glTF conformance and conservative KTX2 interoperability versus baseline | 4 | 4 | 2 | 2 | **4.00** | Two viewers and mobile evidence; reject invalid compression or image-quality loss |

CFD/ClusterLOD/splats are prior research candidates; no in-window public execution receipt was retrieved. Do not describe them as verified capabilities.

## Recalibrated claim-readiness confidence

| Domain | Prior rough → current |
| --- | --- |
| Final room source identity | 85 → **90** |
| Cross-repo canonical authority | 85 → **55** |
| Cross-project asset portability | 85 → **50** |
| Visual evidence governance | 80 → **70** |
| Native room portability | 20 → **15** |
| Evidence-gated software governance | unscored → **90** |
| Physical CFD validity | unscored → **10** |
| Unified platform, overall | ~55 → **~45** |

Confidence is heuristic with stricter release-proof gates, not a probability estimate. Higher architecture clarity does not imply more deployed interoperability.

**STOP:** blanket #114 merge, duplicate registries/renderers, old NOR/Breitling public URLs as final, unreviewed private-knowledge publication, asset-count chasing. **DEFER:** new Luxor rooms, generalized native-host rewrites, commercial claims, full XR integration, more novelty effects and destructive archive consolidation. **NEXT:** one verified scientific receipt, one occlusion red/green fixture, one standards-conformant splat interchange trial. No automatic production modifications.
