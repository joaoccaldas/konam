# Kona.m Product Decision Log

This is the guardrail against feature stacking.

## Decision rule

A feature moves forward only when it:
1. strengthens Explore, Collect, Customize or Share, or materially improves reliability/security/privacy;
2. has a clear mobile-first interaction;
3. reuses a shared data/engine contract rather than creating a bespoke mini-app;
4. fits the current release milestone and performance budget;
5. does not create a second authority for state, navigation, styling or progression.

Statuses:
- **NOW** — required or strongly launch-strengthening.
- **NEXT** — valuable after launch/equivalence gate.
- **LATER** — strategically useful but premature.
- **HOLD** — needs evidence/partner/cultural/technical proof.

## Current decisions

| Idea | Status | Decision |
|---|---:|---|
| M0 repository migration | DONE | Behavior-equivalent Kona.m repo established with exact-source evidence. |
| Kona.m identity convergence | NOW | Consumer identity only; preserve Canyon facts, storage compatibility and native package identity. |
| Physical phone acceptance | NOW | Real Android + iPhone proof remains distinct from headless viewport tests. |
| Launch visual convergence | NOW | Fix evidence-backed inconsistencies only. No new global visual language. |
| Founding 141 registry | NOW / DATA | Stable IDs/rules. Do not equate 141 with 141 launch GLBs. |
| 28-room world registry | NOW / DATA | 14 founding + 14 progressive/future rooms. Build only where product value justifies it. |
| English launch | NOW | Production launch language. |
| pt-BR production localization | NEXT | Requires runtime copy extraction, metadata/hreflang and human QA. |
| KONA Now / companion feed | NEXT | Replay cleanly after launch branch stabilizes; do not block migration/identity. |
| Next100 generated 3D assets | NEXT / QA | Candidate lane only. Promote selectively after provenance/visual QA. |
| Multibrand asset studies | NEXT / QA | Transfer assets/data, not old branded-room topology. |
| Canonical Progression sole-write migration | NEXT | High-value cleanup, but state migration risk is too high for identity launch. |
| `landing.js` decomposition | NEXT | Do bounded seams after launch equivalence; never wholesale rewrite. |
| CSS ownership cleanup | NEXT | Reduce measured conflicts after launch with visual matrix proof. |
| Renderer lifecycle convergence | NEXT | Apply best embedded-renderer lifecycle one surface at a time. |
| Strava adapter | LATER | Useful loop, not a launch dependency. |
| Trading | LATER | Requires authoritative ownership/transactions; collection must be completable without purchase/trade. |
| Multiplayer | LATER | High complexity; sharing/deep links provide more immediate value. |
| WebXR | LATER | Mobile performance first. |
| Full PT-BR + additional languages | LATER / EVIDENCE | Expand after demand and localization architecture are proven. |
| Sponsor/partner rooms | HOLD until agreement | Never present a speculative partner as current. |
| Sacred/culturally restricted Hawaiian gamification | HOLD | Requires qualified cultural review and strong product reason. |
| Background GPS | HOLD | Privacy/battery cost not justified for launch. |
| New JS framework / Vite migration | HOLD | Current esbuild pipeline is proven; migration adds risk without launch value. |

## Until launch

Effort order:
1. exact build/release reliability;
2. physical phone UX;
3. truthful Kona.m identity;
4. state continuity/privacy;
5. first-session clarity;
6. collection/content quality;
7. share quality;
8. commercial packaging.

No feature gets to jump this queue because it looks impressive in a mockup.
