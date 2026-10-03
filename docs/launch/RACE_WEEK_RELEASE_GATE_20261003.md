# Kona.m Race Week release gate · 2026-10-03

## Release target

**Race Week Beta** is the current release target.

The public promise is deliberately smaller than the long-term world:

1. **Kona Now** — what is happening, what matters next, and practical island/race-week planning.
2. **The Intern** — source-grounded athlete/media/island notes with source and freshness visible.
3. **Your Kona** — Race Self, first collected bike, Garage, Collection and progression.

The 3D world remains optional depth. It is not the first-use tollbooth.

## Architecture rule

Every launch change must reuse the canonical authority map.

Do not add another:
- renderer or camera runtime,
- bike/product schema,
- progression engine,
- collection database,
- storage namespace,
- Feed/Travel provider,
- design-token system,
- modal/card geometry when an existing component already fits.

PR #36 makes these boundaries enforceable in CI.

## One-hour convergence sequence

### 1. Repository authority
- [x] Merge architecture authority enforcement (#36).
- [x] Merge repository weight/duplication audit (#34).
- [ ] Merge race-week convergence after exact-head gates pass (#46).

### 2. First-session clarity
- [x] Entry labelled **RACE WEEK BETA**.
- [x] Unavailable public Sign in removed from entry.
- [x] About link says **What is Kona.m?**
- [x] About generated from the existing Field Guide source rather than a second story runtime.
- [x] Questions → first level-unlocked bike → avatar → optional install → Home.
- [x] First bike writes once to canonical UserEquipment; Collection projects the same record.
- [x] Bike collection language does not assert physical ownership.

### 3. Return hooks
- [x] Home order: Today → Kona Now → Race Self → Find → optional 3D world.
- [x] Kona Now composes existing Feed, Travel and Plan routes.
- [x] Intern notes are cleaned publisher excerpts, not invented factual summaries.
- [x] Return journey asks one binary beta-feedback question on a return visit.
- [x] Feedback is rewarded through the canonical progression engine and does not collect free text.

### 4. Privacy and security
- [x] One scanner pattern authority for repo and staged public surface.
- [x] Entity/percent-encoded personal email is decoded before scanning.
- [x] Public project contact is an explicit exception; personal contact is not.
- [x] Public-web analytics uses sessionStorage only and no persistent visitor identifier.
- [x] Analytics table has RLS and no browser-role grants.
- [x] Analytics Edge Function uses origin/key/event allowlists, request limits and rate limiting.
- [x] Analytics stores no email, account ID, IP, user agent, precise location or raw feedback text.
- [x] Analytics events are automatically deleted after 30 days.
- [ ] Exact-head repository private-data scan passes.
- [ ] Exact-head staged public-surface scan passes.
- [ ] Supabase security advisor has no release-relevant unresolved finding. The existing leaked-password-protection warning is not used to justify enabling public sign-up; public sign-in remains unavailable until Auth hardening is complete.

### 5. Release evidence
A release is not READY until all evidence points to one exact commit SHA:

- [ ] full unit/contract suite green,
- [ ] architecture authority hygiene green,
- [ ] deterministic generated outputs clean,
- [ ] release security gate green,
- [ ] app release seal green,
- [ ] staged public-surface validation green,
- [ ] UI interaction evidence green,
- [ ] visual evidence green,
- [ ] Android emulator smoke green,
- [ ] physical Android portrait + landscape smoke,
- [ ] production URL exact-SHA smoke,
- [ ] service-worker update/reload path verified.

## Google Play preflight

Current verified repository facts:
- Android target/compile SDK: **36**.
- Android manifest requests **INTERNET only**.
- cleartext traffic is disabled.
- app backup is disabled.
- WebView debugging is disabled in the Capacitor configuration.
- CI smoke-installs and launches the packaged app on an emulator.
- CI now produces a Play-ready **AAB only when the stable release signing key is configured**.

Still required before a Play production submission:
- decide whether the existing application ID `com.caldasstudio.speedmaxmuseum` is the permanent store identifier before first publication; do not change an already-published package ID casually,
- complete Play listing, screenshots, content rating and Data Safety from the actual shipped behavior,
- test the signed AAB through Play internal testing,
- verify physical-device WebGL/background/resume/cache behavior.

## Apple App Store preflight

The repository does **not** currently contain a verified iOS native project/archive path. Therefore Apple Store readiness is **not claimed**.

Before an Apple submission:
- create the canonical Capacitor iOS target without forking product/runtime logic,
- set bundle identifier/version/signing/entitlements,
- generate the privacy manifest and App Privacy answers from actual runtime behavior,
- archive with current Xcode/iOS SDK,
- pass simulator and physical-device smoke,
- pass TestFlight before App Review,
- demonstrate product utility beyond a website wrapper through the existing local-first identity, collection, Garage, offline shell and interactive product/world capabilities.

## Open PR disposition after #46

- **#44 / #43 / relevant #39 / #40 pieces:** close as superseded only after #46 proves the equivalent behavior at its exact head.
- **#41:** retain/rebase only the correctness/public-repo cleanup not already absorbed into #46.
- **#42:** room-dock correctness, rebase after launch spine.
- **#35:** viewer payload/performance, rebase after launch spine.
- **#37:** NOR // 3 remains an unwired candidate, not a race-week blocker.
- **#10:** do not merge wholesale for launch. Only the bounded Intern source-note behavior is absorbed here.
- **#13 / #18 / #19:** old Beast Cave drafts are superseded by merged #33 and should be closed to reduce repository noise.

## Claim discipline

Do not write “100% App Store approved”, “all tests passed”, “secure”, or “production ready” until the corresponding external review or exact-SHA evidence exists.

The quality target is stronger: every public claim should have a reproducible artifact behind it.
