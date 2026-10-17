# Fjord to Summit — a Norseman training room (handover, 2026-10-17)

Branch `feature/norseman-training-room` in its own worktree, cut from the recovery runtime
(recovery branch, 363848c) that serves the portfolio's concept rooms. Not pushed, not deployed.

Open locally: serve the repo root and visit `index.html?reviewRoom=norseman-training` (same host, cards, navigation and
`room=beast` slot as NOR // 3, Beast Cave and Breitling × KONA).

## What the room is

An 8.4 m timber-and-concrete training hall, glazed on two sides:

- **South glass:** the real head of the Hardangerfjord at Eidfjord, where the swim lands, seen from the water.
- **East glass:** the real Gaustatoppen, seen from about 2.5 km west-south-west (a viewpoint chosen from the data for a clear line of sight; the summit stands 18.5° above the horizon), where the run ends.
- **Skylight:** over the profile ridge.

Inside:

- **Swim:** a 21 m cold lap pool runs along the fjord glass at the fjord's own waterline, with a ferry ramp at its head. The wetsuit rack and a sourced water-temperature post sit beside it.
- **Spine:** the course profile as a stacked contour model (one slate slab per 100 m, oak every 500 m) climbs to a summit cairn against the mountain, with a light line tracing the true profile.
- **Bike:** a road-triathlon bike on a climbing trainer with a fan and a session screen, plus a second bike on the work stand.
- **Run:** an incline treadmill facing the mountain, with a hill-session screen.
- **North wall:** the crew table and the mandatory summit backpack, an example training week, and the black and white finisher tops.
- **Light:** a low dawn sun through the east glass lays the mullion shadows down the hall, with light shafts through each east bay. The only computed lights are the shadowed sun and one soft area light from the fjord glass; station light is additive floor pools and wall washes (two draws). Every real light is paid by every lit material in the museum, so this is what keeps the room fast.
- **Dawn:** alpenglow (rose-gold) on sunlit high ground with cool blue shadows; opposite the low sun, the Earth's shadow and the Belt of Venus on the horizon, under heavier cloud lit from below.
- **Forest:** a dense spruce band along the fjord shore with birch by the water, thinning with height.
- **Recovery:** a lit Nordic sauna in the south-east corner, a few steps from the cold pool.
- **Detail:** a working swim pace clock over the pool head, a swim shelf, spare wheels and a helmet, a strength corner, and poles with a headlamp by the treadmill.

## Reused vs new

| Element | Decision | Source |
|---|---|---|
| Road-triathlon bike (×2, instanced) | REUSE | `assets/atlas/studio-wing-road/bike.glb` (unbranded atlas type) |
| Curved treadmill, drum fan | REUSE | Beast Cave generated GLBs (`assets/rooms/beast-cave/`) |
| Decor instancing, env capture, motes, light shafts, mist, lettering, cards, host runtime | REUSE | `engine/decor.js`, `engine/env-capture.js`, `roomkit.js`, host |
| Trainer frame, riser, bottles, suit extrusion, rock generator, water/floor approach | ADAPT | `nor3-winter.js` |
| Terrain pipeline | ADAPT | bellagio `tools/build_geo_world.py` (St. George) without its satellite imagery → `tools/build_norseman_terrain.py` |
| Window portal (`engine/terrain-portal.js`) | NEW primitive | Needed because the Breitling room sits behind the south wall and the Secret Collection behind the east wall; reusable by any room |
| Terrain data (Eidfjord, Gaustatoppen; 296 KB each) | NEW data | Terrain Tiles z13, 385×385; Norway terrain data © Kartverket, CC BY 4.0 |
| Fjord mirror | REUSE | three's `Water.js` (desktop); a plain water material on phones |
| Terrain self-shadow | NEW | baked at load in `terrain-portal.js` (march to the sun over the heightfield) |
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
  - desktop: 122 room meshes, 86k triangles (budget 190 / 450k)
  - phone: 110 meshes, 70k triangles (budget 110 / 220k), 60 fps in headless Chrome

## Known limits

- **Headless harness:** the existing software-GL harness (`final-room-recovery-evidence.mjs`, now listing this room) times out on this Mac, so the hardware-GL script was used. It has not been run in CI or on a real phone.
- **Portal cost:**
  - The window portal is an extra render pass of about 590k terrain triangles plus about 12k trees and a fjord mirror on desktop, and about 66k triangles on phones (half-resolution target, no mirror).
  - It is not counted in the room budget above, which counts only the room group.
  - The phone figure of 60 fps was measured in headless Chrome, not on a device.
- **Desktop frame rate:** the room was profiled feature by feature on the Mac GPU (headless Chrome, ANGLE Metal):
  - The cost was the lights, not the landscape. Five spotlights, two point lights and three area lights were each paid by every lit material in the museum.
  - Removing them brought Norseman level with or ahead of Breitling × KONA in the same session (most recently 19.6 against 18 fps, with NOR // 3 at 13.6).
  - Absolute fps varies with machine load. The host museum (about 1,500 draw calls) sets the ceiling.
  - It has not been checked in a real, non-headless browser or on a phone.
- **Terrain resolution:** the grid still smooths the summit slightly (1,867 m in the data against 1,883 m mapped). The terrain is shaded by rule, not imagery, and the trees are low-poly instanced spruce.
- **Reflections:** floor, glass and pool reflections capture the real landscape once, through the env capture, so they don't update as clouds drift.
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

## Landscape pass (after fd1f79a)

The interior already read well; the landscape behind the glass looked dated. This pass rebuilt it:

1. **Aerial perspective.** One shared helper (`withAerial` / `aerialWater` in `engine/terrain-portal.js`) lightens and blues terrain, trees and fjord water with distance, more strongly in low valley air. It runs at about 9 % per real kilometre, with the haze at mid-tone so far ridges go blue rather than white. It replaces the scene fog.
2. **Terrain shading** comes from the real elevation and slope, with no imagery:
   - a textured conifer canopy band below a ragged treeline
   - meadow and heath above it, then lichen
   - grey scree streaked down the fall line on steep faces
   - snow above the snowline, first in hollows and on the shaded side
   - dark wet rock for the first metres above the water
3. **Forest stands, not singles.** There are four silhouettes each of spruce and birch, instanced as 8 meshes per site:
   - Trees grow in clusters of about 14–60 whose density falls with altitude and slope, up to the treeline. Birch dominates the Eidfjord shore.
   - About 16,000 trees at Eidfjord and 7,200 at Gaustatoppen on desktop, about 3,200 at Eidfjord on phones.
   - Beyond the instanced range, the shader's canopy band carries the forest.
4. **Fjord.** The mirror target is now 1024², with gentler ripple normals, a darker deep-water tint and the same air as the land. The Water.js mirror technique is kept.
5. **Treeline.** The Gaustatoppen treeline is set to 1,080 m, inside the real Telemark birch-woodland range, which corrects the beige near slopes.

Before/after pairs: `landscape-before-after/` (desktop fjord, hero, mountain, pool; phone fjord, mountain). The before frames are in `before-landscape/`, captured from fd1f79a.

| | room meshes | room triangles | capture fps (mean) |
|---|---|---|---|
| desktop before → after | 122 → 122 | 86,416 → 86,416 | 60.3 → 60.2 |
| phone 390 before → after | 110 → 110 | 70,432 → 70,432 | 60.2 → 60.2 |

- **Full-frame median, same session:** Norseman 71.9, Breitling × KONA 69, NOR // 3 35.8 fps (headless Chrome, ANGLE Metal, 1440×900).
- **Room budgets:** the fake station light is unchanged, and the room budgets (desktop 190 / 450k, phone 110 / 220k) still hold.
- **Not in those budgets:** the portal's own triangles (terrain, about 23,000 trees and the mirror) sit outside the room group and are not counted there. They are covered by the full-frame fps above.
- **Not yet verified:** a real (non-headless) browser and a phone.
- **Tree count:** the phone tree count is the lever if a device runs slow.
