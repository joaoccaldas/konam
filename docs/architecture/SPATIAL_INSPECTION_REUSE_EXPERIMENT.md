# Spatial inspection portability experiment V0
2026-10-23 · synthetic contract only, not an integrated second consumer.

## Existing authorities
- `web/src/world/protocol.mjs` already owns world and event IDs.
- `web/src/engine/machine-inspection.js` already owns Three.js part discovery and explode transforms.
- `museum/schemas/asset-manifest.schema.json` owns asset provenance/rights/performance.
- `web/src/landing.js` and approved renderer kernel own application runtime; do not create another camera/renderer.

## Additive change
Extend the existing protocol with `assertInspectionDescriptor`: stable world/entity/asset IDs, bounded unique semantic part IDs and plain text labels. No new registry or service. Synthetic fixture contains no externally owned models. Descriptors are descriptive only: they DO NOT approve export, change machine inspection, resolve asset permissions or confer right to use a mark.

## Future proof of reuse
1. Run `node --test web/test/spatial-inspection-portability.test.mjs` and existing `npm test`.
2. Select one rights-approved product in the canonical Kona asset manifest.
3. Map its part identifiers to this descriptor using existing inspection kernel (no copied exploded-view logic).
4. Create a Bellagio consumer adapter that **validates** this same descriptor version, and test a second application with no duplicate business logic.
5. Measure before/after CPU/GPU, bytes, screenshot parity, errors and time to first interaction.
6. Reject if portability requires a forked renderer or fails product authorization.

## Stress, UI and backend gates
- Duplicate and invalid IDs, 257+ parts, non-object values and unknown version fail.
- Missing model, corrupt model and WebGL loss still need device/browser tests before production consumption.
- UI untouched; no new navigation or Studio.
- Backend untouched; descriptor is not a trusted command or authentication token.
- T.2 compatibility unknown. Two Three.js consumers would still not certify Greatlinq integration.
- On contract evolution use semver/compatibility fixtures; preserve previous consumer behavior.

## Reusable learning
Only stable, rights-screened interface patterns should be exported to a shared platform package after a second consumer proves demand. Record failed mappings and design trade-offs under existing company-wide evidence governance, not another database.
