# The Decision Room — handover (2026-10-18)

Branch `feature/decision-room`, cut from 1ca3982 (the published Norseman commit), so one runtime commit carries both rooms. Not pushed, not published.

Open: serve the repo root and visit `index.html?reviewRoom=decision-room` (semantic id `room:konam:decision-room`, same `room=beast` review slot as the other rooms).

## The room

*Before we choose, what changes?* A 6.6 m limestone-and-oak hall at dusk, lit through a south clerestory.

- **Profit bridge (the spine):** stacked limestone, one slab per €1,000. From left to right the bars are:
  - the plan's profit
  - units sold, selling price and cost per unit, with gains as oak slabs and losses as dark glass
  - the new profit

  Choosing a scenario re-stacks it: slabs fly between bars, and the engraved labels redraw.
- **Three scenario plinths** (shared `data_plinth`), each with a standing display of the scenario's inputs and result:
  - Sell 20% more → €23,000
  - A 5% price cut → €10,000
  - Costs rise 10% → €9,000
- **Three signal columns** (shared `signal_column`), one per warning rule. The lamps are per-instance colours: green within the limit, red when the rule fires. Amber shows only for 0.7 s while a change is applied; the monitor itself has no amber state.
- **Stress lectern:** moves one example input across its threshold (margin 22%, cash use €162,000, unpaid invoices 46%).
- **Quiet details:** oak benches, planters, bronze pendant lamps, a moulded wall mirror, a telescope under the clerestory, and a globe.

## Truth

Every figure is invented example data for one imaginary product. It comes from `pitch/decision-room/finance-example-v1.json`, copied from the portfolio's `apps/spatial-studio/web/finance-model.js`, and `web/test/decision-room.test.mjs` recomputes every number.

- **Base plan:** 1,000 × €100, cost €60 per unit, fixed costs €25,000 → revenue €100,000, costs €85,000, profit €15,000.
- **Warning thresholds:** the FP&A metric monitor's own (monitor.py at ce782a4). The example inputs (30% / €145,000 / 34%) are all within limits.
- **Stress values:** labelled display examples, not forecasts.
- **The first card says so.** No company, employer or client data, and no live connection.

## Reused vs new

| Element | Decision | Source |
|---|---|---|
| data_plinth, signal_column, wall_mirror_moulded, telescope_refractor, globe_on_stand | REUSE via intake | gaudi-nexus-visual@e8a89d7 environment kits 2026-10-17 and 2026-10-18 |
| Profit bridge | ADAPT | Norseman stacked-contour technique, as three instanced pools |
| Clerestory dusk sky | REUSE | `engine/terrain-portal.js` with a sky-only scene |
| Fake practical light | REUSE | Norseman lesson: one shadowed sun and one area light; pendants are emissive with additive pools and washes |
| Host renderer, cards, navigation, identity handshake, decor `bake`/`instance`, env capture | REUSE | host |
| Hall, benches, planters, pendants, bridge plinths | COMPOSE | procedural, original |

Asset intake (`world/konam/candidates/decision-room-asset-manifest-v1.json`):
- **Optimisation:** gltf-transform optimize with WebP textures at 512 px and meshopt. Palette, join and instancing passes were off so the material slots survive. That took about 8.5 MB down to 334 KB.
- **Validation:** gltf-transform validate (Khronos) gives 0 errors and 0 warnings on all five files.
- **Records:** source and output hashes are recorded for each file.

## Checks

- `node --test web/test/*.test.mjs`: all pass, including the new `decision-room.test.mjs`.
- `validate-room-package decision-room`: ok. Hygiene and private-data scans pass, and the staged-site release integrity holds.
- **Room budgets:** room meshes 62 / room triangles 48k on desktop, phone 390 and landscape (budgets: desktop 190 / 450k, phone 110 / 220k).
- **Complete-frame median, same session** (`complete-frame-performance.json`): Decision Room 73, Norseman 68, Breitling × KONA 57.1 fps.

## Evidence

All frames are in this folder, captured with `ROOM=decision-room node web/review-room-evidence.mjs <url> <out>`.

- **Desktop 1440×900:**
  - arrival (`desktop-hero`), the bridge (`desktop-bridge`) and the plinths
  - scenario switches: `desktop-scenario` (Sell 20% more) and `desktop-costs` (Costs rise 10%)
  - the columns (`desktop-columns`, all green) and stressed (`desktop-stress`, cash use red)
- **Phone 390:** hero, bridge, scenario, columns.
- **Landscape:** hero, stress.

## Known limits

- **Loss slabs:** the dark-glass slabs read less strongly than the oak gains at a distance.
- **Bridge labels:** they lie on the floor plinth, so they read best up close.
- **Mirror:** it reflects the room's single environment capture, not a live mirror.
- **Plinth screen:** the asset's own screen lies flat under its glass, so the room stands a separate display on top.
- **Not yet verified:** a real (non-headless) browser and a phone.

## Concepts entry (ROOM_COLLECTIONS.json → concepts), ready to add after publication

```json
{
  "id": "decision-room",
  "projectId": "konam",
  "title": "The Decision Room",
  "subtitle": "Finance / before we choose, what changes?",
  "category": "Business",
  "description": "A planning decision turned into a place. A stone profit bridge re-stacks as you choose a scenario, and three signal columns light up when a warning rule fires. Every figure is invented example data.",
  "application": "FP&A storytelling · board and investor sessions · planning workshops",
  "posterProjectId": "konam",
  "posterPath": "atlas-decision-room.jpg",
  "status": "Review room experience",
  "sourceNote": "An independent concept with invented example figures; no company, employer or client data. Rules from the FP&A metric monitor.",
  "runtimeId": "kona-recovered",
  "entryQuery": "reviewRoom=decision-room&room=beast",
  "cardProblem": "See what each change does to profit before you choose."
}
```

- **Category:** "Business" is new to the concepts list, which currently has Athletes, Brands, Events and Web design. Choose an existing category if the portfolio prefers.
- **Project link:** link the FP&A monitor project via `associatedProjectIds` once the portfolio has an id for it.
- **Poster:** use `desktop-bridge.jpg` or `desktop-scenario.jpg`.
