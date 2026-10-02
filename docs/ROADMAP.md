# Kona.m Roadmap V9 — Launch Convergence

## Product

**Race the version of yourself.**

Kona.m is a mobile-first triathlon race-week, identity, gear, story, discovery and challenge platform. Canyon Museum is a flagship collection inside the platform, not the parent brand.

## Current production truth

M0 repository migration is complete and behavior-equivalent.

M1 identity migration is in progress:
- consumer name → Kona.m;
- deterministic source/build authority preserved;
- dependencies unchanged;
- route IDs unchanged;
- storage compatibility unchanged;
- Android package ID unchanged;
- Canyon Museum preserved as real historical/brand content.

## Launch objective

Ship a serious, understandable, fast and reliable public beta before expanding scope.

### Launch must prove
1. clear first-use proposition;
2. guest-first path;
3. local persistence;
4. Home / Discover / Garage / Plan / Me continuity;
5. optional 3D depth;
6. legitimate progression/collection;
7. safe share;
8. install/PWA reliability;
9. security/privacy;
10. exact-SHA build/deploy/rollback.

## Language

Launch language: **English**.

pt-BR is the first post-launch language once primary runtime copy is locale-driven and translation/metadata/hreflang QA is complete.

Do not publish a partially translated route or claim bilingual launch before that gate is met.

## Near-term sequence

### G1 — M1 identity convergence
- Kona.m product name;
- truthful public metadata;
- deterministic generated outputs;
- no broad redesign.

### G2 — physical-device acceptance
- Android physical phone;
- iPhone Safari/PWA;
- portrait + short landscape;
- background/return;
- keyboard/input where relevant;
- actual safe areas.

### G3 — first-session clarity
- proposition understandable in seconds;
- no forced account;
- no forced 3D;
- one primary action;
- install secondary, truthful;
- onboarding skippable.

### G4 — state continuity
- legacy/current state remains readable;
- cloud backup/restore round-trip;
- no duplicate progression authority introduced;
- migration fixtures retained.

### G5 — launch visual consistency
Golden surfaces:
Landing · Home · Discover · Artifact · Garage.

No new global visual language. Fix only evidence-backed inconsistencies.

### G6 — Founding world content
- stable 28-room registry;
- Founding 141 data contract;
- launch subset obtainable;
- reuse existing assets/cards/environment before creating new high-fidelity models.

### G7 — growth loop
- useful share object;
- deep-link return;
- measure share → completed RaceIdentity;
- never reward tap-to-share.

### G8 — commercial readiness
- package demonstrable B2B offers;
- affiliate links only after approval;
- no partner/sponsor claims before agreement;
- commercial content visibly disclosed.

### G9 — owned communication + community
- create a real role-based Kona.m mailbox on the production domain, with SPF/DKIM/DMARC before newsletter sends;
- add explicit-consent newsletter signup and unsubscribe/suppression handling;
- refine the existing branded invite flow ("invite your dudes & dudettes") around meaningful post-value moments;
- standardize native social sharing and share-media derivatives without contact-book harvesting or share-tap rewards.

### G10 — Feed + Intern content reliability
- expand the existing YouTube/RSS adapters through a curated source registry;
- normalize, deduplicate and cache source items;
- preserve source attribution and canonical links;
- keep factual extraction separate from the Intern's variable voice;
- add stale, malformed-feed and summary-failure states.

### G11 — merch concept factory
- generate brand-consistent merch concepts and print-ready candidates from approved assets;
- retain rights/provenance records;
- keep generated concepts internal until reviewed;
- compare print-on-demand/order-and-ship providers before integrating one;
- require a physical sample and full test order before public sale.

Detailed implementation contract: `docs/COMMUNITY_CONTENT_COMMERCE_ROADMAP.md`.

## Post-launch sequence

1. pt-BR production localization;
2. canonical Progression sole-write migration;
3. room-engine convergence;
4. `landing.js` bounded decomposition;
5. renderer lifecycle convergence;
6. CSS ownership cleanup;
7. external integration adapters;
8. additional brand/event activation templates;
9. newsletter assembly automation;
10. server-authoritative activated-referral rewards;
11. Intern content-engine quality gates;
12. Merch Studio + one provider-neutral print-on-demand adapter;
13. optional scheduled social-export workflows after manual share/export is proven.

## Do not do before launch

- framework migration;
- broad dependency upgrades;
- new top-level navigation;
- multiplayer;
- trading;
- WebXR;
- full world rebuild;
- full 141 bespoke 3D production;
- speculative partner UI;
- broad CSS redesign;
- backend redesign unrelated to a launch blocker.

## Definition of launch-safe change

A change may merge only if:
- current URLs/flows remain intentional;
- local state remains readable;
- no new required account/permission;
- no new tracker;
- dependency delta is explicit;
- generated outputs are current;
- security and seal pass;
- mobile interaction/visual evidence passes where relevant;
- rollback is obvious.
