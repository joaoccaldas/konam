# Kona.m Change Contract

## Change

- Date: 2026-10-02
- PR: Kona.m #2
- Phase: M1 identity convergence
- Purpose: move the primary consumer identity from KONA to Kona.m while preserving architecture, state, dependencies, Canyon Museum provenance and launch behavior.

## Before

- Runtime behavior: M0 behavior-equivalent Canyon Museum/KONA import at merge SHA `38f05063b7e13323123664dec1666f9414175148`.
- User flow: guest-first entry; Home / Discover / Garage / Plan / Me internal routes; 3D world optional.
- State/persistence: canonical `kona.*` localStorage adapter with `speedmax.*` compatibility; optional account backup.
- Dependencies: Three.js + esbuild + meshoptimizer + glTF transform; no Vite production authority.
- Security/privacy: exact-SHA release gate, secret/private-data scanner, dependency audits, local-first default.
- Performance: no intentional renderer/asset/runtime architecture change.
- Release/deployment: Canyon Museum public origin still used for compatibility/update metadata.

## After

- Runtime behavior: same product flow and internal route IDs.
- User flow: visible master consumer name becomes **Kona.m** on primary entry/onboarding/shell surfaces.
- State/persistence: unchanged.
- Dependencies: unchanged.
- Security/privacy: unchanged plus launch-claim tests for false partnership/cryptography/scientific/cultural claims.
- Performance: no intentional rendering or asset cost change; product metadata adds negligible core bytes.
- Release/deployment: origin intentionally unchanged in M1 identity PR; canonical target origin is a separate decision/gate.

## Intentional source changes

- `config/product-meta.json`: canonical product identity/disclosure metadata.
- `web/src/product-meta.js`: shared runtime product-name source.
- `web/landing.template.html`: visible entry identity.
- `web/src/entry.js`: onboarding copy identity.
- `web/src/ui/kona-shell.js`: shell identity.
- `web/src/app-shell.js`: update UI identity only; download origin preserved.
- `manifest.webmanifest`: PWA display name.
- `app/native/capacitor.config.json` + Android string resources: native display name only; legacy Android package ID intentionally preserved.
- `tools/harden_pages.mjs`: generated title/name identity.
- README / STATUS / launch truth documentation.
- deterministic generated outputs produced by canonical builders.

## Explicit non-changes

- no route ID rename;
- no storage namespace rename;
- no user-state migration;
- no Android appId change (display name changes to Kona.m only);
- no Supabase migration;
- no hosting switch;
- no Three.js/renderer refactor;
- no CSS restyle;
- no dependency version update;
- no Canyon/Speedmax historical/product facts renamed;
- no partner/sponsor claim introduced.

## Invariants

- Canyon Museum remains Canyon Museum.
- Old `speedmax.*` state remains readable.
- Guest use remains possible.
- Account remains optional.
- All 14 founding rooms remain launch-visible in canonical world data.
- Public primary surfaces do not claim unearned sponsorship, cryptographic passport/NFC, sacred-Hawaiian archetype gamification, Navier-Stokes precision or certified compatibility.
- Exact generated outputs must match canonical build.
- M0 release/security/interaction/visual quality must not regress.

## Risks

- Brand-string interpolation could render literal template syntax or stale KONA text.
- Generated pages/service-worker metadata could drift from source.
- PWA installed-name change could produce platform-specific update behavior.
- Old public origin may look inconsistent until canonical deployment-origin phase.

## Rollback

Revert PR #2. M0 main remains the complete behavior-equivalent recovery point.

## Verification

Required on one exact head SHA:
- unit tests including `launch-truth.test.mjs`;
- deterministic build/generation;
- repository hygiene;
- brand authority;
- release security;
- integration contract;
- Museum/P0 journey;
- App release seal;
- UI interaction evidence;
- Visual Evidence V2;
- M1 before/after comparator.

## Result

Deterministic generated outputs were rebuilt and committed by the temporary M1 sync workflow. The temporary sync workflow was then removed so the final candidate can be certified from an owner-authored exact head. Final exact-head CI remains required.

## 2026-10-05 — mobile layout, collection and Intern improvement release

Base: `02a35d2f33daaeb214094caf315d9918577b4b1b`. Scope and measured limitations:
[full app audit](APP_AUDIT_2026-10-05.md).

Before: mobile overflow/covered controls, weak collection previews and progress,
secondary destinations with inconsistent return context, title-only feed without
dated digest, failed snapshot-config reference, Home/world Find ownership mismatch.

After: shared responsive constraints, clearer entry/step scroll reset, owned-first
collection with derived object thumbnails and explicit 3D, origin-aware navigation,
next chapter/progression indicators, dated source editions and scheduled review
artifacts, persisted canonical Find ownership before visual removal. Companion UI
is loaded on intent; reduced-motion collectible previews avoid idle rendering.

Authorities preserved: brand CSS manifest, existing route IDs and storage adapter,
legacy progress compatibility, progression rewards, shared rendering kernel,
public Companion adapter and release gate. No dependency, account/auth/schema,
hosting-origin or world-renderer authority replacement. No source/asset deletion.

9 October release addendum: the locked build dependency sharp was patched from
0.35.4 to 0.35.5 after the release audit identified its new librsvg advisory.
No runtime framework was changed. Production verification then reproduced missing
Discover registry JSON in the public staging allowlist. Both existing canonical
files are now explicitly staged and lazy-sealed, including native packaging;
the mobile journey gate exercises the staged site instead of the full repository.

Risks: lazy-loading races/failures, old Find formats, static thumbnail packaging,
source date/encoding and generated web/native drift. Tests exercise each of these;
existing P0, install and release certification remain required on the exact SHA.
The complete world still exceeds scene budgets and video sources remain degraded;
these are documented limitations, not claims of completed optimization.

Rollback: revert this release commit and rebuild with the canonical builders;
legacy keys remain readable and no user-state deletion is required. Publication
is authorized by the user's explicit request to make the changes live. Verify the
deployed release SHA and production mobile routes after all certification gates.
