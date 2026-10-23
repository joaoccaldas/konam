# Spatial asset evidence gate R0 (candidate, NOT release certification)
2026-10-23. Additive policy atop existing `museum/schemas/asset-manifest.schema.json`; it is not a second catalog, schema validator, rights verifier or source-of-truth. CLI or production wiring is intentionally absent until the owning asset workflow is reviewed.

## Contract
`assessAssetEvidence(manifest,review,{commercial})` returns explicit failures, unknown dimensions and a provisional 0-100 quality score. Nine dimensions: geometry, materials, topology, performance, interaction, portability, reproducibility, accessibility and visual. A rating of 0 is a measured poor result, not missing evidence. Missing dimensions yield null score.

Commercial policy requires existing manifest identity/version, rights_state original/ licensed, validation_status validated, pinned 40-character source SHA, independent reviewer/date, all nine dimension observations, references to visual evidence and independentApproval. A passing synthetic fixture DOES NOT prove the evidence is true, rights legally cleared, underlying asset valid or that a human actually reviewed the output. Evidence hashes/signatures, reference existence and authorization must be independently verified before any CI release gate.

## Synthetic test cases
- Complete synthetic evidence passes candidate policy.
- Unknown rights fail even with perfect scores.
- Missing visual evidence / reviewer approval fail.
- Missing dimension is UNRATED, not zero.
- Out-of-range ratings fail.
- Incorrect commit/asset ID fail.
Run: `node --test web/test/asset-evidence-gate.test.mjs`.
Expected synthetic passing score 80/100. These are fixture results, NOT scores for real products.

## Next hardening / stress tests
1. Reuse official JSON Schema validator and actual catalog manifests, don't weaken existing registry.
2. Verify sourceCommit resolves to immutable approved asset blob and visualEvidence references actually exist, with SHA-256.
3. Test missing/corrupt GLB, unrealistic scale, inverted normals, texture seams, color space, unlicensed brand imagery, file-size limit, shader compilation and memory.
4. Golden renders at named camera positions and lighting conditions; independent human review. Preserve previews as authorized immutable artifacts; do not include copyrighted reference media without rights.
5. Real low/mid-tier Android and iOS Safari, desktop, 20x mount/unmount, WebGL context loss, offline, slow 3G and 4x asset load. Record p50/p95/p99 frame times, load bytes, interaction errors, memory where supported, and thermal limitations.
6. Distinguish source claims, synthetic tests, screenshot audits, automated geometry checks and real-device evidence. Fail closed on missing critical evidence; don't assign fake quality numbers.
7. No new approval UI or backend. Integrate through existing company delivery/learning process only after ownership review.
8. Revisit score weights with independent domain reviewers; currently dimensions equally weighted for characterization, but rights/security remain hard gates.

## Research sources
Khronos glTF specifications: https://registry.khronos.org/glTF/
Khronos asset creation: https://github.com/KhronosGroup/3DC-Asset-Creation
glTF Transform tooling: https://gltf-transform.dev/
Existing authorities: docs/ASSET_INTAKE.md and docs/architecture/AUTHORITY_MAP.md.
