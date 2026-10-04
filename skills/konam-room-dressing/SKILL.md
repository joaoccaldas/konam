---
name: konam-room-dressing
description: Find, add, move, remove and tune a room's decoration, props, bikes, generated art and signage through decor manifests, with provenance, budgets and evidence. Use for any room, triathlon or not, whenever the job is "put things in a space and make it look finished".
---

# Kona.m Room Dressing

Dressing is data. A room's movable things live in `world/konam/rooms/<room>.decor.json` and are placed by `web/src/engine/decor.js`; the room module keeps only what is genuinely bespoke (architecture, story surfaces, shaders). Read `konam-room-studio` for the room contract and `konam-bike-forge` for bikes.

## The manifest

```json
{ "schema_version": 1, "room_id": "<room package id>", "variant": "<review id>", "runtime": "web/src/<room>.js",
  "items": [
    { "id": "lane-bikes", "kind": "bike", "ref": "<atlas key>", "at": [[x, y, z, yawDeg, scale?]], "rights_ref": "<asset manifest>" },
    { "id": "drum-fans",  "kind": "glb",  "ref": "assets/rooms/.../x.glb", "height": 0.55, "tint": 0.5, "lite": "skip", "at": [[...]], "rights_ref": "..." } ],
  "shots": { "hero": [x, z, eyeDrop, lookX, lookY, lookZ] } }
```

- several placements of one item = instancing for free (one draw per material for all copies)
- `kind: bike` loads `assets/atlas/<ref>/bike.glb` (`bike-lite.glb` on phones), hub-aligned; `kind: glb` scales to `height`
- `lite: "skip"` drops an item on phones; `lite_ref` swaps a lighter file
- the room can derive layout from the manifest (NOR // 3 reads its lanes from `lane-bikes`), so moving one line moves a whole station
- `shots` are the evidence cameras

## Commands

```
node tools/decor.mjs list [room]                 what is in each room
node tools/decor.mjs find <text>                 decor items, atlas bikes, room assets
node tools/decor.mjs add <room> <id> --kind glb --ref <path> --at x,y,z,yaw --height h --rights <manifest>
node tools/decor.mjs place|move|remove <room> <id> ...
node tools/decor.mjs validate                    refs exist, ids unique, rights recorded (CI: web/test/decor.test.mjs)
node tools/room-evidence.mjs --review <id> [--shots a,b] --metrics --out docs/evidence/<dir>
```

## Getting assets (cheapest truthful first)

1. REUSE: `decor.mjs find`, `assets/`, other rooms' manifests (the NOR fans are the Beast Cave fans).
2. Procedural in the room module when it is architecture or needs a shader (floors, glass, fire, water, snow).
3. Blender generator for bikes (`konam-bike-forge`); deterministic Blender scripts for other hero objects.
4. Higgsfield: image (`gpt_image_2_5`) for plates/art; image → `generate_3d` (Meshy) for generic props, then `gltf-transform optimize --texture-size 1024 --texture-compress webp --compress meshopt`. Prompt for "no text, no logos, no people". Record job id, hash, rights `generated-unbranded-rights-review`.
5. Never runtime-load concept art as evidence; never ship a third-party mark or a likeness without a source and approval.

## Making it look finished (what worked)

- **Light from objects**: RectAreaLight from windows/screens, warm practicals (fire, candle, bulbs), painted additive washes on walls, LED strips with additive floor glow. One shadow-casting key for a cluster, not one per object.
- **Wet / glossy floors**: canvas colour + roughness puddles + Sobel normal map; reflections from one local cube capture limited to the room's layer (re-taken only when it changes); a faded flipped copy of a bright backdrop on the floor.
- **Depth through glass**: a generated plate a few metres behind the glass + real 3D foreground (palms, rocks) + GPU particles (snow) between.
- **Lived-in detail**: towels as folded cloth geometry with terry normals and sheen; books, mug, notebook, candle as tiny procedural props with canvas labels; rocks as noise-displaced icosahedra with a bump map — never flat-shaded crystals.
- **Text and jokes**: canvas typography on panels/paintings; data-driven from a sourced facts file; jokes may never state something the numbers do not (The Fjord Times flips "closing in" / "overtakes" from the data); label editorial copy as the room's, never the athlete's words.

## Budgets and checks

- Merge static architecture per material; instance repeats; keep text planes few and large.
- GPU-animate particles/flames/water (uniform time, no per-frame CPU loops).
- Phones: lite bikes, skip heavy props, fewer particles, no realtime shadows.
- Receipt from `room-evidence.mjs --metrics` must be inside the room package budgets on phone and desktop; attach it to the evidence folder.
- Inspect every render yourself: composition, readability, nothing floating/intersecting, mobile crop.
