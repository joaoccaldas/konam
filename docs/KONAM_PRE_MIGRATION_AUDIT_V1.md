# Kona.m Pre-Migration Technical Audit V1

Date: 2026-10-02  
Scope: current `joaoccaldas/canyonmuseum` main versus the Kona.m pre-migration planning branch.

## Executive view

The repository is strong enough to serve as the migration source, but the migration should carry forward the release discipline while reducing structural debt.

The strongest existing qualities are:
- deterministic generated outputs and drift checks;
- exact-SHA-oriented release gates;
- explicit secret/private-data scanning;
- production dependency audits for web and Android;
- local-first/account-optional product behavior;
- integration contracts and browser journey tests;
- visual and interaction evidence;
- data-driven catalogue/wing/asset systems.

The main pre-migration technical risks are:
- `web/src/landing.js` remains a large mixed-responsibility module;
- legacy `speedmax.*` state references still exist under an explicit grandfathered allowlist;
- hand-built and data-driven room systems coexist;
- generated runtime bundles are large and must not become source authorities;
- historical Canyon/KONA naming exists across runtime, package identity, documentation and generated output;
- physical-device acceptance remains separate from browser/emulator evidence.

## Current measured code shape

### `web/src/landing.js`
- ~147,564 characters
- ~1,950 lines
- 37 `innerHTML` occurrences
- 5 direct `localStorage` references
- 0 `eval()`
- 0 `document.write`

Assessment: **migration risk: medium-high**.

This file still participates in world construction, navigation, interaction and state behavior. The existing architecture already identifies it as the main structural debt. Do not use the Kona.m rename as an excuse to refactor it wholesale in the migration commit. Preserve behavior first, decompose in bounded follow-up PRs.

### `web/src/ui/kona-shell.js`
- ~13,413 characters
- ~247 lines
- 2 `innerHTML` occurrences
- 0 direct `localStorage`
- 0 `eval()`
- 0 `document.write`

Assessment: **migration risk: low-medium**.

The shell is comparatively bounded. Its static HTML construction should remain inside the existing sanitization/DOM-safety contract. Canonical internal route IDs should remain stable through consumer-facing renames.

## Dependency surface

### Web runtime
- `@gltf-transform/cli`
- `esbuild`
- `meshoptimizer`
- `three`

### Web development
- `puppeteer-core`

### Native runtime
- `@capacitor/android`
- `@capacitor/core`

### Native development
- `@capacitor/assets`
- `@capacitor/cli`

Current release security already audits production dependency graphs at high severity for both web and Android. Pre-migration rule: **do not combine dependency upgrades with the repository/name migration unless the dependency is itself a blocker.**

## Native identity decision

Current Capacitor configuration still uses:
- app name: `KONA`
- Android app ID: `com.caldasstudio.speedmaxmuseum`

This is migration-critical because Android package identity is not cosmetic. Changing `appId` creates a different application identity rather than a normal in-place rename/update path.

Current stable Android signing is not yet configured/published, so Kona.m has a valuable decision window **before first stable native distribution**. Do not casually preserve the legacy package ID forever, but also do not change it inside the behavior-equivalent M0 repository migration.

Recommended gate before native public distribution:
1. decide canonical Kona.m Android package ID;
2. change it in a dedicated native-identity PR;
3. configure stable signing against that identity;
4. perform physical install/update proof;
5. never rotate identity/signing casually afterward.

## Safety controls already present

Current CI/release controls include:
- private-data/secret scan;
- web production dependency audit;
- Android production dependency audit;
- repository hygiene;
- brand authority;
- published asset staging;
- integration contract;
- P0 browser journey;
- UI interaction evidence;
- Visual Evidence V2;
- deterministic generated-output drift checks.

Migration principle: these controls are **assets to preserve**, not friction to simplify away.

## Flow contract

Current canonical internal route identity remains:

`home → discover → garage → plan → me`

Consumer labels can evolve to Home / Explore / Gear / Race / You without changing the internal IDs in the migration.

Pre-migration comparison now explicitly checks that these internal routes remain present.

## Persistence / namespace

The repository hygiene layer already permits a bounded set of legacy `speedmax.*` references for migration compatibility and prohibits uncontrolled spread.

New comparison logic now checks the before/after count and fails if new direct legacy keys are introduced.

Migration rule:
1. read old keys;
2. migrate through adapter;
3. write canonical future namespace;
4. do not delete compatibility until persistence tests prove the transition.

## Generated-code risk

`app/*`, hardened HTML, service worker and `web/dist/*` are generated/runtime artifacts.

The migration must preserve:
- source ownership;
- deterministic builders;
- release seal;
- stale-output detection.

Never “fix” generated files independently during the rename.

## World/content architecture

The pre-migration branch now defines:
- 28 canonical Kona.m rooms;
- 14 founding + 14 progressive;
- closed Founding 141;
- 140 room-bound items + The Point Six;
- founding quests;
- non-linear room progression;
- inventory baseline;
- world validator and contract test.

These are planning/data contracts only and intentionally do not alter production runtime.

## Before/after discipline added

A new comparison gate records:
- base SHA and head SHA;
- changed files by category;
- protected runtime/release files touched;
- dependency additions/removals/version changes;
- code-size and unsafe-pattern deltas on critical files;
- canonical route continuity;
- presence of release/security controls;
- legacy `speedmax.*` reference count.

It fails when:
- canonical internal routes disappear;
- required release/security controls disappear;
- new direct legacy storage references are added;
- `eval()` or `document.write` usage increases;
- runtime source changes without an explicit `docs/KONAM_CHANGE_CONTRACT.md` update;
- dependency graph changes without that same change contract.

Every future runtime/dependency migration PR must therefore explain:
- before;
- after;
- invariants;
- risks;
- rollback;
- actual verification evidence.

## Current migration recommendations

### Preserve exactly in migration M0
- source history;
- internal route IDs;
- persistence compatibility;
- release/security workflows;
- deterministic builders;
- existing proven URLs where feasible;
- source/provenance records.

### Rename/refactor only in bounded M1+
- consumer brand text;
- package/app identity;
- URLs/canonicals;
- new storage namespace;
- room display names;
- documentation hierarchy.

### Defer until after behavior-equivalent migration
- `landing.js` decomposition;
- removal of legacy storage compatibility;
- broad room-engine conversion;
- dependency upgrades;
- backend renaming;
- large visual redesign.

## Current status of this branch

Expected before/after state:

### Before
Production runtime = current Canyon Museum/KONA main.

### After
Production runtime = **unchanged**.

Added only:
- Kona.m planning data;
- validation contracts;
- inventory baseline;
- before/after comparison machinery;
- documentation;
- CI comparison workflow.

That is the correct pre-migration state: **more knowledge and stricter controls, zero consumer behavior drift.**
