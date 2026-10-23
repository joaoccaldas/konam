# Spatial inventory R0: safe, read-only local evidence
This tool supplements the canonical asset manifest and knowledge system. No parallel catalog, new approval workflow, licensing inference, production write, or automatic deletion.

## Safe invocation
```sh
node tools/spatial-inventory.mjs /path/to/clean/authorized/konam /path/to/clean/authorized/bellagio > /private/output/inventory.json
node --test web/test/spatial-inventory.test.mjs
```
Only supply trusted local clones at their Git repository roots. The scanner refuses staged or tracked worktree modifications so asset hashes cannot be falsely attributed to the current HEAD. It rejects symlinked files and symlinked ancestor directories and refuses paths that resolve outside the supplied repository. Untracked files are not inventoried; use separate discovery if those matter. Reports may reveal unpublished filenames, so store them privately.

## Evidence semantics and limits
`commit` is the pinned Git HEAD, `clean_tracked_worktree` verifies the tracked files were unchanged when examined, and SHA-256 identifies exact byte matches, not authorship, copyright, semantic equivalence, safety, or deletion eligibility. Concurrent checkout mutation during scanning is not eliminated: run on immutable worktrees/clones for higher assurance. A 250 MiB per-file hash threshold skips large files. Git LFS may leave pointer files instead of model bytes; detect/reconcile actual LFS content before considering inventory complete.

`rights_assessment` stays `not-performed`; `release_approval` stays false. No source is promoted to canonical status. No backend, frontend, deployment or asset paths are changed.

## Learning loop
Capture scoped baseline SHA and repository list privately; inspect exact-match groups; reconcile provenance with `museum/schemas/asset-manifest.schema.json` using the existing asset intake process; record failures as experiments and cite evidence. Do not publish private cross-project maps to public CI/logs.

## Stress cases
- Modified/staged tracked content: fail closed instead of emitting misleading HEAD provenance.
- Intermediate symlink escaping repository: fail closed.
- Untracked asset: deliberately excluded.
- Missing tracked file: fail closed.
- Oversized assets: explicit `hash-skipped-size-limit` state, not duplicate proof.
- Mutated files during the scan, submodules and Git LFS objects: require independent follow-up; not certified by this implementation.
