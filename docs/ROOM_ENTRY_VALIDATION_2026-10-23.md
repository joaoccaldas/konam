# Room entry validation · 23 October 2026

Direct room links previously exposed the general onboarding screen before the selected room, and background loading could report success despite missing required models. This candidate keeps one neutral pending state until the requested room, semantic review identity, required asset group and submitted frame agree. A bounded failure offers explicit retry or return; late completion cannot dismiss that failure.

## Source and reuse

- Base: PR #141, `bba5c7a7ff4973cfcf9f82c9b8c94d12e7269cb9`, branch `fix/room-entry-2026-10-21`.
- Reused readiness and required-loader propagation from PR #142, `d634beb8fddda0ec9ef72cb2864304e4e183b941`; inspected current source and tests, adapted the host integration rather than copying a second renderer or navigation authority.
- Existing host: `web/src/entry.js`, `web/src/landing.js`, viewport bootstrap, room navigator, storage adapter, renderer and room loaders. No new app, catalog, credentials, profile, queue or renderer.
- Existing portfolio-content preview policy was applied only to a private loopback browser fixture. Source and adapted bundle hashes were retained. This is not a production access-policy change.

## Final candidate

Sealed release `c8b525ac2048`: 239 files, 31 core, 59.1 MiB rounded by the existing builder. Esbuild 0.28.2 and Three.js 0.186.1. `app/kona-core.js` is 249954 bytes against the unchanged 250000-byte gate; only 46 bytes remain. This is a constraint, not a healthy growth margin.

The existing builder generated the bundles; the existing hardener preserved index metadata/CSP; `tools/build_app.mjs` sealed hashes and service worker. Generated room documentation was not edited. Two real Norseman binary grids are now included lazily, not in the core download. Terrain decoding checks HTTP status, bounded metadata, schema, dimensions, geographic bounds, byte count and explicit little-endian encoding.

Other-room prefetch progress stays quiet for direct room visitors; prefetch failure still has a distinct message. The global story link moves away from the world header while walking. Required-room readiness remains separate from optional/background loading.

## Evidence and scope

Private raw receipts, logs, screenshots and fixture source are retained under `Spatial_System_Audit_2026-10-23/room-flow` in the local company operations evidence store. They are not shipped as public project assets. All checks below were agent-run, not independently accepted.

| Check | Observed result | Scope/limit |
| --- | --- | --- |
| Baseline Node suite | 475 passed | Exact PR #141 base |
| Final Node suite | 487 passed | Readiness/deadline cleanup, binary validation and real terrain-manifest coverage added |
| Authority, brand and repository hygiene | Passed | Brand ratchets unchanged: 166 total important declarations, 12 consumer; 438/440 raw hex |
| Initial candidate | Rejected | Four tests failed, shell reached 250463 bytes, seven extra important declarations; fixed without raising limits |
| All mapped room destinations | 32 observed through Map; all 32 direct entries confirmed | Desktop candidate `c22a43b915f2`; requested room, ready assets, caption, one canvas, no horizontal overflow. Six future placeholders and Secret Collection were not accepted as implemented rooms |
| Walking observation | Three still in transit at short first observation | Paint, Clip-on, Afterdark later confirmed by direct entry; a short walk observation is not a permanent routing failure |
| All four special review rooms | Correct identity, assets ready and one canvas | Final `c8b525ac2048`, 1440×900: Beast Cave, NOR // 3, Breitling × Kona, Fjord to Summit |
| NOR // 3 and Breitling review layouts | Correct identity, one canvas, no horizontal overflow; no redundant prefetch chip | Final build at 390×844, 844×390 and 820×1180, plus desktop. Browser viewport emulation, not physical-device certification |
| Delayed bundle | Only neutral pending copy before correct room | Earlier entry candidate, three-second delay |
| Required watch asset unavailable | Visible failure, scene stays hidden | Earlier entry candidate, HTTP 503 fixture |
| Whole-chain timeout | Actionable error persists after late scene completion | Earlier entry candidate, 35-second bundle delay; explicit Return to Kona verified |
| Norseman binary delivery | Failed before; ready after | Missing manifest `.bin` produced HTML 404 and RangeError; preserved failure and successful final captures |
| Room validators | Breitling and Norseman pass as candidates | `nor3-winter` exact manifest absent; existing `norwegian-engine` is a distinct implementation. Alias/identity reconciliation remains open |

The all-32 captures precede the final terrain/prefetch/story-link changes. Those final changes have the full source tests and targeted four-room/layout evidence above; do not relabel the earlier all-32 captures as final-build evidence. DOM receipt serials indicate submitted frames, not GPU completion, frame-time certification or visual acceptance.

## Visual rejection remains meaningful

Contact sheets retain the actual 32 desktop arrivals. Technical readiness does not approve these compositions:

- Stair, galleries and geographic bays: foreground sculpture/palms obscure the destination.
- Horror: arrival faces a red wall.
- Types: bike crop and blank-wall emphasis.
- Paint and reference arrivals: corridor-heavy framing and narrow product presentation.
- Champions: empty image frames under restrictive preview; rights and artwork delivery remain unresolved.
- Nike and normal Breitling: sparse exhibit presentation.
- Portrait NOR // 3: only a section of the athlete narrative fits; tablet has excessive dark ceiling/foreground. Responsive room framing still needs room-owned art direction.
- Beast Cave: large foreground fan dominates the bike. That may support the story but does not pass an independent hero-composition review.

Keep these rooms in review. Existing room-owned showcase poses in the related source work are candidates to inspect and adapt; no wrapper camera override was introduced. No athlete/brand rights approval, partnership claim, human acceptance or commercial readiness is inferred.

## Release and rollback

This is a narrow stacked loading fix against PR #141, not approval to merge the broad parent room branch into main. Parent/main reconciliation, independent review, all-room interaction/exit/retry journeys, installed service-worker updates, physical mobile performance, headset/accessibility checks, rights, missing winter manifest mapping and visual rejection list remain open. No native installation or public deployment occurred.

Rollback through the normal Git revert/PR path for this patch, then rebuild and reseal from the retained base; do not copy minified fragments or remove visitors’ stored progress. Failed and successful evidence must both survive rollback.
