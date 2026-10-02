# Kona.m Change Contract

This document is the explicit before/after contract for any pre-migration PR that changes runtime source, dependencies, persistence, auth, release controls or user-facing flow.

Update this file in the same PR when one of those surfaces changes.

## Change

- Date:
- PR:
- Owner:
- Purpose:

## Before

Describe the exact pre-change behavior and evidence.

- Runtime behavior:
- User flow:
- State/persistence:
- Dependencies:
- Security/privacy:
- Performance:
- Release/deployment:

## After

Describe the intended post-change behavior and evidence.

- Runtime behavior:
- User flow:
- State/persistence:
- Dependencies:
- Security/privacy:
- Performance:
- Release/deployment:

## Invariants that must not regress

- Guest path remains usable unless explicitly approved otherwise.
- Existing saved state remains readable or has a tested migration.
- Canonical internal routes remain available: `home`, `discover`, `garage`, `plan`, `me`.
- No new direct `speedmax.*` storage keys.
- No new secret/private data exposure.
- No new `eval()` or `document.write` use.
- Existing security/release workflows are not silently removed.
- Generated outputs are changed only through their owning builder.
- Dependency additions/removals/upgrades are explicit and justified.
- Rollback path exists for runtime-affecting changes.

## Risks

- User-visible:
- Data:
- Security/privacy:
- Rendering/mobile:
- Deployment:
- Third-party/dependency:

## Rollback

State the exact rollback mechanism.

## Verification

Record actual results, not intentions.

- Unit:
- Repository hygiene:
- Secret/private-data scan:
- Dependency audit:
- Integration:
- P0 journey:
- UI interaction:
- Visual:
- World contract:
- Physical Android:
- Physical iPhone:
- Post-deploy exact-SHA smoke:

## Result

- Before/after comparison:
- Known differences:
- Known unchanged areas:
- Remaining blocker(s):
