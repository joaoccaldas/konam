# Kona.m Launch Truth & Master Plan Reconciliation

Status: **launch authority** for the migration from KONA/Canyon Museum into Kona.m.

This document reconciles the 112-page master brand/business strategy, the language/technology audit, and the actual M0 repository. It deliberately favors launch truth, scalability, evidence and maintainability over impressive but unimplemented claims.

## 1. What the master plan gets right

Keep these as canonical product direction:

- **Kona.m is the master product; Canyon Museum becomes a collection/wing inside it.**
- **Simple surface, deep world underneath.**
- **14 founding rooms × 10 objects + The Point Six = 141.**
- **28 canonical rooms: 14 founding + 14 progressive.**
- **Commerce comes after curiosity; never gate core discovery/safety behind payment.**
- **Local-first remains the default; account sync remains optional.**
- **One responsive product across phone/landscape/desktop.**
- **Editorial serif + restrained UI sans + data mono + sparse handwritten accent.**
- **Sand / lava / ocean / sunrise token system.**
- **Brand/athlete/event experiences should be data/config driven, not production forks.**
- **Canyon Museum remains the strongest proof of the machine/engineering side of Kona.m.**

## 2. Launch-critical corrections

These are not optional editorial tweaks. Public product/docs must not state them as current facts until implemented and evidenced.

### A. Partnerships are concepts until contracted

Do **not** call Nike, Lionel Sanders, Zwift, Canyon or any other third party a sponsor/partner unless a real agreement exists.

Launch wording:
- "independent engineering study"
- "concept activation"
- "possible partner room"
- "reference-backed exhibit"

Never:
- "sponsored room"
- "official partnership"
- "certified by [brand]"
unless true and documented.

### B. Current state is localStorage, not an invented cryptographic passport

Current source uses the canonical `kona.*` localStorage adapter with legacy `speedmax.*` compatibility and optional Supabase account backup.

Launch must not claim:
- IndexedDB when the state is localStorage;
- a cryptographic guest seed/passport unless actual cryptographic identity exists;
- NFC membership/card functionality unless shipped.

"Local-first profile/passport" is accurate.

### C. Physical-device evidence must be named honestly

Headless Chromium matrices are browser/device-size evidence, not physical-device certification.

Launch claims:
- browser automation: yes;
- physical Android/iPhone: only after real device acceptance evidence exists.

### D. Founding rooms are open; contents progress

The master document contains a contradiction:
- one section says all 14 founding rooms are open on day one;
- another level matrix locks rooms 2–14 progressively.

Canonical Kona.m decision:
- **all 14 founding rooms are accessible from launch;**
- discoveries, quests, objects and deeper states reveal progressively;
- rooms 15–28 are progressive.

Do not reintroduce a linear "Level N = Room N" gate.

### E. The Founding 141 is not 141 museum-quality 3D models at launch

Production reconciliation is the authority, not aspirational tables.

Representation hierarchy:
1. reuse verified existing asset;
2. Next100 candidate after provenance/visual QA;
3. editorial/story card;
4. environmental effect;
5. simple procedural prop;
6. source-first;
7. new high-fidelity 3D only when the experience genuinely needs it.

### F. Hawaiian culture is not a costume system

Do not ship "sacred Hawaiian archetypes" or assign users to deities/cultural figures as generic avatar classes without qualified cultural review and a clear reason.

For launch:
- keep avatar archetypes culturally neutral;
- use Hawaiʻi place names, history and cultural material only with sourced, respectful editorial context;
- never turn sacred/restricted objects into collectible props.

### G. Do not sell scientific precision we do not have

Avoid public claims such as:
- sub-millimeter exact geometry;
- real-time Navier-Stokes/CFD;
- exact CdA/watt savings;
- official athlete telemetry;
- certified compatibility;
unless derived from a documented model/data source with known uncertainty.

Prefer:
- "geometry study"
- "first-order estimate"
- "illustrative aero comparison"
- "source-backed specification"
- "concept simulation"

## 3. Visual direction: adopt vs park

### Adopt for launch

The strongest visual direction is the **quiet editorial system already in production**:
- warm sand surfaces;
- dark volcanic alternate mode;
- Instrument Serif used for meaning rather than every label;
- Manrope for UI;
- orange/sunrise reserved for forward actions;
- ocean cyan for discovery/focus;
- large negative space;
- image/3D-led hero moments;
- thin, crisp borders;
- limited card chrome.

This is consistent with the live Home/Discover/Garage screens and is more credible than a generic game HUD.

### Park for post-launch / partner prototypes

The glossy sci-fi partner-pavilion mockups are valuable sales material, not the baseline consumer UI.

Do not restyle the whole app to match:
- neon command centers;
- giant sponsor signage;
- dense telemetry walls;
- cinematic cockpit dashboards.

Use those deliberately inside a partner room or special event when the content justifies it.

### Onboarding

Do **not** build the full Mauna Kea cinematic flyover for launch.

Launch onboarding should remain:
- fast;
- skippable;
- useful as guest;
- 2–4 short cards;
- one optional personalization sequence;
- lightweight enough that no 3D is required before intent.

A cinematic flyover is a post-launch delight experiment only if retention evidence justifies its weight.

## 4. Technology/language audit: what is actually true

Current production web build uses:
- JavaScript;
- Three.js/WebGL;
- **esbuild**;
- Node.js tooling;
- CSS/HTML;
- Python/Blender asset tooling;
- TypeScript in selected backend/native surfaces;
- Capacitor for Android;
- Supabase for optional account/backend capabilities.

The external language audit incorrectly frames Vite as the active production build authority. **Do not migrate to Vite for launch.** The repository has a deterministic esbuild-based production pipeline with exact-SHA checks. Changing bundlers now adds risk without launch value.

Likewise, do not introduce Rust, WebGPU, React, a full TypeScript rewrite or a new game engine during launch migration.

## 5. Performance/scalability policy

The goal is not "rewrite because a file is large."

Launch rules:
- preserve lazy 3D loading;
- preserve consumer shell without Three.js before explicit world/stage intent;
- keep deterministic bundle budgets;
- cap mobile DPR;
- pause/no-op expensive rendering while hidden/occluded;
- dispose embedded renderers cleanly;
- no new full-resolution model families on initial load;
- optimize the large world through culling/LOD/shared geometry after M1, with before/after physical-device evidence.

Large `landing.js` is structural debt, but decomposing it during the identity migration would reduce causal clarity. Refactor it only after Kona.m identity/origin is stable.

## 6. Launch scope

### Must ship before public Kona.m launch
- M0 equivalence proven and merged;
- consumer name = Kona.m;
- canonical origin/deployment authority defined;
- guest path works;
- optional account works;
- Home / Explore / Gear / Race / You routing works;
- all 14 founding rooms can be entered;
- collection state and room IDs are stable;
- a meaningful launch subset of the 141 is obtainable;
- save/return works;
- source/provenance/disclosure language is honest;
- security/release exact-SHA gates are green;
- physical-device status is stated honestly.

### Must not block launch
- 141 bespoke GLBs;
- all 28 rooms implemented;
- Strava;
- trading;
- marketplace;
- NFC;
- native iOS store release;
- AI copilot;
- CFD;
- Zwift world;
- paid subscription;
- physical merchandise;
- partner deals.

## 7. Business seriousness rule

The public product should feel ambitious because it is **specific and real**, not because every paragraph says sovereign/metaverse/revolutionary.

Use "sovereign" sparingly as a privacy/design principle.
Use "metaverse" only in investor/strategy context if useful.
Consumer copy should primarily say what a person can actually do today.

## 8. Before / after requirement

Every migration/refactor PR must state:

- exact before SHA;
- exact after SHA;
- user-visible delta;
- state/storage delta;
- dependency delta;
- generated-output delta;
- bundle/performance delta;
- security/privacy delta;
- rollback path;
- exact checks/evidence.

No "cleanup" PR is accepted without measurable ownership or launch value.
