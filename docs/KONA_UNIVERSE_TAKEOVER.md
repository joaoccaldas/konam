# Kona Universe Takeover Plan

## Non-negotiable release contract

Every change follows the same evidence loop:

1. Record the exact Git commit/branch before work.
2. Capture representative desktop and mobile screenshots before visual changes.
3. Run the complete unit suite before the change.
4. Make one reversible slice with a narrow purpose.
5. Rebuild generated artifacts from source.
6. Run all unit tests. Zero known failures are allowed.
7. Run privacy and secret scans on changed/public artifacts.
8. Run browser smoke tests at desktop and mobile viewports.
9. Capture matching after screenshots.
10. Compare behavior, performance, and visuals against the baseline.
11. Record evidence and a confidence score. No merge on visual decay, test regression, unexplained console errors, or privacy/security regression.

"100% compliant" is not asserted from absence of findings. Release notes distinguish verified checks from residual risk.

## Confidence rubric

- **0.95-1.00**: automated + visual evidence agree; no known material gaps.
- **0.85-0.94**: strong evidence, one bounded non-critical gap.
- **0.70-0.84**: usable branch, not merge-ready.
- **<0.70**: exploratory only.

## Part A — Canyon Museum

### Preserve
- Blender-authored bike and art assets.
- Heritage reconstruction and provenance.
- Kona Champions and WYLD rooms.
- Mobile joystick, guided tour, bike studios, exploded views.
- PR #1 art-world work and its desktop/Samsung visual gate.

### Harden first
- Make `npm test` execute the real test suite.
- Add a versioned, pure-data world protocol without changing rendering.
- Generalize portal identity from room-specific behavior toward world transitions.
- Keep all new cross-world state anonymous/local-first until an explicit sync design exists.
- Add deterministic world/entity IDs before persistence.
- Expand CI from art-world-only checks to the complete unit suite, build, browser smoke, privacy/secret checks, and visual evidence.

### Only after parity is proven
- Wire discovery events to the runtime.
- Add local World Passport persistence.
- Convert the hidden portal into a protocol-backed transition while preserving the exact current visual.
- Add one unexplained cross-world artifact. Do not add UI clutter.

## Part B — KonaWorld (`studio-kona`)

### Preserve
- Existing 3D Kona world, locomotion, Hawaiian heritage work, renders, and verified baseline.
- Independent deployment and its own art direction.

### Harden
- Audit tests/build/deployment independently before integration.
- Implement the same protocol version, IDs, events and transition envelope.
- Accept Canyon arrivals at a named spawn without importing Canyon code.
- Add a compatibility test using shared fixtures.

### Then improve
- Persist arrival history and discoveries.
- Allow Canyon-created cosmetic state only through validated data.
- Keep world geometry, materials and scene code local to KonaWorld.

## Part C — Trek Museum

No separate Trek Museum repository is currently visible in the connected GitHub account. Do not clone Canyon blindly.

When created:
- start from shared contracts and QA tooling only;
- create independent art direction, architecture, catalog and secrets;
- prove compatibility with Canyon/Kona using fixtures;
- never import another world's scene code.

## Part D — Shared World Protocol

Version 0.1 is intentionally small:
- stable `worldId`;
- stable global entity IDs;
- anonymous passport schema;
- versioned world events;
- portal transition envelope using IDs, not arbitrary URLs;
- fail-closed validation.

Deferred until evidence justifies it:
- accounts/OAuth;
- cloud sync;
- multiplayer;
- payments;
- personal telemetry;
- cross-origin message transport.

## Part E — Quality, security, safety and privacy

Required gates:
- unit tests: all pass;
- build: reproducible;
- JS console: no unexplained errors;
- dependency and secret review;
- public artifact PII scan;
- CSP/headers once a production host is selected;
- no credentials in browser bundles;
- image/asset licenses tracked;
- disclaimer and provenance kept current;
- mobile touch targets and safe-area behavior checked;
- reduced-motion behavior checked;
- graceful fallback when WebGL/assets fail.

## Part F — Visual non-decay

A visual change is not accepted on description alone.

Canonical captures:
- desktop entrance;
- Samsung-class portrait entrance;
- hero bike close-up;
- Kona Champions room;
- WYLD room;
- each reactive installation;
- portal;
- hidden collection;
- representative bike studio/customizer.

For each capture record:
- viewport;
- commit SHA;
- scene/pose;
- console errors;
- frame/performance signal where available.

The goal is monotonic improvement: visual quality may change intentionally, but accidental flattening, darkness, clipping, lost detail, broken composition, or mobile obstruction is a release failure.
