# Spatial inventory R0 (research-only)

This optional script supplements, never replaces, the canonical asset contract at `museum/schemas/asset-manifest.schema.json`, `tools/3d-knowledge.mjs` or the authority map. It does not modify registries, create source records, review licensing, discover private repos or approve assets.

## Usage

```sh
node tools/spatial-inventory.mjs /path/to/authorized/konam /path/to/authorized/bellagio > /private/output/inventory.json
node --test web/test/spatial-inventory.test.mjs
```

Use ONLY trusted local clones supplied deliberately by the operator. Output may expose filenames, including unpublished model names: store reports outside public trees. It scans git-tracked files in the CURRENT WORKING TREE; pinned HEAD SHA is recorded but modifications in the checkout may mean file content does not match HEAD. Run from clean, pinned clones for comparable snapshots.

A match means identical content bytes, not proof of common authorship, legal rights, correctness, 3D fidelity, or safe deletion. Hashes for files over 250 MiB are skipped. Missing tracked files and symlinks are explicitly marked. The report deliberately sets `rights_assessment=not-performed` and `release_approval=false`.

## Limitations and next gate
- No network or cross-account discovery; not a comprehensive asset index.
- No binary GLB semantic parsing, near-duplicate detection, Blender dependency graph, license resolution, or deployment evidence.
- Do not feed this report directly into a public knowledge map or product catalog.
- Next PR should compare manifest-backed assets against occurrences and record verified provenance using existing schema, without silently creating another authority.
