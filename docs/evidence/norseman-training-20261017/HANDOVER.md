# Fjord to Summit — a Norseman training room (handover, 2026-10-17)

Branch `feature/norseman-training-room` in worktree `~/Developer/konam-norseman`, cut from the recovery runtime
(`konam-room-recovery`, 363848c) that serves the portfolio's concept rooms. Not pushed, not deployed.

Open locally: serve the repo root and visit `index.html?reviewRoom=norseman-training` (same host, cards, navigation and
`room=beast` slot as NOR // 3, Beast Cave and Breitling × KONA).

## What the room is

An 8.4 m timber-and-concrete training hall, glazed on two sides:

- **South glass:** the real head of the Hardangerfjord at Eidfjord, where the swim lands, seen from the water.
- **East glass:** the real Gaustatoppen, seen from 3 km to the south, where the run ends.
- **Skylight:** over the profile ridge.

Inside:

- **Swim:** a 21 m cold lap pool runs along the fjord glass at the fjord's own waterline, with a ferry ramp at its head. The wetsuit rack and a sourced water-temperature post sit beside it.
- **Spine:** the course profile, sculpted in stone, climbs to a summit cairn against the mountain.
- **Bike:** a road-triathlon bike on a climbing trainer with a fan and a session screen, plus a second bike on the work stand.
- **Run:** an incline treadmill facing the mountain, with a hill-session screen.
- **North wall:** the crew table and the mandatory summit backpack, an example training week, and the black and white finisher tops.
- **Light:** a low dawn sun through the east glass lays the mullion shadows down the hall.

## Reused vs new

| Element | Decision | Source |
|---|---|---|
| Road-triathlon bike (×2, instanced) | REUSE | `assets/atlas/studio-wing-road/bike.glb` (unbranded atlas type) |
| Curved treadmill, drum fan | REUSE | Beast Cave generated GLBs (`assets/rooms/beast-cave/`) |
| Decor instancing, env capture, motes, light shafts, mist, lettering, cards, host runtime | REUSE | `engine/decor.js`, `engine/env-capture.js`, `roomkit.js`, host |
| Trainer frame, riser, bottles, suit extrusion, rock generator, water/floor approach | ADAPT | `nor3-winter.js` |
| Terrain pipeline | ADAPT | bellagio `tools/build_geo_world.py` (St. George) without its satellite imagery → `tools/build_norseman_terrain.py` |
| Window portal (`engine/terrain-portal.js`) | NEW primitive | Needed because the Breitling room sits behind the south wall and the Secret Collection behind the east wall; reusable by any room |
| Terrain data (Eidfjord, Gaustatoppen; 132 KB each) | NEW data | Terrain Tiles z12; Norway terrain data © Kartverket, CC BY 4.0 |
| Profile ridge, hall, pool, gear/crew/week/tops | NEW / COMPOSE | procedural, original, unbranded |

No new GLB files. Full decisions: `world/konam/candidates/norseman-training-asset-manifest-v1.json`.

## Truth and rights

- **Facts:** every fact shown comes from `pitch/norseman-training/course-facts-v1.json`, cited to Wikipedia, Slowtwitch (2025 race guide) and nxtri.com. The nxtri race-week page was found via search but returned 404 on direct fetch, so every nxtri line also cites another source.
- **Where sources disagree:** on total bike climbing, the room says so rather than picking a number.
- **Profile:** anchor heights are sourced; the line between anchors, the plateau and the horizontal spacing are interpretation, and the cards say so.
- **Terrain:** the land shapes are real, built at 1:10. Shading, snow, forest, mist, sun and ferry are KONA.m code. The two views are arranged around one room, and their real distance apart is not shown. This is stated in the window card and on a credit line over the glass.
- **Labelling:** the training week and session screens are labelled as examples, not coaching advice.
- **Marks:** no official logo, mark or photography. The room is labelled an independent concept with no affiliation.

## Checks run (this branch)

- `node --test web/test/*.test.mjs`: 475/475 pass. This includes the new `web/test/norseman-training.test.mjs` and the recovery lock test; `engine/decor.js` is left untouched because the lock pins it.
- `node tools/validate-room-package.mjs norseman-training`: ok.
- The authority, brand, repo hygiene, public-surface privacy and `validate-bikes` checks all pass.
- `tools/build_pages.mjs` and `tools/build_app.mjs` were rebuilt and the generated `app/` and `sw.js` are committed. `sitemap.xml` is left alone because only its date changes.
- Visual evidence (this folder): desktop 1440×900 (10 shots), phone 390×844 (4) and landscape 844×390 (2), captured with `web/norseman-training-evidence.mjs`. No page errors. `runtime-summary.json` has the numbers:
  - desktop: 99 room meshes, 77k triangles (budget 190 / 450k)
  - phone: 95 meshes, 60k triangles (budget 110 / 220k), 60 fps in headless Chrome

## Known limits

- **Headless harness:** the existing software-GL harness (`final-room-recovery-evidence.mjs`, now listing this room) times out on this Mac, so the hardware-GL script was used. It has not been run in CI or on a real phone.
- **Portal cost:**
  - The window portal is an extra render pass of about 264k terrain triangles on desktop and about 66k on phones (half-resolution target).
  - It is not counted in the room budget above, which counts only the room group.
  - The phone figure of 60 fps was measured in headless Chrome, not on a device.
- **Desktop frame rate:** desktop fps (~30 headless) is dominated by the host scene (about 1,450 calls for the whole museum), as with the other review rooms.
- **Terrain resolution:** the 95 m grid smooths the summit (1,858 m in the data against 1,883 m mapped). The terrain is shaded by rule, not imagery, and trees are simple instanced cones.
- **Parallax lag:** window reflections in the floor use a gradient fallback rather than the real view.
- **Ridge shape:** the ridge's run end is steep by design (1,880 m over the last stretch) and reads as a sharp summit.
- **Phone assets:** the bike study has no `bike-lite.glb`, so phones load the 172 KB full bike.

## Adding it to the portfolio (Worlds/Concepts)

The portfolio's concept rooms open the `kona-recovered` runtime (`bellagio/worlds/vegas/kona-rooms/index.html`). That
published copy needs this branch built and published there first; that step needs your go-ahead. Then add to
`apps/spatial-studio/ROOM_COLLECTIONS.json` → `concepts`:

```json
{
  "id": "norseman",
  "projectId": "konam",
  "title": "Fjord to Summit",
  "subtitle": "Norseman / a training room",
  "category": "Events",
  "description": "A training hall between two real places: the Hardangerfjord through one wall, Gaustatoppen through the other. A cold pool, a climbing bike, an incline run and the course profile in stone show how you prepare for a race that starts with a ferry jump and ends on a mountain.",
  "application": "Event preparation · training stories · destination experiences",
  "posterProjectId": "konam",
  "posterPath": "atlas-norseman.jpg",
  "status": "Review room experience",
  "sourceNote": "An independent concept, not affiliated with the race. Terrain heights © Kartverket (CC BY 4.0); sources stay inside the experience.",
  "runtimeId": "kona-recovered",
  "entryQuery": "reviewRoom=norseman-training&room=beast",
  "cardProblem": "Cold water, long climbs and a run that ends on a mountain, in one room."
}
```

The poster can be `desktop-hero.jpg` from this folder, copied as `atlas-norseman.jpg` where the portfolio keeps posters.
