# Architecture — scaling rooms, bikes and skins

The museum is moving from hand-written rooms in one large file (`web/src/landing.js`) to **content as
data + a small engine**. Each phase ships on its own and keeps the site working; nothing reaches
`main` without passing the gate below.

## Status

| Phase | What | State |
|---|---|---|
| 0 | Baseline + gate: unit tests green, bike asset contract, CI on every push, the Pages deploy runs the same gate | **Done** |
| 1 | One bike asset contract, one livery system (`web/src/engine/skins.js`), all livery paths moved onto it | **Done** |
| 2 | Data registry (`museum/world/`), exhibits, one card system | **Wings done:** `engine/wing.js` builds every wing from `museum/world/wings/*.json` (Against the Clock ported, Kona Light new); `engine/card.js` renders bike, painting, sculpture, photograph and room cards from data. Theme rooms, hall, Sanctuary, WYLD, Champions, pier still hand-built (Phase 5) |
| 3 | Walkable grid generated from room outlines + A* routes (replaces hand-written routes and stuck timers) | Planned |
| 4 | Room-graph visibility (bikes and motion culled, walls never), shared geometry for repeated bikes, far LOD | Planned — urgent: the hall entrance draws ~6.5 M triangles / 1,665 draws, mostly the Sanctuary's eight full CFR copies |
| 5 | Port the hall, Sanctuary, WYLD, Champions, Lava Night and the pier; retire the hand-written code | Planned |
| 6 | Content as fetched JSON (not inlined into `index.html`), KTX2 + meshopt, quality tiers | Planned |

## The gate (Phase 0)

- `web/test/*.test.mjs` — `cd web && npm test` (52 tests, incl. wing data completeness and walkability).
- `node tools/validate-bikes.mjs` — every bike GLB against the asset contract.
- `.github/workflows/checks.yml` — tests, contract, and a rebuild that must match the committed pages, on every push and pull request.
- `.github/workflows/pages.yml` — runs tests and the contract before it stages the site; a red gate publishes nothing.
- Browser smoke (manual, slow on CPU rendering): `web/walk-rooms.mjs`, `web/atlas-smoke.mjs`.

## Bike asset contract (Phase 1)

A bike is a GLB whose paintable materials use these names (aliases accepted, first is canonical):

| Slot | Material names |
|---|---|
| `frame` (required) | `paint_frame` |
| `accent` | `paint_accent` |
| `rim` | `rim`, `rim_carbon`, `rim_alu`, `carbon_rim` |
| `disc` | `disc_face`, `carbon_disc` |
| `tape` | `bar_tape` |
| `saddle` | `saddle`, `saddle_cover` |
| `decalLight` / `decalDark` | `decal_light` / `decal_dark`, `decal_orange` |
| `tyre` | `rubber_tyre`, `rubber` |

Budget: ≤ 3.5 MB per bike. All 17 bike files in `assets/` pass today (`tools/validate-bikes.mjs`).
Both Blender pipelines (`blender/heritage/*`, `blender/atlas_build.py`) already write these names.

## Liveries (Phase 1)

A skin is data:

```json
{ "id": "theme-bio", "name": "Bio", "kind": "theme",
  "frame": "#1f6b3a", "accent": "#…", "rim": "#…", "disc": "#…", "tape": "#…", "saddle": "#…",
  "finish": { "roughness": 0.26, "metalness": 0.15, "clearcoat": 1 },
  "glow": { "color": "#1f6b3a", "intensity": 0.28 },
  "decals": { "color": "#ff7a1a", "glow": "#ff4d00", "intensity": 1.6 },
  "dye": { "stops": ["#…" ×5], "angle": 32, "scale": 1.5, "flow": 1, "darkness": 0 } }
```

`kind`: `photo` (sampled from a reference photograph), `studio` (a museum finish), `archive`
(documented factory finish), `dye` (the WYLD shader), `theme` (a room's look).

- `engine/skins.js` — `slotsOf(root)` / `ownMaterials(root)` index a bike by slot;
  `applySkin(bike, skin)` is the only code that paints a bike. Slots a skin does not name return to
  the GLB's own colour, so switching liveries never leaves the previous one behind.
- Catalogues: `museum/skins/museum.json` (hall finishes, theme rooms, Lava Night); per-bike liveries in
  `museum/atlas/bikes.json`; the WYLD variants (`museum/wyld_room.json`) and Bike Porn films
  (`web/src/sanctuary.js`) are adapted with `skinFromWyld` / `skinFromFilm`.
- Test: `web/test/skins.test.mjs` validates every catalogued skin and checks that no page code paints
  `paint_frame` directly any more.

## Adding things today

- **A livery for an existing bike:** add a skin to `museum/skins/museum.json` (or to the bike's `skins`
  in `museum/atlas/bikes.json`); `npm test` validates it.
- **A new Against the Clock bike:** add it to `museum/atlas/bikes.json`, run `python3 blender/atlas_build.py <key>`,
  then `node tools/validate-bikes.mjs` and rebuild the page.
- **A new room:** still code (Phase 2 makes it data).

## Modules (web/src)

| Module | Role |
|---|---|
| `engine/skins.js` | bike asset contract (paint slots) and the one livery system |
| `engine/wing.js` | builds wings from data: walls, floors, rooms, exhibits, walkable space, loading, per-frame update |
| `engine/card.js` | card models → the #card panel; adapters for bikes, paintings, sculptures, photographs, rooms |
| `engine/profile.js` | on-device profile, quality presets, storage interface (for optional sync) |
| `engine/share.js` | capture the view with a caption and share it (or save it) |
| `ui/settings.js` | profile and settings sheet, header profile chip |
| `map.js` | the two-floor map, generated from the same rectangles as the walls |
| `landing.js` | still hosts the hand-built rooms, the walk loop and routing (being split in Phases 3–5) |

See also `docs/CONTENT.md` (adding content, original sources) and `docs/APP.md` (profile, quality, sharing, accounts).
