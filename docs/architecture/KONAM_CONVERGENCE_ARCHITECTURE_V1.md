# Kona.m convergence architecture v1

Status: executable program.  
Authority: KONA.m Unified Master Brand Strategy + current `konam/main`.  
North-star proposition: **Race the version of yourself you haven't met yet.**

## 0. Operating rule

Kona.m is a quiet, fast interface over a deep world. Existing capabilities are reused before new ones are created. A migration is not complete until the duplicate authority is removed.

Every PR answers:
1. What user moment becomes better?
2. What existing authority is reused?
3. What does the change cost in JS, GPU memory, triangles, draw calls, textures and frame time?
4. What old implementation can be deleted after parity?
5. Which brand, privacy, accessibility and release gates prove the result?

## 1. Immutable product and brand constraints

- Preserve the proposition: **Race the version of yourself you haven't met yet.**
- Preserve the principle: **Quiet interface. Dramatic moments. Rich world when chosen.**
- The design authority is `brand/tokens.css`, `brand/themes.css`, and `brand/typography.css`, aligned to the approved master strategy.
- Use Instrument Serif for editorial/display, Manrope for UI/body, monospace for data, Caveat only for human notes/Intern voice.
- Canonical primary palette: lava #080B0E, basalt #282F36, sand #F4EFE7, mist #E6E9ED, ocean #00A7C7, sunrise #FF6A00, ember #FF833D, lime #C7F300, hibiscus #FF2D6D, lilac #A876FA, success #2BBF88.
- Minimum touch target: 48px.
- Spacing: 4/8/12/16/24/32/48/64. Radii: 12/20/24/999px.
- No new public surface may introduce a parallel visual system.
- 3D is optional depth, not an entry tollbooth.
- Local-first remains useful without an account.
- No pay-to-win progression or reward for affiliate clicks/sharing taps.

## 2. Desired product shape

The domain model may remain deep, but visibility is progressive.

### Fresh user
Landing -> Now.

### After first meaningful discovery
Now + Discover.

### After identity is created
Now + Discover + You.

### After equipment is collected/configured
Now + Discover + Garage + You.

### With active race context
Now + Discover + Garage + Race + You.

The existing Home/Discover/Garage/Plan/Me routes remain canonical. The visibility policy changes, not the domain architecture.

## 3. Delivery waves

### Wave 0 — Authority freeze and measurable contracts
Goal: prevent further drift before refactoring.

Deliver:
- brand contract and CI assertions;
- performance budget contract;
- design-system docs reconciled to runtime tokens;
- architecture plan in-repo;
- no user-visible redesign.

Exit:
- `npm test --prefix web` green;
- brand authority test green;
- no open contradiction between tokens and design-system docs.

### Wave 1 — First-use simplification
Goal: value before explanation.

Deliver:
- entry keeps the core line and one dominant CTA;
- remove automatic multi-step tour from first use; retain Help/Replay;
- use contextual progressive disclosure;
- reuse PR #46 Kona Now / first-bike / return hooks;
- progressively reveal nav destinations based on canonical state.

Exit:
- fresh user can reach useful Home/Now content without account or 3D;
- no more than one primary CTA per first-session surface;
- 48px touch targets and safe-area validation on 390x844 and 844x390.

### Wave 2 — Unified renderer kernel
Goal: one rendering authority.

Create `web/src/render/`:
- `renderer.js`
- `quality.js`
- `lighting.js`
- `environment.js`
- `materials.js`
- `post.js`
- `resources.js`
- `telemetry.js`

Canonical defaults:
- Three.js WebGLRenderer;
- AgX tone mapping for product/machine surfaces;
- shared PMREM/environment;
- one principal shadow caster;
- adaptive DPR;
- post-processing only by quality tier;
- page-visibility pause;
- render-on-demand when idle where possible.

Migrate one viewer first, prove visual parity, then port the remaining viewers. Do not perform a flag-day rewrite.

### Wave 3 — Device-adaptive quality
Goal: visual intent survives every device.

Replace pointer/viewport-only quality decisions with capability scoring using:
- deviceMemory when available;
- hardwareConcurrency;
- physical viewport;
- DPR;
- WebGL limits;
- reduced-data / reduced-motion;
- measured moving average frame time.

Tiers:
- ECO
- BALANCED
- HIGH
- ULTRA

Quality may adapt during runtime. UI remains full-resolution while the 3D canvas changes DPR.

### Wave 4 — World performance architecture
Goal: make the island scale.

Implement:
- room graph visibility;
- current/adjacent/distant room states;
- predictive portal loading;
- shared geometry;
- InstancedMesh for repeated props;
- merged static room geometry by material;
- robust ResourceManager with reference counting;
- streaming-policy integration;
- deterministic disposal.

Target runtime behavior:
- current room: room/hero LOD;
- visible adjacent: proxy/museum LOD;
- one hop away: architecture silhouette only;
- two hops away: unloaded.

### Wave 5 — KONA_ASSET_SCHEMA_V2
Goal: turn assets into reusable physical knowledge.

Every asset records:
- canonical id/category;
- source/provenance/rights;
- real dimensions and units;
- orientation/pivot;
- runtime LODs;
- texture/material sets;
- interaction/animation;
- attachment anchors;
- assembly hierarchy;
- collider;
- room memberships;
- GPU/payload budget;
- QA state.

Bike-specific semantics remain compatible. Existing assets migrate incrementally.

### Wave 6 — Master/runtime asset separation
Goal: maximum fidelity without punishing phones.

Authoring truth:
- high-resolution Blender masters;
- real tolerances where evidence supports them;
- 4K/8K authoring textures when useful.

Runtime derivatives:
- LOD0 hero: approximately 80k–250k tris;
- LOD1 room: 30k–80k;
- LOD2 proxy: 8k–25k;
- LOD3 far/impostor: 1k–5k.

Use meshopt and KTX2/Basis. Browser never downloads the Blender master.

### Wave 7 — World as data
Goal: finish the architecture already started.

Port remaining hand-built hall/theme rooms into canonical room/exhibit manifests and shared builders. Preserve proven layouts while moving executable variation into data.

Delete the old room implementation only after:
- screenshot parity;
- interaction parity;
- walkability parity;
- performance improvement.

### Wave 8 — State convergence
Goal: one game/user truth.

Converge legacy passport/finds/raceSetup/garage compatibility behind a versioned UserState facade:
- identity;
- races;
- equipment;
- progression;
- discoveries;
- preferences;
- sync metadata.

Migrations remain deterministic. Old physical keys are removed only after migration evidence.

### Wave 9 — Experience Director
Goal: reveal the deep world at meaningful moments.

Start deterministic, not LLM-dependent:
- current user state;
- active race;
- recent actions;
- unlocked rooms;
- return journey;
- surprise policy;
- event timing.

Output: next meaningful moment.

AI may later rank or explain options, but it must not become the source of factual truth or progression authority.

## 4. Rendering budgets

These are engineering targets, not visual-design substitutes.

### ECO
- visible triangles <= 180k
- draw calls <= 80
- texture GPU target <= 100 MB
- DPR 0.75–1.0
- one low-cost shadow caster
- no expensive AO

### BALANCED
- visible triangles <= 350k
- draw calls <= 110
- texture GPU target <= 160 MB
- DPR 1.0–1.35
- 1024 shadow map
- selective AO only

### HIGH
- visible triangles <= 650k
- draw calls <= 160
- texture GPU target <= 300 MB
- DPR 1.25–1.75
- 2048 shadow map
- GTAO where frame budget permits

### ENGINEERING INSPECTION
- higher geometry permitted for one dominant hero object;
- surrounding world aggressively simplified or suspended.

Frame-time controller:
- sustained headroom may raise quality;
- sustained >20 ms lowers DPR/effects;
- sustained >24 ms disables expensive AO;
- sustained >28 ms reduces shadows/LOD;
- hidden document pauses rendering and animation.

## 5. Lighting/material contract

Canonical rigs:
- Museum neutral: ~4500K key + ~6500K edge + soft fill.
- Engineering: ~5000–5500K broad clinical light.
- Hero: ~3200K warm key + ~6500K cool rim + deep basalt environment.

The room owns cinematic light. GLBs remain predominantly neutral.

Canonical material library must cover at least:
- UD / 3K twill / forged carbon;
- matte/gloss/raw carbon clearcoats;
- aluminium variants;
- titanium;
- polished stainless/machined steel;
- rubber/foam/TPU/nylon;
- basalt/asphalt/concrete/timber/glass.

Do not model detail that belongs in normal/roughness maps.

## 6. Performance CI

Each representative 3D scene emits a receipt:
- triangles;
- draw calls;
- textures;
- estimated texture memory;
- geometries;
- materials;
- first interactive time;
- median and p95 frame time for bounded browser smoke.

Budgets fail CI only for deterministic hard limits. Frame-time evidence can initially be advisory until runner variance is characterized.

Representative scenes:
- landing hero;
- Garage hero;
- Queen K hall;
- one heavy themed room;
- machine engineering inspection.

## 7. Safety, privacy and integrity

- Preserve PR #46's privacy-minimal analytics boundary.
- Never put health data, account identity, email, precise location, free-text feedback or private correspondence in analytics.
- No credentials/secrets in repo or generated public surfaces.
- Every external factual/content claim retains provenance.
- Real manufacturer assets need explicit rights/provenance classification.
- No asset labelled accurate without dimensional/reference evidence.
- Partner/commercial capability does not imply a signed partnership.
- Safety/weather/event warnings override humorous Intern tone.
- Every release uses exact-SHA evidence, not "works on my branch" claims.

## 8. Accessibility

Required:
- 48px touch targets;
- keyboard access;
- visible focus;
- safe areas;
- semantic dialogs;
- no hover-only action;
- text scaling;
- reduced motion;
- non-3D route to essential content;
- direct/list/map access to anything essential that can also be reached spatially.

## 9. Test and release matrix

Every material change:
- unit tests;
- data/schema contracts;
- build determinism;
- privacy/public-surface scan;
- browser portrait 390x844;
- landscape 844x390 where relevant;
- tablet;
- desktop 1440x900;
- light/dark where relevant;
- overflow/safe-area test;
- visual evidence;
- exact-SHA deployment smoke.

Release candidates additionally require physical iOS/Android validation before store-readiness claims.

## 10. PR sequencing

Keep PRs bounded and reversible:

1. **A0 Brand + performance authority** — contracts, docs, tests.
2. **A1 Progressive shell** — reveal policy; preserve routes.
3. **R0 Renderer kernel** — no world behavior change.
4. **R1 Adaptive quality** — frame-time driven DPR/effects.
5. **W0 Room visibility** — culling/streaming only.
6. **W1 Shared geometry + instancing**.
7. **A2 Asset schema v2**.
8. **A3 LOD/KTX2 pipeline pilot** on a small asset cohort.
9. **W2 Port one legacy room to data**, prove parity, then repeat.
10. **S0 UserState convergence**.
11. **X0 Experience Director deterministic v1**.

Never combine product-flow, renderer-core, state migration and room rewrite in one PR.

## 11. Definition of done

Kona.m is converged when:
- the first screen is fast and unmistakably Kona.m;
- useful content appears before heavy 3D;
- the world reveals progressively;
- every consumer surface uses canonical brand primitives;
- one renderer kernel owns graphics quality;
- room loading is graph/intent driven;
- representative mobile scenes stay within budgets;
- assets are semantically reusable;
- state has one authority;
- old duplicate implementations are deleted after parity;
- exact-SHA CI and real-device evidence support release claims.

The desired result is not more features. It is **a smaller visible product backed by a stronger, deeper platform**.
