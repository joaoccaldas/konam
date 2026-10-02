# Kona.m Business & Product Plan V10

Public-safe canonical strategy. No private CRM, contact, health, correspondence or user-level data belongs here.

## Proposition

**Kona.m — Race the version of yourself.**

Kona.m is a mobile-first triathlon race-week, identity, gear, story, discovery and challenge platform. Canyon Museum is a flagship historical/product collection inside Kona.m, not the parent brand.

The product principle is:

> **Simple surface. Deep world underneath.**

The product must remain useful before account creation, before 3D, before integrations, and before any commercial relationship exists.

## Problem

Triathletes and aspirational endurance users fragment their experience across:
- training/activity platforms;
- race/event sites;
- shops and product reviews;
- YouTube/social content;
- packing/checklists;
- race-week local information;
- personal equipment/race memories.

Kona.m does not replace mature systems such as Strava, TrainingPeaks, IRONMAN timing/event infrastructure or Zwift. It connects identity, equipment, race context, stories, place and progression into one consumer experience.

## Differentiation

```
RaceIdentity
 + canonical equipment graph
 + confirmed race history
 + race-week local graph
 + optional immersive 3D
 + collectibles / challenges
 + shareable personal story
```

3D is a differentiator and production capability, not a front-door dependency.

## Core consumer loop

`FAST ENTRY → BUILD IDENTITY → REWARD → HOME → DISCOVER → COLLECT / MASTER → SHARE → RETURN`

Registration is optional until the user has value worth preserving.

## North star

**WARI — Weekly Active Race Identities.**

Supporting metrics:
- landing → Build;
- Build → RaceIdentity complete;
- reveal → Home;
- reveal → share;
- share open → Build yours;
- RaceIdentity → optional account backup;
- week-1 return;
- Discover → first collection event;
- challenge completion;
- Garage completion.

Do not optimize raw shares, clicks, installs or affiliate taps as vanity metrics.

## Product architecture

Global shell:
**Home · Discover · Garage · Plan · Me**

Internal route IDs remain stable even if later consumer labels evolve.

3D world:
loaded only after explicit user intent.

Canonical domains:
Product · UserEquipment · RaceIdentity · Athlete · Event · RaceHistory · Place · Challenge · Progression · Collectible · AffiliateProgram.

Do not add a new top-level destination, ownership database, profile schema or progression system for launch.

## Founding world

Kona.m launches from a stable world contract:
- 28 canonical rooms;
- 14 founding rooms visible from launch;
- 14 progressive/future rooms;
- closed Founding 141 collection;
- stable room/collectible IDs independent from display names.

**141 does not mean 141 bespoke launch GLBs.**

A collectible may be:
- an existing 3D object;
- a lightweight prop;
- a story/evidence card;
- a room/environment state;
- a sourced image/artifact;
- a future high-fidelity model where justified.

The product should create meaning before polygon count.

## Game model

Four loops:
1. Discover
2. Collect
3. Master
4. Become

Reward:
- meaningful firsts;
- collection completion;
- challenge mastery;
- verified outcomes.

Never reward:
- affiliate clicks;
- share-button taps;
- spam invitations;
- optional personal disclosure;
- paid randomness.

Never lock:
- safety information;
- compatibility information;
- essential race information.

Commercial status never changes safety/utility ranking or progression rarity.

## Launch language strategy

### Launch
**English** is the only language required for the initial public launch.

The repository currently contains an internationalization policy and pt-BR locale definition, but the runtime is not yet comprehensively locale-driven. Claiming bilingual launch before extraction and QA would be misleading and would increase last-mile regression risk.

### Next
**Brazilian Portuguese (pt-BR)** is the first expansion language.

It becomes production-ready only after:
- primary shell/onboarding/Discover/Garage/Plan/Me copy is locale-driven;
- translated public entry surface exists;
- metadata is translated;
- reciprocal hreflang is valid;
- fallback behavior is tested;
- human language QA is completed.

### Later languages
Add only after user/commercial demand is evidenced. Do not add partially translated locales for appearance.

Entity IDs, product IDs, room IDs and state keys never change by locale.

## Visual system

Keep the current evidence-backed visual direction:
- sand / lava / ocean / sunrise semantic palette;
- Instrument Serif for editorial meaning;
- Manrope for functional UI;
- monospace for data/evidence;
- handwritten accent only for sparse human moments;
- image/3D-led hero moments;
- negative space;
- artifact grammar rather than generic rounded-card SaaS UI.

Launch rule:

> **No new global visual language before launch.**

Park for later:
- full cinematic onboarding sequences;
- neon/sci-fi dashboards as global UI;
- partner pavilion aesthetics presented as current product;
- broad CSS cleanup without cross-device visual evidence.

The five golden surfaces remain:
1. Landing
2. Home
3. Discover
4. Artifact
5. Garage

They should be recognizably related with the logo removed.

## Growth

Primary acquisition object:
a RaceIdentity/share card worth posting because it represents the person, not because the product begs for distribution.

Distribution:
- native Web Share API;
- shareable visual media;
- deep link back to Build yours;
- optional convenience links where appropriate.

Owned/community layer:
- a role-based Kona.m email address on the production domain;
- explicit-consent newsletter signup;
- "invite your dudes & dudettes" using the existing privacy-safe invitation architecture;
- reusable 1:1, 4:5 and 9:16 social derivatives;
- The Feed as a curated YouTube/RSS surface with attributable Intern-written summaries.

Optimize **share → completed RaceIdentity**, not raw share count.
Optimize **newsletter → useful return**, not list size.
A future referral reward triggers only after a referred user completes a valid RaceIdentity, never from a share tap or raw link open.

Detailed implementation and quality gates are defined in `docs/COMMUNITY_CONTENT_COMMERCE_ROADMAP.md`.

## Commercial model

Commercial capability is separated from commercial proof.

### Launch-ready commercial offers
These are offers Kona.m can credibly demonstrate or sell, but they are **not current partnerships unless an agreement exists**:
- immersive product/brand prototype;
- branded collection/exhibition concept;
- athlete/event activation prototype;
- content/3D production package;
- hosting/maintenance retainer;
- approved affiliate commerce where programme approval exists.

### After one repeatable client delivery
- reusable brand/event activation packages;
- recurring content/hosting service;
- white-label experience engine;
- automated branded media/merch concept production as an internal production capability.

### After consumer retention proof
- premium consumer features;
- a small merch capsule only after physical samples, rights checks, unit economics and one end-to-end fulfillment test pass.

### After consent + scale
- aggregate Owned / Dream / Try demand insight with privacy thresholds.

No sponsor, partner, affiliate or official-status claim appears publicly before it is true and evidenced.

## Commercial planning economics

These figures are **planning ranges, not market quotes or revenue promises**. They are retained because they are useful for deciding where founder time should go. Any external proposal is scoped independently.

### Offer ladder

| Offer | Indicative planning range | Scope |
|---|---:|---|
| Immersive concept sprint | €2.5k–€5k | Private branded room/object/story prototype, bounded revision |
| Brand activation pilot | €7.5k–€15k | Room + 1–3 canonical objects + story + share assets + hosted demo |
| Race-week activation package | €15k–€30k | Activation + challenge/event content + derivatives + light operations |
| Content / hosting retainer | €1.5k–€4k / month | Updates, hosting, asset/content refresh, reporting |
| White-label event/product world | €25k–€75k+ | Branded deployment, integration, larger content/3D scope |
| 3D asset / engineering study | €1.5k–€8k each | Procedural/measured study depending on fidelity, evidence and rights complexity |

Commercial priority is not to sell every line above. It is to prove one repeatable paid offer with controlled delivery cost.

### Affiliate economics

Affiliate is option value, not the launch business case.

Illustrative blended scenarios:

| Case | MAU | Commerce click rate | Purchase CVR | Blended order | Commission | Approx. monthly revenue |
|---|---:|---:|---:|---:|---:|---:|
| Early | 2,000 | 4% | 1.5% | €700 | 4% | €34 |
| Growing | 10,000 | 6% | 2.0% | €900 | 5% | €540 |
| Scaled niche | 50,000 | 7% | 2.5% | €1,000 | 5% | €4,375 |

Actual programme rates, attribution windows and conversion vary materially. Verify every programme before forecasting or publishing expected income.

### Consumer premium

Premium waits for retention.

| Example | Assumption | Approx. gross monthly revenue |
|---|---|---:|
| Small loyal beta | 2,000 MAU × 2% paid × €4.99 | €200 |
| Validated niche | 10,000 MAU × 3% paid × €5.99 | €1,797 |
| Scaled enthusiast base | 50,000 MAU × 4% paid × €6.99 | €13,980 |

A single €10k B2B pilot can equal months of early subscription revenue. That is why consumer premium should not distort launch scope.

### 12-month planning scenarios

| Scenario | B2B pilots / activations | Retainers / white-label | Affiliate + local | Approx. 12-mo revenue |
|---|---:|---:|---:|---:|
| Conservative | 2 × €5k | 1 retainer × 3 mo × €1.5k | €2k | €16.5k |
| Base | 5 × €7.5k | 2 retainers × 6 mo × €2k | €12k | €73.5k |
| Upside | 8 × €12k | 3 retainers × 12 mo × €3k + 1 × €30k white-label | €32k | €266k |

Interpretation:
- **Conservative:** proves willingness to pay.
- **Base:** credible founder-led niche studio/platform.
- **Upside:** requires repeatable selling and delivery, not simply a better product.

These are scenario mechanics, not probability-weighted forecasts.

### Cost model

| Cost bucket | Early planning range | Notes |
|---|---:|---|
| Hosting/CDN/domain | €20–€200 / month | Keep infrastructure simple until load proves otherwise |
| Backend | €0–€150 / month | Likely modest while local-first state dominates |
| Asset generation / AI tooling | €100–€1,000 / month | Depends on production cadence and existing subscriptions |
| Monitoring / email / analytics | €0–€200 / month | Prefer minimal privacy-safe stack |
| Contract design/3D/QA | €0 self-built; €2k–€15k+ / month outsourced | Largest controllable cost |
| Rights/licensing | case-specific | Never assume zero for commercial expansion |

### Financial conclusion

The business should optimize first for **paid B2B proof**, not consumer scale.

The most valuable near-term KPI is not MAU by itself. It is whether the public Kona.m experience creates qualified commercial conversations and converts at least one into a scoped paid pilot without destabilizing the consumer product.

## B2B factory

`SOURCE → CANONICAL ENTITY → 3D ASSET → ROOM / ARTIFACT → STORY → SHARE MEDIA → COMMERCE ADAPTER`

Brands buy reusable production capability and distribution surfaces, not one-off decorative renders.

A parallel merch production path can reuse the same evidence-backed assets:

`APPROVED BRAND/ARTIFACT → MERCH BRIEF → GENERATED CONCEPTS → BRAND/RIGHTS GATE → PRINT FILE → PHYSICAL SAMPLE → PROVIDER LISTING → ORDER → PRINT → SHIP`

The initial model is print-on-demand/order-and-ship rather than owned inventory. Provider-specific SKUs, webhooks and shipping logic belong behind a `MerchProviderAdapter`, not in consumer UI code.

## Evidence and provenance

Every factual/branded public asset should carry enough metadata to answer:
- what is it;
- where did the fact come from;
- what is measured/published;
- what is inferred;
- what is an original geometry study;
- what rights/provenance constraints apply.

Do not publish:
- CFD claims without CFD evidence;
- sub-millimeter fidelity claims without measurement evidence;
- certified compatibility without certification;
- official partnership without agreement;
- culturally sacred/restricted material as game decoration without qualified review.

## Privacy

- useful without an account;
- local-first;
- optional explicit cloud backup;
- explicit confirmation before public race-result candidates become profile truth;
- connected integrations require consent and revoke;
- aggregate commercial insight contains no row-level identity;
- export/delete remain explicit product capabilities.

## Scalability rules

Kona.m scales through canonical contracts, not bespoke forks.

A new brand, athlete, event, room or collection should preferentially be expressed as data/config/content over:
- Product;
- Room;
- Artifact;
- Story;
- Event;
- Challenge;
- Entitlement;
- Share;
- Commerce adapters.

A new feature is suspect if it requires:
- a second navigation shell;
- a second persistence authority;
- a brand-specific renderer;
- copied CSS primitives;
- a new progression economy;
- a direct write bypassing canonical state.

## Release strategy

A feature is not ready because code exists.

READY =
implementation + automated tests + runtime/visual evidence + no P0/P1 blocker + exact build state.

Mobile-facing releases additionally require honest physical-device status. Headless/browser viewport evidence is not physical-device certification.

## Current launch blockers

Only these should displace launch work:
1. broken first-use understanding or guest flow;
2. state loss/migration failure;
3. broken install/PWA behavior;
4. security/privacy failure;
5. deterministic build/generated-output failure;
6. inaccessible/unreachable primary controls;
7. serious mobile rendering/overflow issue;
8. false public commercial/capability claim;
9. deployment ambiguity or inability to rollback.

## Launch-strengthening, non-blocking work

Do only when it does not jeopardize blockers:
- clearer product identity;
- source/provenance completeness;
- lightweight collection/story content;
- share-card quality;
- asset/room reconciliation;
- migration/refactor contracts;
- performance budgets.

## Explicitly post-launch

- full pt-BR production translation;
- Strava runtime integration;
- trading;
- multiplayer;
- WebXR;
- broad dependency/framework migration;
- wholesale CSS rewrite;
- wholesale `landing.js` rewrite;
- all 141 items as high-fidelity 3D;
- all 28 rooms fully built;
- premium subscription;
- speculative marketplace mechanics.

## Definition of public beta

A new user on a real phone can:
1. understand Kona.m;
2. continue without an account;
3. create/persist a RaceIdentity;
4. optionally install/save;
5. reach Home;
6. Discover without forced 3D;
7. collect/earn legitimate progress;
8. safely share something useful;
9. return to continuity;
10. encounter no P0/P1 blocker.

## Definition of production

Public beta plus normalized valuable persistence, migration/backup/export/delete proof, observability, accessibility evidence, performance budgets, security/privacy review, device matrix, signed native distribution if offered, and rollback/incident proof.

## Decision rule until launch

A change enters the launch branch only when at least one is true:
- it removes a launch blocker;
- it materially strengthens trust/safety;
- it materially improves first-session clarity;
- it reduces migration/scale ambiguity without runtime risk;
- it improves measurable mobile reliability/performance;
- it removes a false or unsupported public claim.

Everything else waits.
