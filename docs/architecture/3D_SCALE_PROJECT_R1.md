# 3D Scale Project R1

Status: research / experiment program. No production migration implied.

## Objective

Prove that the same asset/runtime language can support:
1. a dense procedural interior,
2. a cinematic narrative room,
3. a luxury hero product,
4. an architectural/urban scene,
5. a large outdoor athlete world,

while remaining mobile-first and scaling to high-definition desktop/hero quality.

## Why this exists

The current portfolio already contains the pieces of a strong platform, but they are unevenly distributed. The goal is not to merge repositories. The goal is to prove a small number of reusable capabilities, define stable contracts, and adopt them incrementally.

## Phase 0 — Freeze evidence

Before changing runtime behavior:
- freeze canonical cameras for NOR, Beast Cave and Breitling;
- define one Gaudí architectural camera set;
- define one Studio-Kona outdoor route/camera path;
- record commit SHA, viewport, DPR and quality tier;
- capture baseline performance and visual evidence.

## Phase 1 — Indoor scale

Use NOR and the museum hall to prove:
- room/zone visibility;
- non-visible object suppression;
- lazy room/installation instantiation;
- HLOD;
- material sharing;
- shadow budgeting;
- texture compression.

Primary experiment: EXP-001.

Promotion gate:
- >=20% p95 frame-time improvement OR >=30% draw-call reduction in the target scene;
- no material visual-score loss;
- no new interaction/regression failure;
- confidence >=0.85.

## Phase 2 — Hero fidelity

Use Breitling as the quality ceiling.

Represent one canonical product through:
- LOD2: distant/room prop;
- LOD1: near-room;
- LOD0: product inspection;
- HERO: macro/cinematic.

The product identity must remain one asset identity across all representations.

Focus:
- bevel/chamfer quality;
- brushed/anodized metal;
- sapphire/glass;
- dial microdetail;
- anisotropy;
- reflection environments;
- contact shadows;
- macro camera choreography;
- temporal stability.

Success means campaign-grade closeups without making room mode too expensive.

## Phase 3 — Architecture intelligence

Gaudí research becomes operators:
- force field -> geometry;
- sun -> shading;
- water -> drainage;
- movement -> circulation/threshold;
- fabrication logic -> component topology.

Run each operator in isolation before adoption into Living Threshold.

## Phase 4 — Outdoor scale

Studio-Kona becomes the world-scale proving ground.

Canonical outdoor benchmark should include:
- at least 1 km traversable path;
- terrain + road + water + vegetation + landmarks;
- walk/bike movement;
- near/mid/far detail bands;
- weather/light state;
- deterministic camera/path replay.

Measure:
- sustained frame time;
- peak memory;
- streaming stalls;
- visible pop;
- TTFF;
- traversal responsiveness.

## Phase 5 — Shared primitive extraction

Extract only capabilities proven by at least two concrete consumers.

Likely first candidates:
- benchmark/evidence schema;
- asset pack/unpack tooling;
- environment capture;
- renderer lifecycle adapter;
- asset quality-tier selection;
- visibility/zone contract.

Do not extract narrative, art direction, choreography or room composition.

## Quality objective

The optimization target is not maximum geometry.

It is:

**perceived fidelity / (frame time × transferred bytes × memory pressure)**

This allows mobile room mode and high-definition HERO mode to coexist.

## Failure modes to actively prevent

- second renderer authority;
- duplicated asset identity;
- generated bundle edits as source fixes;
- material cloning that destroys batching/sharing;
- one-off room-specific loaders;
- visual regression hidden by FPS gains;
- benchmarks without canonical cameras;
- desktop-only validation;
- broad refactors before baseline evidence;
- research claims promoted without experiments.

## Near-term experiment order

1. EXP-001 Visibility / room graph / HLOD
2. EXP-003 Breitling HERO quality ladder
3. EXP-002 KTX2 ETC1S vs UASTC
4. EXP-004 material sharing policy
5. EXP-005 Gaudí force-to-form
6. EXP-007 Studio-Kona scale baseline
7. EXP-008 world partition / chunk streaming

## Confidence

- portfolio unification through contracts/evidence: 0.94
- KONA runtime as current primary web seed: 0.91
- NOR as engineering proving ground: 0.96
- Beast Cave as protected regression oracle: 0.97
- Breitling as hero-product benchmark: 0.96
- Gaudí as procedural architecture lab: 0.95
- immediate standalone Core repo: 0.35
