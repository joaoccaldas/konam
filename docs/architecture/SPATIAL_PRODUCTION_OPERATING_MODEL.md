# Etalia spatial production operating model R0
2026-10-23. Reuse existing `docs/ASSET_INTAKE.md`, asset manifest schema, canonical release checks and company evidence governance. NO new asset database, independent approval system, production renderer or backend.

## Delivery roles and gates
| Gate | Output | Evidence | Decision authority |
|---|---|---|---|
| 0 Intake | unique canonical asset ID, business purpose, rights class | pre-create search, provenance | product/asset owner |
| 1 Source | source DCC, references, generation settings | SHA-pinned source and license | artist/asset owner |
| 2 Geometry | dimensions, topology, scale, normals/UV, semantic parts | machine-readable validation + fixtures | asset engineering |
| 3 Visual | front/side/detail neutral render and application-context render | hash-based file receipts + separate human assessment | visual reviewer |
| 4 Runtime | file size, decode, draws/triangles, p50/p95, failures | pinned device/browser/runtime metrics | renderer engineering |
| 5 Commercial | license, identity, security, privacy, accessibility | independent signed-off reviews | existing release authority |
| 6 Outcome | task success, delivery cost, regression and learning | production run + user tests | product owner + independent evaluator |

## New receipt utility
`tools/spatial-evidence-receipt.mjs` creates a deterministic file-integrity receipt from explicitly supplied local files. It does not generate or visually inspect screenshots, trust the user's commit, prove assets rights, validate rendering, or approve commercial publication. Root is operator-chosen and may contain untrusted files: use a trusted isolated directory with no concurrent writes. Symlinks and traversal rejected, max 50 artifacts and 250 MiB each. Do not publish private report paths or imagery.

## Required research experiment
Select ONE permitted model and one reference scene. Rebuild with pinned Blender/Three.js/tool versions; produce neutral front/side/detail renders; verify GLB with existing glTF Transform/asset validator; collect material, geometry and visual reviewer grades; capture real iOS/Android/desktop measurements; evaluate quality trade-offs and costs. Compare optimization variants individually against baseline with screenshots, hashes, device profiles and task results. No claim of real asset quality until completed.

## Improvement and retention
Observe -> retrieve prior attempts -> hypothesize -> isolate -> test -> independent evaluation -> existing authorized release -> monitor outcome -> record reusable lesson. Keep rejected experiments and negative results. Original DCC and approved source data retained; derivatives versioned. Never copy sensitive company/person/customer information into the public map.

## Stress and security gates
Missing/invalid/unlicensed media; missing/glTF corrupt scene; huge textures; geometry explosions; 10k entities; 20 mount/dispose cycles; context loss; slow/offline network; invalid path/symlink; malicious metadata/prompt injection; memory and thermal degradation. Synthetic tests distinguish from real-device evidence. No numeric benchmark target counts as observed results.

## UI and backend policy
No changes to existing Kona.m customer UI or backend without user-task baseline and real failing evidence. Any internal production dashboard should be a projection in the existing company portal, not a second datastore or admin authorization surface. Greatlinq compatibility awaits vendor contracts and sandbox.
