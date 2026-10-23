# Industrial fixture GLB round-trip study — 2026-10-23

**Status: bounded local experiment, NOT production approved.** A standalone prototype in the execution container was tested; this is not an exact-head CI run of PR #153.

## Verified executed checks
- `node --test /mnt/data/greatlinq-fixture/generate.test.mjs`: 4/4 passing tests, total ~153 ms in this container.
- Generated OBJ SHA-256 matched its source manifest: `1b24ced877a6ada258b51d5cd114e03bd524bc992682f6e491177cf3a7e0a6ce`.
- Parsed 11 intended semantic parts and triangulated 692 faces.
- Naive OBJ import via installed trimesh 4.11.1 produced **one merged mesh**, losing named component boundaries. This is an actual observed portability failure.
- A controlled converter that splits OBJ object groups into separate trimesh geometries emitted a GLB and round-tripped through trimesh, preserving all **11 graph nodes** and **692 triangles**.
- Output GLB: **10,304 bytes**. SHA-256: `1629495e5c7f877f6b26743eb81bf7dad3d98212095a557cfbcd6eb63bc51b6a`.

## What this does and does not prove

Proves a source-level semantic name-preserving GLB conversion is possible for the synthetic fixture **in one local importer/exporter**. It does not establish watertightness, normals, PBR, visual accuracy, mechanical correctness, Blender or web-runtime import, multi-engine interoperability, rights approval or performance efficiency. Do not infer a 34% general size improvement from comparing two conversion outputs with different semantics.

No additional conversion dependency is added to production by this report; follow the canonical Blender/GLB pipeline instead of adopting this exploratory script without an architecture and dependency review.

## Follow-up acceptance test

1. On exact PR SHA, regenerate OBJ; verify manifest/source SHA.
2. Use approved production DCC importer/exporter and preserve the eleven semantic object names and transforms.
3. Read resulting GLB with the existing glTF validator; confirm eleven target nodes, triangle/index validity, normals, units and axis orientation.
4. Load GLB in canonical Three.js consumer; test part picking by stable IDs.
5. Capture front/side/detail real renders and independent visual review.
6. Test second consumer and per-device frame/memory/network characteristics.
7. Record elapsed production cost, retries and provider-reported tokens (NOT_MEASURED here).

**Decision: candidate.** Do not merge or promote based on object count and unit checks alone.
