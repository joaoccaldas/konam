# Content — how to add wings, rooms, bikes, liveries, paintings and sculptures

Everything a visitor sees in the data-built wings is **data**. Code builds it; nothing about a
particular room, bike or artwork is written into `web/src`. The build (`node web/build_landing.mjs`)
reads these files and injects them into the page; `cd web && npm test` validates them.

```
museum/
  world/wings/index.json          ← the wings, in order
  world/wings/<wing>.json         ← corridor, doors, rooms, what hangs and stands in each room
  atlas/bikes.json                ← every non-Canyon bike: skeleton, facts, reference photo, liveries
  skins/museum.json               ← museum liveries (hall finishes, theme rooms, Lava Night)
  art/paintings.json              ← paintings: title, text, file, provenance
  art/sculptures.json             ← sculptures: title, text, file, size, plinth, provenance
  sources/                        ← ORIGINAL records, kept verbatim (see “Sources” below)
assets/
  atlas/<bike>/bike.glb           ← built by blender/atlas_build.py
  atlas/ref/*.jpg                 ← reference photographs (Wikimedia Commons, credited)
  art/paintings/*.jpg             ← paintings (≤ 1280 px)
  art/sculptures/*.glb            ← sculptures (meshopt + WebP, ≤ 0.5 MB)
```

## A wing

`museum/world/wings/<id>.json`, then add the file name to `index.json`.

| Field | Meaning |
|---|---|
| `id`, `name`, `sub`, `order` | identity; `name`/`sub` are painted over the entrance and shown on the map and rail |
| `floor`, `y`, `height` | which map floor, floor height and wall height (m) |
| `corridor` | `{x0,x1,z0,z1,style,map_color}`; `style`: `velodrome` (boards with track lines) or `gallery` (oak with a runner) |
| `sides` | `east`/`west` x-ranges for the rooms either side |
| `doors` | `south` (entrance; `depth` > 0 lays a threshold), optional `north` (continues into the next wing) |
| `south_wall_gap` | where the wing meets an existing building (walls are built either side of it) |
| `features.clock` | a two-faced station clock hanging over the corridor at `z` |
| `rooms[]` | see below |

Wings join end to end: a wing with a `north` door opens into the next wing's `south` door.
`web/test/app.test.mjs` walks the lane from the nave through every door and into every room.

## A room

`{ id, name, sub, side, z0, z1, tint, wall, ink, paintings[], sculptures[], plates[], feature }`

- `tint` accents (plinth ring, subtitle, map), `wall` is the feature wall behind the exhibits, `ink` the room name.
- `paintings`: ids from `museum/art/paintings.json`. With bikes in the room they hang on the side walls (≤ 4); without, on the back wall first (≤ 6).
- `sculptures`: ids from `museum/art/sculptures.json`, placed on white plinths sized from the catalogue.
- `plates`: big numbers on a wall, e.g. `{ "wall": "south", "lines": [["49.431", "KM · MERCKX · MEXICO CITY · 1972"]] }`.
- `feature`: `paintshop` (turntable + every livery as a swatch) or `references` (every reference photograph).
- **Bikes join a room from the bike side:** set `"room": "<room id>"` in `museum/atlas/bikes.json`.

## A bike

Add an entry to `museum/atlas/bikes.json` (see `docs/ATLAS.md` for every field), then:

```bash
python3 blender/atlas_build.py <key>        # GLB → assets/atlas/<key>/bike.glb
python3 blender/atlas_preview.py <key>      # side view → renders/atlas/<key>.png
node tools/validate-bikes.mjs               # asset contract
```

Facts carry an evidence class: **P** published, **F** read from the photograph, **I** inferred for the
model. Type studies name no maker. Never recolour a Canyon and call it another brand.

## A livery

A skin in `museum/skins/museum.json` or in a bike's `skins` (format in `docs/ARCHITECTURE.md`).
`kind`: `photo` (sampled from the reference photograph), `studio` (a museum finish), `archive`
(documented factory finish), `dye`, `theme`. Every livery appears in the Paint shop automatically.

## A painting or a sculpture

1. Make or obtain it, and **save the original record** in `museum/sources/` (the provider's raw
   response: job id, model, prompt, dates, URLs, costs; or the licence page for a photograph).
2. Put the file in `assets/art/paintings/` (JPEG ≤ 1280 px) or `assets/art/sculptures/` (GLB,
   `npx gltf-transform optimize in.glb out.glb --compress meshopt --texture-compress webp --texture-size 1024`).
3. Add the catalogue record with `provenance.source_record` pointing at step 1.
4. Name it in a room.

AI-generated works are labelled as such on the wall and on the card (evidence class **G**).

## Sources (original data)

| Folder | What | Kept as |
|---|---|---|
| `museum/sources/higgsfield/paintings-20260929.json` | 12 painting generations (Higgsfield `gpt_image_2_5`) | provider response: job id, prompt, size, URL, time |
| `museum/sources/higgsfield/sculptures-20260929.json` | 3 sculpture generations (Higgsfield `meshy_v6_text_to_3d`) | provider response + optimisation command |
| `museum/atlas/bikes.json` → `ref` | Wikimedia Commons photographs | title, page, author, licence (see `docs/ATLAS.md`) |
| `museum/wyld_room.json`, `museum/kona_*.json`, `museum/heritage/*` | earlier sources | unchanged |

Higgsfield project: *Canyon Museum — Kona Light wing* (`3cdaf07a-599a-4edc-9774-a736ee33bef8`).
Cost of this round: 12 × 0.25 + 3 × 25 = 78 credits.
