# Product Decision Log

This is the guardrail against feature stacking. Every material idea is evaluated before implementation.

## Decision rule

A feature moves forward only when it:
1. strengthens **Explore**, **Collect**, **Customize**, or **Share**; or materially improves reliability/security/privacy;
2. has a clear mobile-first interaction;
3. reuses or improves a shared data/engine contract rather than creating a bespoke mini-app;
4. fits the current release milestone and performance budget.

Statuses:
- **NOW** — appropriate for the current Kona launch/growth sprint.
- **NEXT** — valuable, but depends on a current contract or QA milestone.
- **LATER** — strategically useful but premature.
- **HOLD** — idea needs evidence or a clearer user purpose.

## Current decisions

| Idea | Loop / purpose | Status | Why |
|---|---|---:|---|
| Launch PWA hardening | Reliability | DONE | Required before public use; merged to main with checks + seal green. |
| My Kona Setup V0 | Customize + Share + Return + platform proof | NOW / BUILT | Composes the existing Studio bike into a local/shareable race object; creates brand/equipment sockets without adding another configurator. |
| Data-driven room art direction | Explore | NOW | Makes existing/new rooms feel authored without custom room code. |
| Materials & Motion wing | Explore + Collect | NOW | Reuses existing assets and proves the room design schema cheaply. |
| Island Stories wing | Explore + race-week utility | NOW | Directly relevant to Kona race window and expands the museum beyond equipment. |
| Hawaiʻi Island guide data | Explore + trip planning | NOW | Creates a sourced foundation without location tracking or live-service risk. |
| Nine hidden finds + rarity | Collect | NOW | Fulfils an existing 9-find promise and gives exploration persistent meaning. |
| OAI-SearchBot + llms-full | Discoverability | NOW | Low runtime risk; improves machine-readable discovery and citations. |
| EN + PT-BR locale contract | Market expansion | NOW (foundation only) | Stable ids/localization policy can land safely; translated public URLs wait until content exists. |
| Full PT-BR UI/content | Explore + market launch | NEXT | Needs locale extraction from runtime strings and translation QA first. |
| Daily/weekly Kona challenges | Collect + Return | NEXT | Depends on one canonical Passport state model. |
| Garage for multiple saved builds | Customize + Return + Share | NEXT | My Kona Setup V0 proves one composed race object first; a multi-build Garage should reuse that contract after Passport/profile consolidation. |
| One additional bike-brand wing | Explore + platform proof | NEXT | Must prove brand #2 can be data-driven before scaling brands. |
| Helmets collection/configurator | Collect + Customize | NEXT | Best first equipment category after item contract is stable. |
| Wheels | Collect + Customize | NEXT | Natural second equipment category and bike-slot integration. |
| Shoes | Collect + Customize | LATER | Useful but weaker connection to the current bike-centric 3D scene than helmets/wheels. |
| Trisuits / athlete avatar | Customize + Share | LATER | Requires body/avatar/privacy design; do not bolt it onto current Studio. |
| Live race closures / traffic | Trip planning | LATER | Needs current official data integration and freshness/expiry guarantees. |
| Background GPS | Trip planning | HOLD | Privacy/battery cost is not justified for V1; use explicit map/deep-link actions instead. |
| Cloud accounts/sync | Return | LATER | No need to collect identity until cross-device retention is proven. |
| Multiplayer museum | Share | LATER | High complexity and safety cost; deep-link sharing delivers more return now. |
| WebXR | Explore | LATER | Mobile rendering/performance comes first. |
| Booking/commerce | Revenue | LATER | Separate editorial content from commercial actions; only after partner model is explicit. |

## Race-window priority

2026 IRONMAN World Championship in Kailua-Kona: **10 October 2026**.

Until race week, effort order is:
1. launch reliability and phone UX;
2. Kona discoverability/shareability;
3. Kona history/culture and useful visitor planning;
4. collection/return mechanics;
5. internationalization foundation;
6. platform proof (one other brand + first equipment category).

## Definition of a launch-safe additive change

An additive feature may merge only if:
- existing URLs still work;
- existing localStorage data remains readable;
- no new required account/permission;
- no new third-party tracker;
- CSP and leak guard remain green;
- generated pages are committed;
- service-worker seal is current;
- unit tests + asset contract pass;
- mobile QA shows no overlap/regression on target widths;
- the feature has an obvious rollback path.
