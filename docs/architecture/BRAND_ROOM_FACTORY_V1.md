# Brand Room Factory V1

Status: proposal. No data migration in this document. Current `main` is `897a9654`. The progressive shell (`461ebb6`, `web/src/engine/navigation-policy.js`) is accepted and out of scope. Renderer convergence is Wave 2 and out of scope.

There is no canonical Breitling room, descriptor, or runtime asset on this SHA. Do not invent one.

## Classification

Every new thing is one of:

| Label | Meaning |
|---|---|
| DATA | Descriptor, product record, placement, evidence |
| REUSABLE COMPONENT | A prop, station kind, or loader another room can use |
| SHARED ENGINE | Host renderer, navigation, cards, collision, inspection |
| BRAND-SPECIFIC EXCEPTION | Code that only one brand may use |

A conventional brand room has **zero** brand-specific exceptions. An exception needs an explicit reason another brand could not reuse the same capability. If it can, extend the generic contract instead.

Forbidden for a brand room: a `*-room.js` runtime, another `WebGLRenderer`, camera, OrbitControls, RoomEnvironment, navigation, card CSS, product database, or explode path.

## What is already true

`museum/world/brand_rooms.json` is data. `brandroom.js` validates and lays out stations. `roomscene.js` builds the room. `decoration-props.js` places catalog props. The host in `landing.js` owns the walk, the card, and the renderer.

Nike Running Lab (`nike-running`) is the only production brand room. Its shoe is `nike-alphafly-3-study`.

## Two readers, two shapes

The hall does not ask the product catalog for the shoe. `roomscene.js` loads `product.glb` from the room descriptor. The brand card in `landing.js` prints `brand`, `model`, `year`, `sub`, `text`, `stats`, `legal`, `source`, and `buy` from that same object. `validateBrandRoom` requires `glb` on the descriptor.

`web/src/engine/product.js` is a second reader. `resolveProduct` takes the public catalog row or the candidate row as the base, then lets the room override `buy` and `legal`, and treats a room placement as clearing candidate blockers. The hall never calls it.

`museum/catalog/products.json` is the generated bike catalog (47 products). The Alphafly is not in it.

## Field map for the Alphafly

Authored room product in `museum/world/brand_rooms.json`, compared with `integrations/candidate-products.json` item `nike-alphafly-3-study`.

| Field | Room descriptor | Candidate record | Verdict |
|---|---|---|---|
| `id` | `nike-alphafly-3-study` | same id | Shared identity. One string, two editable files. |
| `brand`, `model`, `type` | Nike, Alphafly 3, shoe | same values | Editable duplicate. |
| asset | `glb` path | `asset_path`, same path | Editable duplicate. |
| source URL | `source` | `source_records[0]`, same URL | Editable duplicate. |
| `year` | `2024` | absent | Room-only today. |
| `stats` | four spec pairs | absent | Room-only today. Not in the candidate record. |
| `legal` | independent-study line | absent | Room-only today. |
| `buy` | same URL as `source` | absent | Room-only field. The URL itself is the source URL. |
| `sub`, `text` | room copy | absent | Room-only. Keep. |
| `station` | stand at 16.6, −55.6 | absent | Room-only. Keep. |
| `capabilities` | inspect, compare, equip, share, buy | inspect, collect, equip, share | Overlap, not equal. The hall card does not read this array. `resolveProduct` unions both. |

`integrations/affiliate-priority.json` stores the id inside Nike's `priority_product_ids`. That is a reference, not a second product record.

`app/admin-assets.json` copies brand, model, year, glb, text, and stats from the room because the shoe is missing from `products.json`. The builder already skips a brand-room product whose id is already in the catalog (`tools/build_admin_assets.mjs`). That file is a generated projection.

`web/src/quest.js` hardcodes `{ id, label: 'Nike Alphafly 3' }` in `SHOES`. That label is a third editable copy of the model name.

## Authorities

| Concern | Editable authority today | Generated projection |
|---|---|---|
| Bike identity, specs, glb, sources | `museum/catalog/products.json` via `tools/build_catalog.mjs` | public catalog, admin assets, museum data |
| Non-bike intake identity and asset path | `integrations/candidate-products.json` | none for the hall |
| Room bounds, theme, door, light, story | `museum/world/brand_rooms.json` | hall bundle, admin room row |
| Placement and room copy | `station`, `sub`, `text` on the room product | hall card |
| Rights line and buy link for this shoe | the room product only | hall card, and `resolveProduct` prefers them |
| Affiliate membership | id list in `affiliate-priority.json` | — |
| Admin portfolio | — | `app/admin-assets.json` |

Editable duplication is the identity triple (`brand`, `model`, `type`), the asset path, and the source URL. Specs, year, legal, and the buy field are not yet duplicated. They live only on the room, so the room is accidentally the product authority for everything the candidate record does not store.

## Brand Room V2 product reference

Do not migrate until a join test proves the hall still sees the same Nike product. The authored descriptor becomes a reference. A build join fills the object `roomscene.js` and the brand card already read. No new runtime module.

Authored room product:

```json
{
  "product_id": "nike-alphafly-3-study",
  "station": { "kind": "stand", "x": 16.6, "z": -55.6, "rotY": 1.1, "top": 0 },
  "room_story": {
    "sub": "Road-racing super shoe",
    "text": "ZoomX foam over a full-length carbon Flyplate, two forefoot Air Zoom units under an Atomknit upper. ~218 g in a reference size, 8 mm drop."
  }
}
```

The product record, whether it stays in `candidate-products.json` until promotion or moves into the catalog pipeline, owns:

```json
{
  "id": "nike-alphafly-3-study",
  "brand": "Nike",
  "model": "Alphafly 3",
  "type": "shoe",
  "year": "2024",
  "asset_path": "assets/kona-heritage/shoes/nike-alphafly-3-study.glb",
  "representation": "official-spec-informed",
  "source_records": ["https://www.nike.com/se/en/t/alphafly-3-mens-road-racing-shoes-KnKE5jwD/FD8311-402"],
  "stats": [["~218 g", "reference size"], ["8 mm", "drop"], ["ZoomX", "foam"], ["Flyplate", "carbon"]],
  "legal": "Independent reconstructed study from the public specification. Not affiliated with or endorsed by Nike.",
  "buy": "https://www.nike.com/se/en/t/alphafly-3-mens-road-racing-shoes-KnKE5jwD/FD8311-402"
}
```

`buy` may equal the source URL. It is still a commerce field, not a second source.

Build output, which is what the hall keeps reading, must match today's room product:

```json
{
  "id": "nike-alphafly-3-study",
  "brand": "Nike",
  "model": "Alphafly 3",
  "type": "shoe",
  "year": "2024",
  "glb": "assets/kona-heritage/shoes/nike-alphafly-3-study.glb",
  "sub": "Road-racing super shoe",
  "text": "ZoomX foam over a full-length carbon Flyplate, two forefoot Air Zoom units under an Atomknit upper. ~218 g in a reference size, 8 mm drop.",
  "source": "https://www.nike.com/se/en/t/alphafly-3-mens-road-racing-shoes-KnKE5jwD/FD8311-402",
  "buy": "https://www.nike.com/se/en/t/alphafly-3-mens-road-racing-shoes-KnKE5jwD/FD8311-402",
  "legal": "Independent reconstructed study from the public specification. Not affiliated with or endorsed by Nike.",
  "stats": [["~218 g", "reference size"], ["8 mm", "drop"], ["ZoomX", "foam"], ["Flyplate", "carbon"]],
  "station": { "kind": "stand", "x": 16.6, "z": -55.6, "rotY": 1.1, "top": 0 },
  "capabilities": ["inspect", "compare", "equip", "share", "buy"]
}
```

`presentation` overrides are allowed only for room-local display (station kind, copy). They must not fork brand, model, year, asset, stats, legal, or buy.

### Behavior the join must preserve

A candidate with blockers is hidden by `resolveProduct` unless a brand room places it. Nike ships that way: `readiness` is `candidate`, blockers include `prototype-not-cad-exact` and `asset branch Museum checks failing`, and the room still shows the shoe. A join that drops blocked products would remove the lab's only object. Placement in a public room stays the clearance for that room.

### Consumers

| Consumer | Today | After a proven join |
|---|---|---|
| `web/src/engine/roomscene.js` | reads `glb`, `type`, `station` | reads the built projection, same fields |
| `web/src/landing.js` `openBrand` | reads brand, year, model, sub, text, stats, legal, source, buy | same projection |
| `web/src/engine/brandroom.js` | rejects a product with no `.glb` | authored file may omit `glb`; the built projection must still have one |
| `web/src/engine/product.js` | joins catalog, candidate, and room | room supplies placement and room copy; product record supplies identity and commerce |
| `tools/build_admin_assets.mjs` | copies the room product when the id is absent from the catalog | copies the product record; room only adds the location |
| `web/src/quest.js` `SHOES` | hardcoded label | lookup by id, or delete the list if nothing calls it for a live shoe choice |
| `integrations/affiliate-priority.json` | id list | stays an id list |

### Migration risk

| Risk | Why it matters |
|---|---|
| Hall projection drifts | The card or the GLB path changes while tests still pass on the authored file |
| Blocker clearance lost | The shoe disappears because intake blockers win |
| Catalog pipeline rejects a shoe | `products.json` is a bike catalog. Putting the shoe there by hand fights `tools/build_catalog.mjs` |
| Capabilities union | Room and candidate lists differ. The hall ignores the array; `resolveProduct` unions it. Pick the room list as the public one and test it |
| Legal line moves | The independent-study sentence must survive on the card |

Do not switch the authored file until the join fixture equals the current hall product, admin row identity fields stay the same, and the lab still loads `assets/kona-heritage/shoes/nike-alphafly-3-study.glb`.

### Tests before any deletion

- Fixture: join(candidate or catalog row, room ref) deep-equals the current hall product, including station and the legal line.
- `validateBrandRoom` accepts `product_id` plus station when the resolved asset ends in `.glb`, and still rejects an unknown id.
- A blocked candidate with no room stays hidden. The same id inside a public brand room stays visible.
- Admin asset id, glb, and location for `nike-alphafly-3-study` are unchanged.
- No test imports a brand-named runtime.

### Deletion, only after those tests pass

- Authored copies of `brand`, `model`, `type`, `year`, `glb`, `source`, `stats`, `legal`, and `buy` on the room product.
- The hardcoded Alphafly label in `quest.js` if the quest reads the product record.
- Leave `affiliate-priority.json` ids in place.
- Leave `app/admin-assets.json` as a generated file. Regenerate it. Do not hand-edit it.

## New-brand intake

A conventional brand room is data, assets, and evidence. It is not a new runtime module.

Required before the room is wired to the public map:

| Gate | What must exist |
|---|---|
| Provenance | A source record with a public URL or archived citation. `representation` says whether the mesh is spec-informed, a geometry study, or a concept. |
| Rights | A legal line. No partnership or endorsement sentence unless a public agreement says so. |
| Product | One canonical record: id, brand, model, type, year, asset path, stats, source, legal, buy if a buy action is offered. |
| GLB | A runtime asset at that path. Museum-sized. The product id is the only identity. |
| Assembly | Optional. Exploded inspection uses the shared machine layer, not a brand-specific explode. |
| Props | Decoration ids that already exist, or a new prop added to `decorations.json` and `decoration-props.js` because another room could use it. |
| Room | A descriptor: name, story, bounds, theme, door, light, `product_id` refs, stations, decoration placements. |
| Evidence | Desktop and phone portrait captures of the built room, from the same cameras, on the commit that wires it. |
| Performance | A receipt for that room: transfer size of its GLBs, and a note if draw calls or frame time are outside the room budget. A renderer, KTX2, or LOD change is a Wave 2 issue, not part of the room. |

The acceptance test: adding the next conventional brand room changes JSON, assets, and evidence. It does not add a runtime module.

## Out of scope

- Progressive shell, `navigation-policy.js`, and the visible label Now. Route id `home` stays.
- `web/src/render/` and any WebGPU, KTX2, or LOD work.
- A Breitling descriptor, GLB, or prop.
