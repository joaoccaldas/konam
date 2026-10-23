# Synthetic industrial assembly fixture (Greatlinq Wave 1)

Status: **EXPERIMENTAL; NOT APPROVED FOR CUSTOMER DELIVERY**

## Authority and reuse
Reuse `docs/ASSET_INTAKE.md`, `tools/check-before-create.mjs`, `tools/spatial-inventory.mjs`, `docs/CALDAS_EVIDENCE_METRICS.md` and the existing room/asset evaluation pipeline. This small offline fixture does not create a registry, runtime or asset pack. Search existing rights-cleared assets before expanding it.

## Commands
```sh
node tools/check-before-create.mjs asset pump
node --test web/test/synthetic-pump-fixture.test.mjs
node tools/synthetic-pump-fixture.mjs /tmp/greatlinq-pump-fixture
```

## Acceptance boundaries
Generator creates eleven semantically named component meshes in a synthetic concept-level OBJ; units metres, Z-up. Manifest includes component counts, source hash, preliminary rights state and release approval=false. **Not a genuine mechanically validated pump**. No temperature/flow simulations, manufacturer instructions or safety claims permitted.

Prototype run in isolated execution container on 2026-10-23: 4 test cases passed, 0 failed (174.59ms total runner). Generated ~16KB OBJ and manifest. The checked GitHub code was subsequently authored on the review branch; GitHub CI result is a separate gate. Performance numbers apply only to the prototype. Changes in the checked-in geometry/format require fresh matched tests.

## Next gates (not tested)
- Re-run tests on PR exact SHA, audit source binary/hash matching.
- Import in Blender, export to GLB with valid normals and material assignments.
- Use the existing glTF pipeline to validate hierarchy, units, face winding and geometry.
- Render controlled reference views and inspect against plausible training-only form.
- Compare accepted material variants, asset bytes, LOD, memory, p95 frame timings on real browser/mobile.
- Verify source rights, independent approval and 2nd-consumer interchange.
- Log tokens, human correction time, retries, cost and acceptance in existing company evidence store.

No quality or efficiency gain has been demonstrated versus an approved existing asset.
