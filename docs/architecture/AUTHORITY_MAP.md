# Kona.m Authority Map

This document names the canonical owners of product truth. If a proposed change creates a second owner for one of these concerns, stop and extend the existing authority instead.

## Canonical authorities

| Concern | Canonical authority | Consumers must do |
| --- | --- | --- |
| Product identity | `web/src/engine/identity.js` | use canonical Product / UserEquipment / RaceIdentity IDs |
| Local persistence | `web/src/engine/storage.js` | use `readStorage/writeStorage/storageKey`; do not invent keys |
| Progression | `web/src/engine/progression.js` + `world/konam/progression-v1.json` | emit/apply progression events; do not own XP/unlocks locally |
| Room identity/taxonomy | `world/konam/rooms-v1.json` | reference stable room IDs |
| Room package | `museum/schemas/room-manifest.schema.json` + `world/konam/rooms/<id>.room.json` | implement the manifest, do not encode product truth only in JS |
| Asset manifest | `museum/schemas/asset-manifest.schema.json` | register provenance/rights/performance before canonical use |
| Bike truth | `museum/bike.schema.json` | extend, never fork |
| Machine inspection | `web/src/engine/machine-inspection.js` | reuse global part/explode semantics |
| Product catalog | `museum/catalog/products.json` + generated projections | edit source catalog, regenerate projections |
| Brand/UI | `docs/BRAND_SYSTEM.md`, `brand/tokens.css`, `web/styles/components.css` | compose existing primitives first |
| Consumer shell | `web/src/entry.js` + `web/src/ui/kona-shell.js` | do not create a second shell/navigation authority |
| World renderer/player | `web/src/landing.js` | rooms plug in through approved adapters |
| Build outputs | source files + deterministic builders | never hand-edit generated bundles as authority |
| Release truth | exact-SHA CI + evidence | branch existence is not production authority |

## Before creating anything new

Run:

`node tools/check-before-create.mjs <kind> <name-or-id>`

Kinds:
- `room`
- `asset`
- `product`
- `storage`
- `runtime`
- `schema`

The command searches canonical registries and likely source locations and prints the authority that must be reused.

Then classify the change:

1. REUSE
2. ADAPT
3. RESTYLE
4. COMPOSE
5. CREATE

CREATE is last.

## New-authority rule

A new implementation may add content or an adapter. It may not silently add another:
- renderer
- camera/player framework
- storage namespace
- progression engine
- product/bike schema
- navigation shell
- UI design system
- machine-inspection engine
- room taxonomy
- asset identity system

If a second implementation is genuinely required, change this authority map and its CI guard in the same PR, with an explicit architectural rationale.

## Generated files

Generated outputs are evidence of deterministic builds, not editing authorities.

Examples:
- `app/hall.js`
- `app/kona-core.js`
- `web/dist/*`
- generated HTML viewers
- app manifests/service worker

Edit their sources and regenerate them.

## Promotion

Content may exist before it is public.

Room lifecycle:
`concept → candidate → visual-review → technical-review → rights-review → approved-unwired → release-candidate → public`

Asset lifecycle:
`candidate → generated → visual-review → provenance-review → optimized → approved → canonical → archived`

A promotion must be supported by evidence, not only code presence.
