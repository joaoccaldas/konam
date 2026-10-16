# Unified 3D R&D Program — R1

Date: 2026-10-04
Status: research / architecture branch only
Branch: research/3d-core-r1-20261004

## Mission

Build a self-improving 3D system for athletes, sports, brands, architecture and large interactive worlds that improves visual quality and runtime efficiency together.

The quality bar is not “acceptable real-time 3D.” The target is:
- exceptional visual craft at the focal point,
- device-adaptive performance everywhere else,
- evidence-backed engineering,
- canonical asset and world semantics,
- no production change without measured proof.

## Non-negotiable rules

1. Production projects are not research sandboxes.
2. REUSE → ADAPT → RESTYLE → COMPOSE → CREATE.
3. No new authority duplicates an existing authority without an architecture decision.
4. No capability enters shared infrastructure because it sounds promising. It must beat a baseline in a controlled experiment.
5. No “knowledge” is canonical without provenance, source quality, confidence and implications.
6. Negative experimental results are retained.
7. Visual quality is a first-class metric, not a subjective afterthought.
8. Every performance change must prove it did not make canonical scenes visually worse.
9. Every 3D change considers mobile portrait, mobile landscape, tablet and desktop.
10. Generated/concept imagery never counts as runtime evidence.

## Program structure

### A. Knowledge
Research streams:
- Gaudí life, work, collaborators, craft, structure, geometry, light, materials, environment and historiographic disagreements.
- Computational architecture and structural form-finding.
- Rendering, WebGL, WebGPU, glTF, Meshopt, KTX2/Basis, LOD/HLOD, meshlets, streaming, culling and GPU-driven techniques.
- Product visualization: watches, bicycles, shoes, helmets, components, glass, metals, carbon, anisotropy, reflections, macro cinematography.
- Digital twins, photogrammetry, Gaussian splats, NeRF and hybrid reconstruction.
- Sports physics: cycling dynamics, drag, drafting, rolling resistance, slope, wind, weather, road surface and biomechanics.
- Perception: salience, geometry vs texture value, motion, LOD visibility, temporal stability and device/screen constraints.
- AI × 3D: reconstruction, generation, agents, optimization and QA.

Each research record must contain:
- claim,
- source,
- original language where relevant,
- primary/secondary classification,
- confidence,
- contradiction/disagreement if any,
- implication,
- experiment candidate,
- affected projects.

### B. 3D Lab
All uncertain techniques are tested outside production.

Experiment record:
- id,
- hypothesis,
- baseline,
- scene,
- device/browser,
- commit SHA,
- implementation,
- metrics,
- visual evidence,
- result,
- decision,
- confidence,
- affected projects.

### C. Shared platform candidates
Only proven capabilities graduate here.

Candidate layers:
- renderer/runtime primitives,
- asset contracts and loading,
- world contracts,
- simulation modules,
- benchmark/evidence tooling.

No monorepo extraction until repeated reuse proves the boundary.

## Canonical benchmark ladder

### 1. NOR // 3 — engineering/performance benchmark
Purpose:
- procedural complexity,
- many objects,
- instancing/material reuse,
- device-tier budgets,
- optimization experiments.

Protect:
- composition,
- room narrative,
- validated performance budget.

Use for:
- HLOD,
- visibility,
- KTX2,
- material sharing,
- lazy installations,
- draw-call collapse,
- adaptive DPR/shadows.

### 2. Beast Cave / Lionel Sanders — golden experience benchmark
Purpose:
- atmosphere,
- narrative,
- lighting,
- emotional coherence,
- high-impact athlete space.

Rule:
- do not casually refactor.
- treat as a regression oracle.

A shared runtime change fails if:
- screenshots materially degrade,
- atmosphere is weakened,
- interactions regress,
- lighting changes unintentionally,
- performance improves only by flattening visual quality.

### 3. Breitling × KONA — hero-product benchmark
Purpose:
- luxury product fidelity,
- macro inspection,
- material realism,
- cinematography,
- dynamic allocation of GPU budget.

External quality bar:
- premium watch CGI/product-film standards.

Required modes:
- room mode: cheap, stable, efficient representation.
- hero mode: highest LOD, premium materials, precise reflections, macro camera, glass/metal/carbon fidelity.
- inspection mode: close interactive examination.
- exploded/mechanical mode: only via canonical inspection systems.
- athlete-time mode: connects timing/product story to endurance context without inventing factual claims.

Breitling experiments should transfer to:
- bikes,
- helmets,
- shoes,
- watches,
- medals,
- components,
- future brand products.

### 4. Gaudí / Living Threshold — architecture/geometry benchmark
Purpose:
- procedural structure,
- architectural scale,
- environmental form,
- materials,
- complex geometry,
- urban context.

Research-to-design rule:
Gaudí research must become computational operators, not trivia.

Examples:
- structural force → geometry,
- sun → shading depth,
- water → drainage geometry,
- movement → threshold/circulation form,
- material/fabrication logic → component geometry.

No research finding enters the competition model until isolated testing shows it strengthens the design.

### 5. Studio-Kona — world-scale benchmark
Purpose:
- outdoor distance,
- terrain,
- vegetation,
- water,
- locomotion,
- route streaming,
- weather,
- horizon/detail management,
- sustained memory/performance.

Do not build multiplayer or a full training-platform stack until world quality and streaming are proven.

## Project roles

### KONA.m / konam
Role: current runtime and product architecture seed.

Extract candidates:
- canonical renderer lifecycle,
- device quality policy,
- asset loading,
- evidence tooling,
- room manifests,
- authoritative storage/identity/progression boundaries.

Do not:
- rewrite around a new engine,
- create room-local renderers,
- duplicate state authorities.

### NOR // 3
Role: systems lab.

Next:
- freeze baseline visual evidence,
- verify deterministic benchmark cameras,
- test visibility/HLOD first,
- measure before/after,
- promote only measured winners.

### Beast Cave
Role: protected visual regression benchmark.

Next:
- freeze canonical cameras,
- freeze expected interactions,
- document acceptable visual variance,
- run shared-engine changes underneath without changing authorship/composition.

### Breitling
Role: product-fidelity lab.

Next:
- define room vs hero quality budgets,
- capture canonical macro cameras,
- establish material references for brushed metal, sapphire/glass, carbon, lume and dial surfaces,
- build LOD/HERO asset strategy,
- validate mobile room mode and premium desktop/macroscopic mode separately,
- target “luxury campaign fidelity inside an interactive world,” not a prettier generic showroom.

### Gaudí
Role: architectural intelligence lab.

Next:
- finish multilingual evidence map,
- derive design operators,
- isolate catenary/form-finding/environmental geometry experiments,
- only then apply proven operators to Living Threshold/Living Canopy.

### Studio-Kona
Role: scale/locomotion lab.

Next:
- define one outdoor canonical scene,
- capture current memory/load/render baseline,
- test chunking/world-partition strategy after indoor visibility experiments mature.

### Canyon Museum
Role: product truth / provenance / canonical product assets.

Next:
- strengthen one source of truth for product identity, geometry, year/model/brand, provenance, rights and component relations.
- avoid parallel runtime architecture.

### Bellagio / digital twins
Role: reconstruction lab.

Next:
- compare mesh, splat and hybrid reconstruction workflows on one controlled scene.
- measure fidelity, size, mobile feasibility and editability.

### Rawdogging / rawdog3d
Role: gameplay/persistence lab.

Extract:
- quests,
- stateful world interactions,
- progression ideas.

Do not:
- invest in a parallel renderer if shared runtime work already supersedes it.

### BlocksCreateWorld
Role: unproven candidate.

Next:
- inventory before elevating.
- no architectural dependency until unique value is demonstrated.

## First shared contracts

### AssetSpec v1
Must cover:
- canonical identity,
- semantic category,
- units/scale,
- orientation,
- geometry source,
- LOD0/1/2/HERO,
- collision,
- interaction anchors,
- materials,
- texture policy,
- product metadata,
- provenance,
- rights,
- performance budgets,
- quality tier,
- validation state.

### WorldSpec v1
Must cover:
- regions/zones,
- terrain,
- architecture,
- environment,
- objects,
- agents,
- navigation,
- interactions,
- audio,
- simulation,
- streaming boundaries,
- visibility groups,
- quality overrides,
- provenance for real-world claims.

### BenchmarkSpec v1
Must lock:
- device,
- browser/runtime,
- viewport,
- DPR,
- camera,
- warm-up,
- sample duration,
- commit SHA,
- FPS,
- p50/p95/p99 frame time,
- draw calls,
- triangles,
- material count,
- texture bytes,
- network bytes,
- time to first useful frame,
- memory where available,
- errors/context loss,
- screenshot/video evidence,
- visual-difference review,
- confidence.

## Visual quality program

Visuals improve in parallel with engineering, but through controlled evidence.

Track per benchmark:
- silhouette quality,
- edge/bevel quality,
- material plausibility,
- reflection quality,
- contact/shadow grounding,
- texture clarity,
- lighting hierarchy,
- depth cues,
- composition,
- temporal stability,
- macro legibility,
- LOD transition visibility,
- mobile readability,
- cinematic framing.

Principle:
“More polygons” is not the objective.
“More perceived fidelity per millisecond and megabyte” is the objective.

### Perceptual resolution
Allocate detail by:
- distance,
- screen size,
- motion,
- salience,
- interaction mode,
- product importance.

World mode:
- aggressive optimization.

Hero mode:
- temporarily redirect quality budget to the focal asset.

This becomes a core research theme.

## Immediate technical priorities

1. Visibility / room graph / HLOD.
   Current evidence shows world-level render cost can remain huge even after asset compression.
2. Material reuse and state-change reduction.
3. Texture strategy: KTX2/Basis modes, size vs decode vs visual quality.
4. Hero-asset LOD/HERO strategy for Breitling and bikes.
5. Deterministic benchmark capture.
6. World streaming for Studio-Kona after indoor visibility work.
7. Procedural geometry experiments from Gaudí research.

## Current evidence signals

Known from the 2026-10-04 engineering trail:
- 25 GLBs compressed from roughly 8.5 MB to 3.0 MB while validation still passed.
- packed GLBs required an unpack/decode path for Blender compatibility.
- environment capture was successfully centralized into a shared engine primitive.
- a material upgrade initially risked duplicating shared materials; memoization preserved sharing.
- representative room checks remained within budget with zero reported errors.
- one main-hall measurement was approximately 1,300 draw calls and 5.6M triangles/frame, indicating scene visibility/object-count pressure beyond pure transfer-size optimization.
- visual evidence capture under software WebGL is slow, so benchmark reproducibility and selective evidence capture need optimization.

These are engineering observations, not universal truths. Re-measure on canonical hardware/device targets before promotion.

## Research Wave 001

### EXP-001 — visibility / room graph
Hypothesis:
not instantiating/rendering non-visible rooms yields larger gains than further mesh compression in museum-scale scenes.

Measure:
draw calls, triangles, frame time, memory, TTFF, visual equivalence.

Pass:
material improvement with zero visible loss from canonical cameras.

### EXP-002 — KTX2 texture modes
Compare:
baseline JPEG/PNG vs ETC1S vs UASTC.

Scenes:
NOR + Breitling HERO.

Measure:
download, decode, VRAM proxy, frame time, visual difference, mobile stability.

### EXP-003 — hero asset quality ladder
Asset:
Breitling watch or equivalent canonical hero product.

Levels:
LOD2 / LOD1 / LOD0 / HERO.

Goal:
prove one canonical product can scale from mobile room prop to macro product presentation.

### EXP-004 — material sharing policy
Measure:
material count, program/state switches, draw calls, visual equality.

Goal:
formalize when materials are shared, parameterized or intentionally unique.

### EXP-005 — Gaudí form-finding operator
Build:
isolated catenary/funicular generator with parametric loads and constraints.

Goal:
test whether structural logic produces competition-useful geometry and a reusable architecture primitive.

### EXP-006 — reconstruction pipeline
Bellagio scene:
mesh vs splat vs hybrid.

Measure:
fidelity, load size, runtime cost, editability, mobile feasibility.

## Promotion gates

A lab result may become shared infrastructure only if:
- reproducible,
- benchmarked,
- visually reviewed,
- documented,
- no authority duplication,
- at least one real project benefits,
- regression suite remains green,
- confidence ≥ 0.85.

Confidence guide:
- 0.95+: repeated across representative devices/scenes.
- 0.85–0.94: strong controlled evidence, limited device diversity.
- 0.70–0.84: promising but incomplete.
- <0.70: research only.

## Change safety

Every shared-runtime PR must include:
- before SHA,
- after SHA,
- affected authority,
- benchmark results,
- canonical captures,
- known baseline failures,
- new failures,
- mobile portrait/landscape check,
- rollback path,
- confidence score.

Never merge visual/runtime work based only on:
- generated concept art,
- a single desktop screenshot,
- one FPS number,
- “looks better,”
- synthetic scenes alone.

## Tracking

Every work item must be one of:
- RESEARCH
- EXPERIMENT
- CORE-CANDIDATE
- PROJECT-ADOPTION
- REGRESSION
- DECISION

Every item records:
- owner/project,
- evidence,
- status,
- confidence,
- next gate.

## Near-term execution order

P0
1. Finish current KONA before/after audit evidence.
2. Freeze canonical benchmark cameras for NOR, Beast Cave, Breitling.
3. Establish BenchmarkSpec v1 draft.
4. Run EXP-001 visibility/room graph.
5. Run EXP-003 hero-product quality ladder.
6. Complete Research Wave 001 synthesis.

P1
7. Draft AssetSpec v1 and WorldSpec v1 from observed commonalities, not imagined future needs.
8. Run KTX2/material experiments.
9. Build Gaudí isolated form-finding experiment.
10. Establish Studio-Kona outdoor baseline.

P2
11. Extract the first proven shared primitive only after repeated reuse.
12. Test WebGPU paths in isolation.
13. Test hybrid digital-twin reconstruction.
14. Explore athlete-world simulation modules.

## Things explicitly not to build yet

- giant Caldas 3D monorepo,
- full engine rewrite,
- mandatory WebGPU migration,
- second primary runtime,
- multiplayer platform,
- custom CFD solver,
- hundreds of new assets before visibility/streaming is fixed,
- universal room template,
- refactor of Beast Cave for abstraction purity,
- production adoption of neural rendering before device tests,
- speculative abstractions without two concrete consumers.

## Success definition

We are winning when:
- each project gets visually better,
- each project becomes cheaper to render,
- the same engineering problem is solved once rather than repeatedly,
- research produces measurable experiments,
- failures become reusable knowledge,
- brand/product assets travel safely across experiences,
- mobile remains first-class,
- desktop can scale to cinematic fidelity,
- architectural and sports/physics knowledge improves the worlds rather than becoming decorative documentation.
