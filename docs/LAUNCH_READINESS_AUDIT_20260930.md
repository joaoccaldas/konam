# Launch Readiness Audit — 2026-09-30

## Scope

This audit covers the current public production baseline plus the active integration, product-intake, and asset lanes.

Production main:
- `869b5535` — Setup Slot Compatibility V0

Active green lanes:
- `feat/integration-platform-v1-20260930` — latest audited `e488d7ac`
- `feat/product-intake-proof-v0-20260930` — latest audited `cb313529`

Asset lane:
- `assets/kona-environment-pack-20260930` — currently diverged and not merge-ready as a whole

Secondary repo:
- `joaoccaldas/ai` contains WYLD/Bike Porn and other studio projects; Bike Porn ceremony/model-viewer cleanup merged as PR #84.

---

# Executive verdict

## Existing Canyon Museum on main

**Launchable today as an experimental public web/PWA museum.**

Evidence:
- Museum checks PASS
- App release seal PASS
- GitHub Pages deployment PASS
- production deploy PASS
- browser/PWA integrity model in place
- Android smoke-test workflow exists
- local-first data model
- no required account
- no analytics/tracking in runtime
- CSP + leak guard
- deterministic page generation
- stable RaceSetup V0 contract

## Broader KONA app / Event OS vision

**Not yet ready for a public beta launch as one cohesive consumer app.**

Main blockers:
1. information architecture still museum/studio-centric rather than one unified mobile app shell;
2. visual fidelity is inconsistent across old assets, candidate assets, and newer engineering batches;
3. product-intake pipeline is green, but only two candidate products have passed the browser proof;
4. integration platform remains isolated from production main;
5. asset factory branch is diverged and repository-wide Museum checks are red there;
6. Race Week NOW / Event OS UI is still architecture/roadmap, not production;
7. Product Experience aggregation exists, but no unified production UI consumes it yet;
8. no full beta telemetry/feedback/crash-observability plan has been implemented;
9. Android release signing cannot be assumed from repository evidence alone;
10. dependency vulnerability audit is not currently a CI gate.

---

# Codebase architecture

## Strong

### Data-driven systems
- products/catalogues are generated from structured sources;
- room/wing engine exists;
- skins/liveries are data-driven;
- RaceSetup is brand-agnostic;
- candidate product/component/rider-interface intake is schema-based;
- public catalog, graph, story, maintenance, commerce and event source contracts exist on the integration branch.

### Stable domain boundaries
- RaceSetup domain is separate from localStorage adapter;
- compatibility is type/capability driven, not brand driven;
- integration layer does not require Studio internals;
- public MCP/read adapter is read-only;
- candidates are not exposed through the public MCP surface.

### Release engineering
- deterministic page build;
- rebuild drift check;
- asset contract;
- atomic SHA-256 service-worker release seal;
- production Pages allowlist;
- leak guard;
- Android emulator smoke test.

## Weak / needs refactor

### `web/src/landing.js` monolith
Current size is roughly 150 KB and it still owns too many responsibilities:
- world construction;
- loading;
- navigation;
- passport hooks;
- routing/tours;
- cards;
- exploded parts;
- sharing;
- movement.

This is the largest structural debt in the runtime.

**Action:** split by domain:
- world/runtime lifecycle;
- visitor/navigation;
- exhibits;
- tour;
- interaction/picking;
- product experience;
- state/progression.

### Duplicate/parallel state systems
There is still overlap among:
- profile;
- passport;
- finds;
- coach/tutorial flags;
- RaceSetup.

The profile export/delete path handles some legacy keys, but Passport remains its own rich state store.

**Action:** introduce one local AppState registry/migration layer before adding cloud sync.

### Older room implementations
Some legacy rooms remain hand-coded while newer growth work is data-driven.

**Action:** continue porting hand-built rooms to room/wing schema before room count expands aggressively.

---

# Data quality and provenance

## Ready

- source/evidence classification exists;
- current public products have stable IDs;
- public event source freshness model exists;
- current vs prior-year event data can be separated;
- candidate assets preserve representation/readiness/blockers;
- manufacturer sources are attached to maintenance/component records;
- openly licensed media provenance policy exists.

## Not ready

- asset lane contains multiple fidelity levels that must not be flattened into one public quality class;
- POC helmet remains provisional;
- historic Nike archive needs careful per-product source/provenance review;
- some full third-party vendor HTML snapshots live in the public repository.

### Public-repo cleanup
There are 6 saved Canyon product pages under:
`assets/reference/prices-se/`
Total: roughly 1.38 MB.

They are excluded from deployment, which is good, but they should still be removed from the public repo or replaced with:
- URL;
- retrieval date;
- extracted price/spec fields;
- hash/snapshot metadata if legally necessary.

Do not keep full third-party HTML unless there is a clear archival/legal reason.

---

# Safety and security

## Strong

### CSP
Hardened pages include:
- `default-src 'self'`
- restricted script/style/font/image/connect origins
- `object-src 'none'`
- `base-uri 'self'`
- `form-action 'none'`

### Leak protection
Pages deployment checks for:
- local filesystem paths;
- consumer email addresses;
- common API key/token formats;
- saved Demandware/third-party page leakage;
- Cloudflare analytics artifacts.

### Service worker integrity
- SHA-256 hashes for every sealed asset;
- core update installs atomically;
- heavy assets are integrity-checked before caching;
- failed release does not replace last known-good app.

### Android
- cleartext traffic disabled;
- WebView debugging disabled;
- backups disabled;
- only INTERNET permission declared;
- signing secrets referenced only through CI environment.

### Secret scan
Manual repository queries found no:
- private key block;
- Gmail address;
- Bearer token;
- API-key field;
- committed GitHub PAT;
- committed AWS key.

The apparent `ghp_`, `AKIA`, and `sk-` search matches come from the leak-guard regex itself or third-party saved HTML, not confirmed credentials.

## Needs work before broad beta

1. add automated secret scanning as a dedicated CI job, not only deploy-stage grep;
2. add dependency vulnerability scanning for both:
   - `web/package-lock.json`
   - `app/native/package-lock.json`
3. remove public third-party HTML snapshots;
4. verify release keystore is configured before distributing Android APK as a real beta;
5. consider removing `unsafe-inline` from CSP over time by hashing/noncing inline code;
6. add SRI/self-hosting policy for any future third-party scripts;
7. document security-contact/reporting channel.

---

# Privacy

## Ready

- no required account;
- no runtime analytics;
- no cookies/tracking layer;
- profile stored locally;
- RaceSetup stored locally;
- Passport stored locally;
- user can export profile data;
- user can delete profile/legacy state;
- no background location;
- no unnecessary Android permissions.

## Needs work

### One privacy control surface
User data is currently spread across several localStorage keys.

Before beta:
- one "Your data" screen should enumerate all app-owned stores;
- one delete-all action must clear every current store;
- one export should include every current store;
- privacy copy should describe Passport, finds, setups, favourites and settings consistently.

### Passport portability
Passport export/import is base64, not encryption.

That is fine, but UI copy must continue to avoid implying privacy/security beyond portability.

---

# Logic / domain integrity

## Ready

### RaceSetup
- schema versioned;
- product IDs validated against catalog;
- malformed shared state rejected;
- oversized payload rejected;
- unsupported product types rejected;
- unsupported scenes normalized/rejected;
- no brand-specific behavior;
- compatibility gates;
- persistence adapter separated.

### Product intake
Latest green proof:
- Cervélo P5 Disc MK2
- Nike Alphafly 3
- exact GLB integrity;
- no RaceSetup changes;
- no brand-specific runtime code;
- mobile/browser proof PASS;
- normal Museum checks PASS.

### Integration platform
Latest audited head:
- Integration contract PASS
- Museum checks PASS
- public catalog
- knowledge graph
- event source freshness
- read-only MCP prototype
- maintenance
- commerce
- Product Experience aggregation
- candidate promotion gates
- TechRoom/Story schemas

## Not ready

- integration platform is not yet merged to production;
- candidate promotion is still build-time/manual, not one canonical automated promotion command;
- component compatibility only works where bike interface metadata exists;
- RaceSetup does not yet expose all future component categories;
- event NOW logic is not yet production UI;
- affiliate tracking must remain off until actual program approval.

---

# Rendering and graphics

## Ready

- progressive loading;
- device quality presets;
- DPR caps;
- mobile/light geometry mode;
- shadow disabling in low mode;
- room visibility/culling work;
- deferred candidate loading;
- measured GLB size gates;
- Blender source/build pipelines;
- visual smoke infrastructure exists.

## Not ready

### Consistent fidelity
The app currently mixes:
- highly polished Canyon hero models;
- older Atlas/history models;
- geometry studies;
- provisional assets;
- engineering visualization.

Before beta:
- define Hero / Museum / Engineering Study / Internal quality tiers;
- only Hero/Museum objects appear in normal public Explore;
- studies require a visible study/provisional badge.

### Visual QA
Visual gates are not yet universal.

Need one reusable QA workflow that captures for every public GLB:
- front;
- side;
- rear;
- three-quarter;
- close-up;
- assembled/exploded where relevant;
- mobile framing;
- dimensions/scale;
- source overlay where possible.

---

# Mobile UI / UX

## Ready

- mobile viewport testing exists;
- Setup action footer now stays reachable;
- safe-area handling exists;
- responsive layouts exist;
- map/teleport reduces navigation friction;
- share/deep-link system exists.

## Not beta-ready yet

The actual product UI still lacks one coherent app-level information architecture.

Current experience is powerful but fragmented among:
- museum;
- Studio;
- collection;
- experiences;
- Passport;
- Kona content.

The target beta shell should converge on:
- Now
- Explore
- Setup
- Plan
- Me

The Museum should be a major Explore destination, not the entire navigation model.

---

# Commerce and affiliates

## Architecture ready

- CommerceOffer schema;
- conversion-event schema;
- disclosure rules;
- editorial-independence rule;
- safe ordinary-vendor-link path;
- affiliate priority registry.

## Not production-ready

- no affiliate program should be treated as active until Caldas Studio is accepted;
- no real tracking IDs should live in the public repo;
- pricing/availability require freshness metadata;
- no checkout;
- no server-side conversion callback;
- no commercial telemetry.

Beta can safely include:
- official brand product links;
- official dealer locators;
- clearly disclosed approved affiliate links once available.

---

# Event OS / Kona

## Data foundation ready

- Kona 2026 event object;
- current-source registry;
- source-year freshness rules;
- official Expo schedule data;
- island guide;
- places;
- Event OS roadmap.

## Not beta-ready

- no single production "NOW" surface;
- race-week current data is not yet a primary mobile home experience;
- no official live timing integration;
- no official alerts/closures feed;
- 2025 guide/course map must remain reference-only until 2026 equivalents are verified.

---

# Platform scalability

## Proven

Two important scaling proofs now exist:
1. a non-Canyon bike enters the generic rendering/compatibility path;
2. a shoe enters the same system without turning the app into a bike-only architecture.

Brand-specific runtime changes: zero in the intake proof.

## Next proof

The next generic proof should be a reusable component:
Shimano cassette:
`inspect -> explode -> part -> explain -> compatibility -> maintenance -> official vendor`.

Then Zwift Lab should prove:
hardware + software + compatibility + support + commerce
using the same primitives.

---

# Launch matrix

## READY NOW — existing Canyon Museum public release

- [x] public Pages deployment
- [x] deterministic build
- [x] unit tests
- [x] bike asset contract
- [x] release seal
- [x] offline/PWA update integrity
- [x] local-first profile
- [x] local RaceSetup V0
- [x] share/deep links
- [x] mobile Setup reachability
- [x] CSP
- [x] deploy leak guard
- [x] no analytics/tracking
- [x] no required account
- [x] disclaimer / unofficial-project labeling
- [x] current main deploy jobs green

## READY FOR CONTROLLED INTERNAL / FRIEND BETA

- [x] current Canyon Museum main
- [x] My Kona Setup V0
- [x] product-intake proof for Cervélo + Alphafly
- [x] integration platform as isolated test branch
- [x] candidate asset QA exploration
- [x] experimental maintenance/vendor flows

Conditions:
- label the app beta/experimental;
- do not imply partner endorsement;
- do not enable affiliate tracking until approved;
- do not merge asset branch wholesale.

## NOT READY FOR OPEN PUBLIC KONA APP BETA

- [ ] unified mobile app shell
- [ ] Now / Explore / Setup / Plan / Me production IA
- [ ] universal visual asset quality gate
- [ ] coherent brand system across pages
- [ ] Product Experience production sheet
- [ ] Kona NOW / race-week home
- [ ] single privacy/data-management screen
- [ ] dependency vulnerability CI
- [ ] dedicated secret scanning CI
- [ ] verified stable Android release signing
- [ ] real user onboarding/usability test
- [ ] crash/error observability strategy
- [ ] beta feedback loop
- [ ] accessibility audit beyond basic keyboard/touch checks
- [ ] performance budgets enforced across every public room
- [ ] integration platform merged safely
- [ ] candidate promotion workflow finalized
- [ ] asset branch reconciled to current main

## NOT READY FOR COMMERCIAL/ORGANIZER LAUNCH

- [ ] approved affiliate accounts
- [ ] conversion attribution implementation
- [ ] sponsor disclosure system in production UI
- [ ] organizer data rights / timing integrations
- [ ] partner branding controls
- [ ] legal review of trademark/brand presentation
- [ ] terms/privacy policy for any future accounts/telemetry
- [ ] support/incident response process

---

# Recommended release sequence

## Gate 1 — Technical beta foundation
1. merge Product Intake proof;
2. merge Integration Platform V1 after final review;
3. create canonical local AppState/data-management screen;
4. add secret/dependency CI;
5. remove third-party HTML snapshots.

## Gate 2 — Consumer beta UX
1. build one mobile shell: Now / Explore / Setup / Plan / Me;
2. create unified Product Experience sheet;
3. create Kona NOW;
4. apply one shared design system across Museum / Studio / Plan / Me;
5. enforce public asset fidelity tiers.

## Gate 3 — Controlled beta
1. 10–25 testers;
2. first-session task test;
3. Samsung + iPhone + desktop coverage;
4. record task completion, errors, heat/battery/performance manually or via explicit opt-in diagnostics;
5. fix top 10 usability failures.

## Gate 4 — Public beta
Only after:
- no P0 crash/render/navigation bugs;
- 90%+ task completion for first-session flow;
- stable Android signing;
- accessible/privacy controls;
- current Race Week data;
- hero visuals at consistent quality.

## Gate 5 — commercial pilots
- Zwift Lab;
- IRONMAN Museum/Event OS;
- one approved affiliate product flow;
- one partner embed.

---

# Final launch classification

**Canyon Museum V0:** GO.

**Controlled KONA alpha / friends-and-family beta:** GO, with explicit beta labeling.

**Open public KONA beta:** NO-GO today.

**Commercial/partner launch:** NO-GO today.

The main remaining gap is not foundational engineering. It is convergence:
one app shell, one visual system, one state/privacy surface, and one release-quality content bar.
