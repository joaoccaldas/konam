# Repository weight & duplication audit — 2026-10-03

## Snapshot

- tracked blobs: 1,019
- logical tracked bytes: 111,017,079 bytes (~105.9 MiB)
- exact duplicate groups: 30
- extra duplicate paths: 34
- logical duplicate bytes across paths: 21,039,751 bytes (~20.1 MiB)
- important: exact duplicate paths share the same Git blob SHA, so Git object storage does not store those bytes repeatedly. They still add checkout/build/path complexity and can duplicate packaged files when both paths are copied.

## Largest logical areas

| Area | Logical size |
| --- | ---: |
| assets/ | ~38.0 MiB |
| web/ | ~20.6 MiB |
| blender/ | ~10.4 MiB |
| renders/ | ~7.5 MiB |
| app/ | ~6.9 MiB |
| six root Speedmax viewer HTML files | ~18.2 MiB combined |

## Largest individual files

The largest files are the six direct bike viewer HTML pages:

- Speedmax_Museum.html — 3,650,865 bytes
- Speedmax_SLX_Museum.html — 3,578,804 bytes
- Speedmax_CF_2011_Museum.html — 2,999,943 bytes
- Speedmax_AL_2011_Museum.html — 2,989,697 bytes
- Speedmax_2007_Museum.html — 2,974,477 bytes
- Speedmax_Three_2005_Museum.html — 2,936,651 bytes

These are large by design because the legacy direct-viewer build embeds the full GLB as base64 into the HTML and also bundles the Three.js viewer JavaScript. The same GLBs also exist separately under assets/. This is the largest meaningful payload duplication in the current product.

Other large files are expected source/evidence assets:
- calibration_overlay.png (~2.9 MiB)
- frame_tris.npz (~2.3 MiB)
- canonical bike GLBs (~1.5–2.1 MiB each)
- generated runtime bundles such as app/hall.js (~0.93 MiB)

## Exact duplicates

### Intentional generated mirrors

The six large viewer HTML files are mirrored byte-for-byte under web/dist/.

Examples:
- Speedmax_Museum.html == web/dist/Speedmax_Museum.html
- Speedmax_SLX_Museum.html == web/dist/Speedmax_SLX_Museum.html
- heritage viewer pages have the same pattern

Why they exist:
- tools/build_pages.mjs explicitly mirrors hardened root pages into web/dist.
- tools/build_collection.mjs also writes/copies collection/viewer pages to web/dist.
- CI currently asserts web/dist generated outputs are current.

Why this is not a live-site performance problem:
- tools/stage_site.sh publishes root HTML and an explicit allowlist; it does not publish web/dist/.
- Android now packages the same staged _site allowlist, not web/dist/.

Conclusion:
web/dist is now primarily a generated compatibility/build boundary. It is a strong candidate for a later cleanup, but removing it requires changing build scripts and CI contracts together.

### Android resource duplicates

Many day/night splash images are byte-identical between Android resource qualifiers.

Why they exist:
Android requires density/orientation/resource-qualifier paths. Identical bytes can legitimately appear at multiple resource paths even when the visual is intentionally the same. Git stores identical blobs once.

Conclusion:
keep unless the native resource strategy changes. Low priority.

### PWA/icon duplicates

Some icon/maskable pairs are byte-identical.

Conclusion:
small and sometimes intentional because manifests require different semantic roles. Not worth a risky cleanup before launch.

### Documentation mirrors

Examples include:
- docs/FIT_RESEARCH_AND_ROADMAP.md
- docs/reference-canyon/FIT_RESEARCH_AND_ROADMAP.md
- web/dist/docs/FIT_RESEARCH_AND_ROADMAP.md

The reference-canyon copy preserves provenance/history; web/dist/docs is generated compatibility output.

Conclusion:
do not collapse provenance copies blindly.

### Accidental duplicate found

assets/kona-years/src/scene0.jpg is byte-identical to assets/kona-years/src/g0.jpg.

- g0.jpg is referenced by museum/kona_years.json.
- scene0.jpg has no code/data references in the repository.

Action:
remove scene0.jpg as an orphan exact duplicate.

## Generated JavaScript bundles

Large generated bundles include:
- app/hall.js ~0.93 MiB
- app/studio.js ~0.75 MiB
- app/race-self-stage.js ~0.65 MiB
- app/collectible-stage.js ~0.63 MiB
- app/admin-asset-preview.js ~0.61 MiB

These are not exact duplicates, but several bundle Three.js independently. They are intentionally lazy-loaded so the front door does not pay the entire 3D cost up front.

Conclusion:
do not merge them into one giant bundle. A future shared vendor/chunk strategy could reduce repeated library bytes, but only after measuring browser cache behavior and preserving lazy loading.

## Recommended order

1. Remove proven orphan exact duplicates.
2. Keep Room Studio / Beast Cave work isolated from repository-weight refactors.
3. Prototype de-embedding GLBs from direct viewer HTML:
   - retain the same canonical GLB assets
   - load them by URL through GLTFLoader
   - preserve service-worker offline behavior
   - validate direct links, PWA, Android and heritage viewers
4. If that succeeds, direct viewer HTML should shrink by roughly the base64 GLB contribution (about 2–3 MiB per page) and duplicate transfer/storage inside packaged site surfaces disappears.
5. Only after that consider deleting tracked web/dist mirrors and making them CI-only generated artifacts.

## Non-goals

This audit does not recommend deleting:
- Blender calibration/evidence data merely because it is large
- canonical bike GLBs
- source photography with provenance
- Android density-qualified resources without a native packaging change
- historical/reference documentation solely to reduce byte count
