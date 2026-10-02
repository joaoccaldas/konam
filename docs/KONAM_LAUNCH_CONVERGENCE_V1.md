# Kona.m Launch Convergence Audit V1

Date: 2026-10-02

## Bottom line

The current business plan is directionally strong but previously mixed **launch requirements, medium-term platform ambition and commercial possibilities** in a way that could encourage overbuilding during race-week launch.

The launch should become smaller, more credible and more measurable, not less ambitious.

The best current architecture already supports that:
- local-first app shell;
- optional account;
- lazy 3D;
- stable domain/state contracts;
- deterministic build/release gates;
- Canyon Museum as reusable flagship collection;
- Founding 141/28-room registry as data rather than forced launch rendering.

## Visual comparison

### Keep

The current evidence-backed system is aligned with the strongest parts of the plan:
- sand/lava/ocean/sunrise semantics;
- editorial serif + functional sans;
- one dominant CTA;
- image/3D-led hero moments;
- artifact grammar rather than generic dashboards;
- 3D as optional depth;
- strong negative space;
- dark immersive stages only when context earns them.

This is sufficiently distinctive for launch.

### Improve only when evidence shows a problem

- inconsistent legacy uppercase `KONA` copy on consumer surfaces;
- terminology drift between Discover/Explore, Garage/Gear, Plan/Race, Me/You;
- older hall/mobile CSS overrides where they cause a measured device defect;
- legacy museum language appearing as parent-product language.

Do not change navigation terminology merely for novelty. Internal routes and current visible labels are already understood and tested.

### Park

- cinematic Mauna Kea onboarding;
- universal neon/partner-dashboard aesthetic;
- adding more fonts;
- animated visual spectacle before intent;
- broad card/radius restyling;
- full CSS cleanup before launch.

## Language assessment

The previous business plan said English and Brazilian Portuguese were first-class launch languages, but repository evidence does not support that claim yet.

Current reality:
- English is production copy.
- `museum/i18n/locales.json` marks pt-BR as `next`.
- primary UI strings are still embedded in JS/HTML rather than consistently resolved through a locale runtime.
- no real pt-BR canonical public route exists.

Therefore the serious launch choice is:
- launch English;
- preserve pt-BR architecture/policy;
- complete pt-BR after launch through a controlled extraction and QA pass.

Adding more languages now would reduce quality and increase regression surface without improving the core launch.

## Copy / terminology inefficiencies

There are three different classes of language in the repository and they should not be mechanically normalized:

1. **Product identity**
   - canonical: `Kona.m`
   - consumer-facing legacy `KONA` should migrate intentionally.

2. **Historical/brand content**
   - Canyon, Speedmax, KONA race/place references remain factually correct and should be preserved.

3. **Internal compatibility**
   - `kona.*`, `speedmax.*`, stable route IDs and historical schema identifiers are technical compatibility surfaces and should not be renamed cosmetically.

The mistake to avoid is a global string replacement.

## Business-plan corrections

### Strong and launch-relevant
- identity-first entry;
- local-first/no-account value;
- optional 3D;
- canonical equipment and race objects;
- collections/progression;
- shareable personal story;
- partner-ready content factory;
- explicit provenance;
- privacy-preserving future insights.

### Good but post-launch
- full pt-BR;
- Strava;
- white-label engine;
- premium;
- aggregate commercial insight;
- broad brand/event catalog;
- trading;
- all 28 rooms fully realized.

### Too risky or misleading if presented as current
- sponsor rooms without sponsors;
- official athlete/brand activations without agreements;
- cryptographic/passport claims not implemented;
- certified compatibility without certification;
- CFD/fidelity claims without evidence;
- cultural/sacred Hawaiian gamification without qualified review.

## Scalability assessment

The key scalability advantage is not more features. It is fewer authorities.

Kona.m should converge toward:
- one product metadata authority;
- one state write authority per domain;
- one progression economy;
- one room registry;
- one collectible registry;
- one component/token system;
- one build authority;
- one deployment origin;
- one evidence/provenance model.

Any new feature that creates a parallel authority is a scalability regression even if the UI looks good.

## Launch decision filter

Merge now only if the change:
- removes a launch blocker;
- prevents state/data loss;
- fixes trust/security/privacy;
- materially improves first-session understanding;
- materially improves mobile reliability/performance;
- removes unsupported claims;
- reduces architecture ambiguity without destabilizing runtime.

Otherwise park it.
