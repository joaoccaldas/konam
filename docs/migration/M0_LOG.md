# Kona.m Migration Log

## 2026-10-02 · M0 started

Target repository: `joaoccaldas/konam`  
Source repository: `joaoccaldas/canyonmuseum`

### Frozen behavioral baseline
- Source branch: `product/konam-world-foundation-v1-20261002`
- Exact source SHA: `856b98f0d9392c48ef7a6ff0fedaa39d459ef14c`
- This SHA passed:
  - Museum checks
  - Integration contract
  - Release security gate
  - App release seal
  - UI interaction evidence
  - Kona.m pre-migration comparison

### Audit branch
- PR #161 remains audit-only.
- Audit findings may be replayed as documentation/contracts after M0.
- No runtime behavior from audit work is required to establish M0 equivalence.

### Migration strategy
1. Preserve source history and tags.
2. Preserve exact runtime behavior.
3. Preserve dependency and lockfile state.
4. Preserve generated-output ownership and exact-SHA release discipline.
5. Preserve compatibility reads for existing `kona.*` and legacy `speedmax.*` state.
6. Do not rename Canyon/Speedmax facts that represent real brand/history content.
7. Do not change Android package identity during M0.
8. Rename/refactor only after M0 proves equivalence.

### Important connector limitation discovered
The GitHub connector cannot reuse Git blob SHAs across unrelated repositories. A direct cross-repository tree copy returns GitHub 422 because the source blob does not exist in the target repository object database.

Therefore the full 962-file / ~110 MB source tree, including binary GLBs/images, must be transferred by a real Git mirror/push (or equivalent repository import), not by piecemeal Contents-API copying.

This is a migration-integrity requirement rather than a shortcut: a Git mirror preserves history, branches, tags, binaries and exact file bytes in one operation.

### Current target state
This repository currently contains only migration bootstrap material. Do not treat it as M0-complete until the source tree has been mirrored and the acceptance matrix is green.
