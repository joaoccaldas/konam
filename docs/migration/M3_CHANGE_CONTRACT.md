# M3 Consumer Identity Convergence

## Why

M1 established `config/product-meta.json` as the canonical product identity, but active runtime surfaces still contained hard-coded legacy consumer-product phrases.

This refactor removes **consumer identity drift** without changing geographic, historical, compatibility or game-domain uses of Kona/KONA.

## Before

Examples of active runtime hard-coding:
- `KONA Finds`
- `KONA NUDGE`
- `KONA · WORLD MAP`
- `Share KONA`
- `KONA title screen`
- `My KONA progress`

The product metadata already said `Kona.m`, so the UI had two authorities.

## After

Clear consumer product identity is derived from `PRODUCT_NAME`, itself backed by `config/product-meta.json`.

Changed surfaces:
- Home
- User Studio
- Settings
- Onboarding explanatory copy
- World map heading
- Progress/share text
- 3D share caption
- related regression tests

## Deliberately preserved

These are **not** product-brand drift:
- `KAILUA-KONA` and geographic/race references;
- Canyon and Speedmax factual/historical content;
- `Kona Credits` as the current game-currency proper name;
- `Kona Rookie`, `Queen K Veteran` and other progression/story labels pending separate game-language review;
- `kona.*` current storage namespace;
- `speedmax.*` legacy compatibility namespace;
- filenames such as `kona-progress.png` where changing the file name creates no user-value and can break downstream expectations.

## Before → after risk

- routes: unchanged
- storage/state: unchanged
- progression: unchanged
- dependencies: unchanged
- CSS: unchanged
- WebGL geometry/lifecycle: unchanged
- Supabase: unchanged
- Android appId: unchanged
- generated bundles: rebuilt through canonical builders

## Why this refactor is worth launch risk

A product that calls itself `Kona.m` in metadata and `KONA` throughout live UI looks unfinished. Centralizing identity removes one source of truth without introducing a new subsystem.

The refactor is intentionally bounded. A global KONA→Kona.m replacement would corrupt legitimate place, race, game and historical language.

## Acceptance

Exact head must pass:
- App release seal
- Integration contract
- Museum checks
- UI interaction evidence
- Visual Evidence V2
- product identity regression tests
- deterministic generated-output checks

No merge while any exact-head gate is incomplete.
