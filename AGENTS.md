# AGENTS.md

These rules apply to any human or coding agent working in this repository.

## Start here

Before changing architecture or creating a room, asset, product, schema, storage key, renderer/runtime, or design primitive:

1. Read `docs/architecture/AUTHORITY_MAP.md`.
2. Run `node tools/check-before-create.mjs <kind> <name-or-id>`.
3. Search the repository for an existing implementation.
4. Prefer REUSE → ADAPT → RESTYLE → COMPOSE → CREATE.
5. If CREATE is still required, use the canonical schema/registry and explain why reuse was insufficient in the PR.

## Non-negotiable authorities

- storage: `web/src/engine/storage.js`
- identity: `web/src/engine/identity.js`
- progression: `web/src/engine/progression.js`
- world rooms: `world/konam/rooms-v1.json`
- room packages: `world/konam/rooms/*.room.json`
- asset schema: `museum/schemas/asset-manifest.schema.json`
- bike schema: `museum/bike.schema.json`
- machine inspection: `web/src/engine/machine-inspection.js`
- renderer/player: `web/src/landing.js`
- brand: `docs/BRAND_SYSTEM.md` + `brand/*`
- consumer shell: `web/src/entry.js` + `web/src/ui/kona-shell.js`

Do not create parallel versions without an explicit architecture PR that updates the authority map and CI guard.

## Rooms and assets

For room/asset work, read `skills/konam-room-studio/SKILL.md`.

Every new room needs a manifest and lifecycle state. Every reusable/canonical asset needs provenance, rights, performance and validation metadata.

Never treat concept art as runtime evidence.

## State

Do not call `localStorage.getItem/setItem/removeItem` from new modules. Use the storage adapter.

Do not create new `kona.*` or `speedmax.*` keys outside `storage.js`.

Garage is a projection of UserEquipment. Passport/Progress surfaces are projections of canonical progression. Do not create second state databases.

## 3D

Do not create another renderer/camera framework for a room. Reuse the host runtime or an approved adapter.

Do not implement local exploded-view parsing. Use machine-inspection.js.

## Generated outputs

Do not hand-edit generated bundles as the source fix. Edit source, run the deterministic build, and commit required generated outputs.

## Completion

Before considering work complete:
- unit/contracts pass
- repository/brand/authority hygiene passes
- deterministic outputs are current
- visual evidence is inspected when UI/3D changes
- mobile portrait and landscape are considered
- truth/rights boundaries are explicit
