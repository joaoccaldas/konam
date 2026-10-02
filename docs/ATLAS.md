# Against the Clock — the time-trial wing

An upper-floor wing north of the galleries nave (through the doorway in the nave's north wall).
Nine time-trial bicycles from beyond Canyon: six named machines, each rebuilt from an
open-licensed photograph, and three type studies that name no maker. Every bike has three
liveries you can switch live.

## Rooms

| Room | Side | Holds |
|---|---|---|
| The corridor | — | Velodrome boards (measurement line, sprinters' line, blue band), skylights, a working clock on the end wall |
| The Hour | east | Eddy Merckx Hour bike (1972), Graeme Obree's bikes (1993); the two distances on the wall |
| Monocoque | east | Lotus Type 108 (1992), Zipp 2001 (1990s) |
| Long course | east | Stevens triathlon bike, aluminium triathlon bike (2005) |
| Types | west | Funny bike (1980s), track pursuit bike, disc-brake triathlon superbike |
| Paint shop | west | A turntable that works through every bike and livery; a swatch wall (touch to paint) |
| References | west | Every photograph the wing was built from, credited |

## How a bike is made

`blender/atlas_build.py` reads `museum/atlas/bikes.json` and builds each bike from its own skeleton:
frame architecture (`diamond`, `superbike`, `monocoque`, `beam`, `funny`, `pursuit`), tube sections
(`round`, `aero` teardrop, `kamm` truncated), wheels (`spoked`, `disc`, `trispoke`), bars (`aero`,
`drop`, `bullhorn`, `narrow`) and geometry (stack, reach, angles, lengths, wheel sizes). Proportions
are scaled from the reference photograph with the wheel as the ruler (700c tyre ≈ 668 mm). Tube
depths are a silhouette study.

```bash
pip install bpy            # Blender 5.0 as a Python module (or run inside Blender 5.x)
python3 blender/atlas_build.py            # → assets/atlas/<key>/bike.glb  (~8–9k triangles, ~150–180 kB each)
python3 blender/atlas_preview.py          # → renders/atlas/<key>.png (Cycles, CPU)
node web/build_landing.mjs && node tools/harden_pages.mjs
```

At runtime `web/src/atlas.js` merges each GLB into one mesh per material (a bike costs about
ten draw calls) and re-dyes `paint_frame`, `paint_accent`, `disc_face`, `rim`, `bar_tape`, `saddle`
for a livery.

## Evidence

Each fact on a card carries a class: **P** published fact, **F** read from the photograph,
**I** inferred for the model. Liveries marked *photo* are sampled from the reference photograph;
*studio* liveries are museum finishes and are labelled as such.

Rules kept from the hall: no Canyon model is recoloured and presented as another brand; type
studies name no maker; no logos are reproduced.

## Photographs (Wikimedia Commons)

| File | Author | Licence | Used for |
|---|---|---|---|
| [EddyMerckxHourRecordBike.jpg](https://commons.wikimedia.org/wiki/File:EddyMerckxHourRecordBike.jpg) | David Edgar | CC BY-SA 3.0 | Merckx Hour bike |
| [Eddy Merckx bike - Mexico City 1972.JPG](https://commons.wikimedia.org/wiki/File:Eddy_Merckx_bike_-_Mexico_City_1972.JPG) | eugenio.baccarini | CC BY-SA 4.0 | References room; 49.431 km read from the display board |
| [Graeme Obree display at the Riverside Museum.jpg](https://commons.wikimedia.org/wiki/File:Graeme_Obree_display_at_the_Riverside_Museum.jpg) | Ed Webster | CC BY 2.0 | Obree's bikes |
| [Lotus 108 (24281585325).jpg](https://commons.wikimedia.org/wiki/File:Lotus_108_(24281585325).jpg) | Paul Hudson | CC BY 2.0 | Lotus Type 108 |
| [Lotus sport bike Glasgow Transport Museum.jpg](https://commons.wikimedia.org/wiki/File:Lotus_sport_bike_Glasgow_Transport_Museum.jpg) | Jordanhill School D&T Dept | CC BY 2.0 | References room |
| [Zipp frames.jpg](https://commons.wikimedia.org/wiki/File:Zipp_frames.jpg) | Nfreeman2 | Public domain | Zipp 2001 (both photo liveries) |
| [Stevens triathlon bicycle.JPG](https://commons.wikimedia.org/wiki/File:Stevens_triathlon_bicycle.JPG) | Ximeg | CC BY-SA 3.0 | Stevens triathlon bike |
| [Triathlonrad.jpg](https://commons.wikimedia.org/wiki/File:Triathlonrad.jpg) | GS (de.wikipedia) | CC BY-SA 3.0 | Aluminium triathlon bike |

Copies (≤ 1024 px) live in `assets/atlas/ref/` and are credited on the wall and on each card.
The 3D models are original work derived from measurements, not from the photographs' pixels.

## Next candidates

Trek Speed Concept (Commons: `File:2014 Speed Concept.JPG`, CC BY 3.0) and Cube Aerium C62 were
found but the downloads were rate-limited; add them to `bikes.json` with `arch: "superbike"`.
