# BREITLING × KONA · The Finish-Line Atelier (2026-10-04)

**Review route:** `?reviewRoom=breitling-kona` (review only, not public).
**Source:** `web/src/breitling-kona.js`
**Room package:** `world/konam/rooms/breitling-kona.room.json` (candidate)
**Collection data:** `pitch/breitling-kona/collection-v1.json`
**Watch generator:** `blender/watch_build.py`

## 1. The current Breitling room (`before-*.jpg`)

| What's there | Verdict |
|---|---|
| One ~7k-triangle "chronograph" on a plinth | It reads as a chrome puck edge-on: no dial, no hands, and the bracelet renders as spikes. No detail survives a close look. |
| Grey box room, flat fill light, neon door outlines | No mood and no depth. It looks like a blockout. |
| A huge red "BREITLI…" wordmark on the back wall | It is cropped, and it contradicts the room's own text ("No logo, wordmark… is used"). |
| Story: one chronograph, a 17-hour dial, swim/bike/run portals | The race-clock idea is good, but nothing connects it to Kona or to Breitling's real IRONMAN watches. |

Score: **concept 4/10, craft 2/10, truth/rights 3/10.** Not a room a partner would share.

## 2. The concept

**One line:** *every second of Kona, measured.*

Four zones, one clock:
1. **Threshold.** You enter a dark lava hall. Two red hairlines run along the ceiling. The walls read *17 HOURS · 3.8 · 180 · 42.2 · ONE CLOCK* and *EVERY TENTH OF A SECOND, ON THE ISLAND*.
2. **The monument.** An Endurance Pro geometry study at 50:1 (2.2 m) floats over a lava dais split by molten seams. Every 17 seconds it comes apart (crystal, compass bezel, dial, hands, quartz module, case, caseback, strap) and goes back together. You can tap it to hold it open. The explosion runs through the shared `machine-inspection.js` kernel.
3. **The race-clock ring.** 17 hours are set into the floor around the dais: the swim cut-off at 2:20, the bike cut-off at 10:30 and the finish at 17:00, with one sweep of light every minute.
4. **The collection.** Six real IRONMAN® editions from breitling.com stand in vitrines along the walls, each lit in its own strap colour:
   - World Championship: 2022, 2024, 2025, 2026
   - 70.3 World Championship: 2025, 2026

   Each plaque shows the year, the event, the case, the reference, the edition size and the price. Each card links to the product page on breitling.com.
5. **The island.** A letterbox window at the far end frames a Kona sunset.

Mood: near-black, with light only from the window, the monument key, molten seams, vitrine pools and a cool rim. The room uses the existing Breitling sound bed (drone plus a tick each second).

## 3. How it is built (the repeatable pipeline)

| Piece | Method | Cost |
|---|---|---|
| Watch | `blender/watch_build.py`, a deterministic parametric chronograph from the public spec (44 mm, 12.5 mm, compass bezel with 60 scallops, three counters, crown and pushers, 22/20 strap on a display loop, tang buckle). The hero build adds an illustrative quartz module. Every object carries `part` + `explode`; dial, bezel and caseback get planar UVs | Hero 16.6k triangles / 156 KB; lite 6.1k / 71 KB (meshopt) |
| Faces | Canvas prints over a per-edition dial colour (shader mix), so one GLB serves every edition | 2 textures |
| Six vitrine watches | `engine/decor.js` `bake` + `instance`: one InstancedMesh per material, with dial, strap and accent colours per instance | ~12 draws for all six |
| Floor | Polished basalt with shader fissures (fbm veins glowing toward the dais, slow pulse) | 1 draw |
| Clock ring | Ring with an angle-UV shader for ticks, segments and the sweep | 1 draw |
| Window | The NOR // 3 Kona plate, reused (right half) | 0 new assets |

Measured (`metrics.json`):

| | Room meshes | Room triangles | Scene calls | Errors |
|---|---|---|---|---|
| Desktop | 102 | 63k | 322 | 0 |
| Phone | 86 | 49k | 73 | 0 |

## 4. Truth and rights

- **Product facts:** every edition, reference, edition size, price, material and spec comes from breitling.com product pages and is cited per edition.
- **Colours:** dial colours for four editions are marked `verify`. Breitling's pages were summarised inconsistently, so they must be confirmed against product imagery.
- **Commission:** reported by the creator; written approval is not yet recorded. Until `commission.marks_allowed` is true with an `approval_ref`, the room shows the brand name in plain type only. There is no logo, no IRONMAN® mark and no product photography, and the dials carry no brand text.
- **The watch is a geometry study, not a replica.** The movement is illustrative and labelled as such. When Breitling supplies CAD and brand assets, the GLB is swapped by part name and the marks gate opens. The room needs no other change.
- **Old room:** its wordmark conflicts with its own "no wordmark" text. Fix or retire it when the atelier replaces it.

## 5. What Breitling would need to send to make it final

1. Written approval and brand guidelines: logo, IRONMAN co-branding rules, approved copy.
2. CAD or high-resolution product imagery for the six editions: dial print, strap texture, caseback engraving.
3. Movement imagery or a cutaway of Caliber 82, if they want the exploded view to be exact.
4. Their preferred product links, regional prices and any launch (e.g. a Kona 2026 edition reveal) to stage in the monument slot.
