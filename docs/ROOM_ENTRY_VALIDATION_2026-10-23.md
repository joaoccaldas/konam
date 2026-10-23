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


## CI build-consistency follow-up

At initial commit `34509846f4ac7a919079fee9f8783e17c69739ca`, GitHub release-seal and integration-contract checks passed, while hostile-runtime, interaction and visual jobs stopped before browser execution. Their common cause was generated whitespace drift in the existing Speedmax CFR/SLX HTML pages. A local full `tools/build_pages.mjs` reproduced that drift. The existing generator normalized the two pages; no functional product-page source change or workflow bypass was introduced. Repeated full build plus seal is byte-identical for affected pages and release artifacts.

The resulting sealed release is `01012f8242a8`. Its manifest differs from browser-audited `c8b525ac2048` only for `Speedmax_Museum.html` and `Speedmax_SLX_Museum.html`; entry, hall, terrain and styles are byte-identical. Browser evidence remains pinned to c8b525ac2048, not relabeled as a new capture. The generated room document's unrelated overwritten tail and sitemap timestamps were retained privately and restored from the source commit. CI browser outcomes still require fresh readback on the follow-up commit.


## Preserve authored notes outside generated documentation

The Museum CI build-consistency gate also detected a historical fourteen-line authored tail in generated `docs/ROOMS.md`. The original tail is preserved verbatim below and at base bba5c7a; its private preimage is retained. The room registry generator now owns the complete generated document. New authored delivery notes belong here and in the existing room skill, never appended to generated output.

### Historical source tail, verbatim

## Embedded entrance repair · 21 October 2026

The existing world host owns direct entry and camera placement. Registered Atlas
previews wait for the selected room's rendered receipt and required model load
state. Direct arrivals keep editorial cards and coaching closed. The collection
and story remain available through native controls. Source progress is preserved.
See `skills/konam-room-studio/SKILL.md` for the reusable check sequence.

This is a source repair under review, not public or headset acceptance. Browser
receipts and captures are retained in the owner's Spatial Studio audit directory
`ecosystem-fixes-20261021-041728`. Required model failure and retry, exact room
identity and viewport coverage are tracked separately from artistic acceptance.


## Pending-room return to Home regression

Fresh CI at e35f5f2 passed hostile-runtime, all four interaction layouts, seal and integration checks. The full visual matrix then caught a real regression: navigating to Home while world loading was pending left the pending intro visible and the shell hidden. Pending presentation now yields to the existing `kona-panel-open` state: hide the pending intro and reveal the shell while Home is active. This does not create a new route/state owner or dismiss a selected-room failure. The existing CI visual matrix exercises the early return race across themes and viewports; final result must be read at the follow-up head. The new sealed build is `60502a887e98`; earlier room captures retain their original build labels.
