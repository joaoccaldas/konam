# App-wide 3D + CSS audit · 2026-10-04

Visual evidence for the world-wide audit (commit 17045db).

- `before/` — every world area at the commit *before* the audit (overview camera, 960×540, SwiftShader, virtual clock).
- `after/` — the same cameras after the audit changes.
- `areas.json` in each folder — draw calls, triangles and visible lights per area.

Reproduce: `node tools/room-evidence.mjs --review world --room hall --areas --size 960x540 --out <dir>`
(`--areas-only id,id` for a subset). Software WebGL: about 2–3 min per area.

Concept art is not runtime evidence; these are runtime frames.
