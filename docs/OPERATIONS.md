# Operations

## Release gates

P0 blocks release:
- security/privacy issue
- data loss/corruption
- app cannot load/use core flow
- secret leak
- broken authorization

P1 blocks broad beta:
- onboarding broken
- RaceIdentity lost
- progression/reward corruption
- mobile controls unusable
- severe performance regression

## Evidence rule

CI green is necessary, not sufficient.

For mobile-facing releases also require:
- real-device evidence
- Safari/iPhone path for iOS-facing changes
- Android physical-device smoke for Android-facing changes
- post-deploy smoke at exact merged SHA

## Repository artifact policy

Source control should contain:
- source
- versioned schemas
- small deterministic fixtures
- required public assets
- documentation

Prefer CI/Release artifacts for:
- APKs
- generated screenshots
- large temporary QA bundles
- transient exports

Generated deploy output must have one documented owner and reproducible build command.

## Status

Current production truth should be maintained in `STATUS.md`. Historical audit documents must not present stale SHAs as current.
