# Kona.m Technology Research Reconciliation

This document compares the external language/performance research against the actual Kona.m M0/M1 repository. It is intentionally conservative: recommendations are adopted only when they strengthen launch reliability, scalability or product seriousness.

## Executive decision

The research is directionally useful on:
- WebGL lifecycle;
- large lazy 3D bundles;
- asset optimization;
- memory/disposal;
- bundle/performance measurement;
- CI reproducibility;
- CSS specificity/cascade debt.

Several repository-specific claims are stale or inaccurate and must **not** drive launch changes.

## Actual production stack

Current web production authority:
- JavaScript / HTML / CSS;
- Three.js `0.186.1`;
- **esbuild `0.28.2`**;
- meshoptimizer;
- glTF Transform tooling;
- Node.js build/validation scripts;
- Python/Blender for deterministic 3D asset generation;
- Capacitor for Android;
- Supabase for optional account/backend functions.

### Important correction: Vite is not the current build authority

The research treats the repository as Vite-based and recommends Vite bundle tooling. The actual `web/package.json` uses esbuild and the deterministic builders in `web/build_*.mjs` / `tools/build_pages.mjs`.

Launch decision:
- **do not migrate build systems**;
- keep esbuild and current deterministic release contracts;
- use esbuild metafiles/custom bundle inspection if deeper profiling is needed later.

Changing bundlers before launch adds regression surface with no user value.

## What the research overstates

### "No tests / no CI automation"

Incorrect for current M0.

The repository already has:
- Node unit/contract tests;
- product/bike asset contracts;
- deterministic generated-output checks;
- repository hygiene;
- brand authority;
- private/secret-data scanning;
- release security;
- integration contract;
- App Release Seal;
- browser P0 journey;
- UI interaction matrix;
- Visual Evidence V2;
- Android build/emulator paths.

Decision: improve coverage only where a specific launch failure mode is not already protected. Do not chase an arbitrary percentage coverage target.

### "Missing CSP"

Incorrect as a blanket statement.

`tools/harden_pages.mjs` already generates CSP/security policy for published pages. The policy still carries compatibility allowances such as inline script and WebAssembly evaluation.

Decision:
- preserve current hardened policy for launch;
- post-launch, reduce allowances only with exact browser/WebAssembly evidence.

### "Three.js is outdated"

Incorrect for the current repo. Current dependency is `three ^0.186.1`.

Decision: no Three.js upgrade in launch migration.

### "Unminified production bundles"

Incorrect for the main production build. Canonical esbuild output is minified.

The relevant problem is **bundle size and lazy-boundary quality**, not absence of minification.

### "Draco everything"

Too broad.

The current runtime already includes meshoptimizer support and glTF optimization tooling. Blanket Draco conversion can change decode characteristics and loader/runtime requirements.

Decision:
1. keep current mobile asset contracts;
2. measure transfer size, parse/decode time, GPU memory and visual fidelity;
3. choose meshopt/Draco/texture transcode per asset class;
4. never bulk-reencode launch assets without before/after device evidence.

## What remains genuinely important

### 1. Large lazy 3D bundles

Known build outputs are approximately:
- core shell: ~223 kB;
- Race Self stage: ~665 kB;
- collectible stage: ~650 kB;
- admin preview: ~628 kB;
- hall/world: ~953 kB;
- Studio: ~785 kB;
- Experiences: ~799 kB.

Interpretation:
- the shell is intentionally lighter;
- large Three.js-heavy bundles are mostly deeper/lazy experiences;
- a generic "every script <500 kB" threshold is not the right launch contract.

Launch contract:
- **no Three.js on the basic 2D shell before explicit intent**;
- no accidental movement of world/Studio dependencies into `app/kona-core.js`;
- preserve lazy boundaries;
- any bundle growth requires explanation.

Post-launch optimization:
- inspect esbuild module contribution;
- split only at user-meaningful boundaries;
- avoid duplicating Three.js in concurrently loaded bundles where possible.

### 2. Renderer lifecycle consistency

Newer embedded renderers are stronger than older page-lifetime engines.

Reference pattern:
- DPR cap;
- hidden/occluded pause;
- ResizeObserver;
- explicit resource disposal;
- context release where appropriate;
- graceful WebGL fallback.

Do not rewrite all renderers before launch.

Post-launch order:
1. collectible stage hidden guard;
2. legacy Hall/Heritage/Experiences hidden-tab behavior;
3. draw-call/triangle budgets;
4. culling/LOD/shared geometry;
5. long-session physical-phone thermal testing.

### 3. `landing.js` structural debt

The world runtime remains a large mixed-responsibility module.

Decision:
- no broad M1 refactor;
- after identity/deployment is stable, extract one seam per PR:
  1. room construction;
  2. movement/navigation;
  3. interaction selection;
  4. presentation/cards;
  5. lifecycle/visibility.

Every extraction requires browser/visual equivalence.

### 4. CSS cascade debt

The token/theme/typography authorities are strong and align closely with the master brand strategy.

The legacy mobile Hall layer remains specificity-heavy, including a large number of `!important` rules.

Decision:
- preserve during launch;
- do not copy that pattern into Kona.m consumer features;
- reduce conflict by ownership clusters after launch, not by bulk formatting.

### 5. Binary estate

The repository includes substantial 3D/image history. That is not equivalent to initial transfer cost because assets are not all loaded at launch.

Decision:
- continue exact-hash duplicate inventory;
- preserve public/provenance paths during migration;
- post-launch dedupe only exact duplicates after verifying cache/build/source implications.

## Languages: what to keep

### JavaScript

Keep as the primary consumer/runtime language.

Why:
- native browser execution;
- existing Three.js ecosystem;
- excellent current test/build coverage;
- migration cost of framework/language rewrite is unjustified.

Improve:
- clearer module boundaries;
- shared contracts;
- data-driven configuration;
- fewer duplicate state authorities.

### TypeScript

Use selectively where it has leverage:
- public data contracts;
- Supabase/edge APIs;
- new complex service boundaries;
- generated schemas.

Do **not** pause launch for a repository-wide JS→TS rewrite.

### Python / Blender

Keep for deterministic asset generation and validation.

Improve:
- version-pin Blender/tool expectations;
- deterministic inputs/outputs;
- validation manifests;
- CI for generators that matter to production.

### CSS

Keep plain CSS with semantic tokens.

Do not introduce CSS-in-JS/framework styling during launch.

### Rust / WebGPU / native game engines

Not launch work.

They may become research tracks only if measured browser/WebGL ceilings become product blockers.

## Metrics that matter more than fashionable thresholds

Launch:
- guest-to-useful-action success;
- first 2D shell load;
- no unintended 3D requests before intent;
- P0 journey completion;
- control reachability on 320/390/short landscape;
- exact generated-output integrity;
- state return after reload;
- bundle budget regression;
- error-free WebGL fallback.

Physical-device performance:
- target around 50+ fps when practical;
- never accept sustained <30 fps in core interactive scenes;
- background renderer cost should drop to zero/no-op;
- monitor memory/thermal behavior over longer sessions.

Do not claim "60 fps guaranteed on all mobile devices."

## Launch recommendations accepted from research

1. Keep bundle-size reports and explicit budgets.
2. Add deeper bundle attribution after M1 using esbuild-native tooling.
3. Continue GLB validation/compression experiments with measured before/after.
4. Keep physical-device performance evidence separate from headless evidence.
5. Converge Node CI major versions after identity migration.
6. Continue renderer cleanup one bounded surface at a time.
7. Continue secret/dependency audits and RLS review.

## Recommendations explicitly rejected for launch

- migrate to Vite;
- rewrite UI in React/Vue/Svelte;
- full TypeScript conversion;
- blanket Draco conversion;
- WebGPU migration;
- Rust/WASM rewrite;
- 70–80% coverage target as a release criterion;
- broad ESLint/Prettier churn across historical files;
- mass CSS cleanup;
- dependency-major upgrades bundled with migration.

## Principle

Kona.m becomes state-of-the-art by making each boundary measurable and owned, not by collecting more technology.
