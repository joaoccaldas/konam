# Spatial R2: cross-repository authority reconciliation
Snapshot 2026-10-23. This is a candidate dependency map, not a production migration. Existing canonical [Kona authority](AUTHORITY_MAP.md) remains binding and is NOT superseded.

## Rules
1. No second renderer/camera/storage or asset identity authority inside Kona.m. Existing `AGENTS.md` and CI policies win.
2. Read-only portfolio inventory (SPATIAL-01) is optional evidence, not a new asset database.
3. Store partnership and acquisition dossiers in the private company-profile repo, not here.
4. Do not merge stale branches wholesale. Reconcile per-file against current main, cherry-pick narrowly only after provenance, test and review.
5. Interface extraction requires two real consumers, an unchanged legacy path, explicit version and rollback.

## Observed source projects
| Repo | Current responsibility evidenced in source | Contract proposal | Verification gap |
|---|---|---|---|
| konam | Consumer app, museum, asset-manifest schema, shared renderer kernel, knowledge and release authority | Canonical experimental scene/asset contracts until extracted | CI and real-device gates at exact SHAs |
| canyonmuseum | Historical museum factory and provenance | Source reference, not second production asset authority | Duplicate file-by-file provenance and rights |
| bellagio | Geography world portal, runtime, Vegas/Nice | Reference geo-runtime consumer | Terrain licenses, browser/device performance |
| studio-kona | Island 3D scene, navigation and environment | World content and candidate runtime consumer | Source imagery, streaming, XR capabilities |
| ai | Immersive marketing/creative experiments | Research examples, only after rights screening | Canonical owner and reusable modules |
No independent Luxor/Nice/St. George repository was verified in the earlier account inventory: places and routes cannot be treated as separate deployable repos without evidence.

## Candidate branch comparisons to main (GitHub compare, observed 2026-10-23)
| Repo / branch | Ahead | Behind | Status | Consequence |
|---|---:|---:|---|---|
| konam architecture/room-asset-contract-v1 | 15 | 93 | diverged | A previous asset/schema effort; main already has canonical manifests, so diff before any extraction |
| konam architecture/canonical-runtime-v1-20261004 | 26 | 11 | diverged | Runtime work overlaps main's renderer authority and UI; selectively review tests and contracts only |
| bellagio research/reconstruction-r1-20261004 | 9 | 16 | diverged | Research/benchmark source, not directly mergeable production baseline |
| studio-kona feat/xr-readiness-baseline-20261018 | 4 | 0 | ahead | Promising small XR candidate; inspect tests, dependency and public build before merge |

Counts represent Git commit ancestry from GitHub compare, not quality scores or proof a branch is open as a PR.

## Component authority and portability acceptance
| Domain | Current local authority | Extract only when | Regression evidence |
|---|---|---|---|
| Asset metadata | museum/schemas/asset-manifest.schema.json | 2 independent consumers validate fixtures | rights/provenance remain explicit |
| Room content | world/konam/rooms-v1.json, world/konam/rooms/*.room.json | portable scene schema represents two real rooms | no missing entities, links or interactions |
| Rendering | web/src/landing.js and web/src/render/ according to authority map | 2 apps run contract with adapter, without new unauthorized constructors | visual parity, memory, frame times |
| Identity/progression | web/src/engine/identity.js and progression.js | ONLY shared contract requires these, not engine data mutation | identity migration and permission tests |
| Geography | bellagio/world-runtime/ and project-level world registry | georeferencing specified with WGS84/local transform | geospatial fixtures and imagery rights |
| Source models | Blender and existing factories | license and source ownership documented | regenerated previews and asset contract |
| Technical knowledge | tools/3d-knowledge.mjs | never silently publish private cross-project map | synthetic tests and privacy review |

## Fundamental gaps, in order
1. Cross-repo asset occurrences have no independently verified complete audit or rights inventory. Next: run approved local scanner in clean clones and reconcile existing manifests.
2. Current live CI and physical-device results were not collected in this review. Next: benchmark pinned main releases before claiming runtime parity.
3. The Greatlinq T.2 SDK/import/sync/renderer boundary is unknown. Next: capability-based feasibility interview/sandbox, mock is NOT certified integration.
4. Cross-engine scene portability is proposed but not demonstrated. Next: a minimal exporter/importer proof using the current host kernels.
5. No measured customer-authoring time, maintenance costs or paid deployments in this audit. Next: instrument one repeatable showroom production trial.

## Contract extraction exit criteria
- Two real independent consumers, no regression of original entry/consumer flow.
- Versioned schemas, backward migration fixtures, unit and visual tests.
- Explicit source rights and content lifecycle, without permission promotion from hashes.
- Device/network benchmark before/after; stress cases include 4x scene size, 100x object count, failed texture requests, WebGL context loss, mobile low-memory recovery.
- Reviewer independent of implementation agent; no autonomous merge.
- Release tied to commit SHA and reversible behind a flag.

## Knowledge and cross-project sharing
Learnings travel as source-linked, rights-screened recipes or ADRs, not code copied blindly. Private research stays in authorized private knowledge maps. Public examples must contain synthetic identifiers and assets with approved distribution rights.

## Follow-up PRs
SPATIAL-03 reproducible build checks per repo; SPATIAL-05 measurable scene baseline; SPATIAL-06 additive scene interchange contract. Before starting: compare existing PR/branch changes and check production authorities again.

## Limitations
This document relies on repository files and GitHub branch comparisons; it does not assert full open-PR coverage, live performance or successful execution of a test suite. No production files were modified.
