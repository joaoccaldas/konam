# M0 Migration Plan

## Objective

Create a behavior-equivalent Kona.m repository before any intentional product rename or architecture change.

## Phase M0-A · History and byte transfer

Use Git to transfer the source repository into `joaoccaldas/konam`.

Preferred operation:

```bash
git clone --mirror https://github.com/joaoccaldas/canyonmuseum.git canyonmuseum.git
cd canyonmuseum.git
git remote set-url --push origin https://github.com/joaoccaldas/konam.git
git push --mirror --force
```

Because `konam` was created empty and then initialized with a bootstrap commit, the mirror push intentionally replaces that bootstrap branch history. The migration documentation must then be replayed on a fresh migration branch in `konam`.

If preserving only selected branches is preferred later, do that after the full mirror exists and the migration map is recorded. Do not begin with a partial copy.

## Phase M0-B · Freeze target candidate

After mirror:
- create `migration/m0-equivalence-20261002` from source SHA `856b98f0d9392c48ef7a6ff0fedaa39d459ef14c`;
- do not rename product text yet;
- do not change dependency versions;
- do not change storage keys;
- do not change native appId;
- do not switch hosting.

## Phase M0-C · Exact equivalence

Run:
- canonical deterministic build;
- generated-output diff;
- unit/schema/world tests;
- integration contract;
- secret/private-data scan;
- dependency audits;
- P0 browser journey;
- UI interaction matrix;
- Visual Evidence V2;
- PWA/install audit;
- Studio startup/failure-path audit;
- bundle budgets.

## Phase M0-D · Migration proof

Record:
- source SHA;
- target SHA;
- dependency hashes;
- generated-output differences;
- route/state equivalence;
- known open physical-device gates;
- rollback instructions.

M0 passes only when all blocking acceptance gates pass on one exact target SHA.

## Phase M1 · Deliberate Kona.m rename

Only after M0:
- introduce one product/site metadata authority;
- rename consumer-facing KONA → Kona.m;
- change canonical origin from Canyon Museum path to Kona.m destination;
- regenerate canonical/OG/RSS/sitemap/robots/LLM metadata;
- retain Canyon Museum as a branded collection;
- preserve old URLs through redirects/compatibility;
- treat schema IDs as versioned identifiers, not cosmetic strings.

## Phase M2+ · Architecture improvements

After name/origin migration:
- canonical Progression becomes sole future write authority;
- map legacy Finds into canonical collectible acquisition;
- wire Founding 141;
- progressively converge room registry → renderer;
- decompose `landing.js`;
- split User Studio controller/view seams;
- reduce CSS ownership conflicts;
- converge WebGL lifecycle contracts;
- replay selected product PRs from Canyon Museum.
