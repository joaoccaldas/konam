# Rotaverk architecture, authority and integration plan

## The root rule
**One physical bike, one canonical identity, many representations and consumers.** From KONA main, preserve:
- `museum/bike.schema.json`: bike truth and reconstruction references;
- `museum/catalog/products.json`: generated current source-backed catalogue, never hand-edited;
- `museum/schemas/machine-assembly.schema.json`: parts/hierarchy/interfaces and provenance;
- `web/src/engine/machine-inspection.js`: exploded state, picking and motion;
- `docs/architecture/AUTHORITY_MAP.md`: owner of canonical domain/render/identity contracts;
- `docs/PRODUCT_REPRESENTATIONS_V1.md`: proxy/museum/hero/engineering fidelity tiers.

## Entity structure
Brand → family → platform generation → model year → variant/SKU → frame size → stock build revision.
Physical part: component → manufacturer part number → interface → mechanical assembly → model/variant applicability.
Evidence: claim → exact source/date/locator/license → reviewed state → version.
Private: owner garage build → installed parts → service history → explicit optional activity evidence.
Experience: KONA museum, Studio KONA, partner embed, comparison, educational module and machine inspection consume IDs. A paint-only exhibit is **not** a new physical bicycle.

## Dataflow
Manufacturer references, archives, licensed datasets and primary sources → immutable source ledger → candidate claim extraction → deterministic validation + human source review → KONA-owned canonical graph initially → versioned read model → Rotaverk search/compare/inspect/maintain → KONA.m, Canyon Museum, Studio KONA and permitted partner embeds.

## Adjacent projects
- `canyonmuseum`: exhibit provenance, heritage room and original reconstruction recipes.
- `studio-kona`: environment/racing experiences, not a second product database.
- `mac-knowledge-hub`: discover-before-create, evidence receipts; private content NEVER projected publicly.
- `sintra-ai`: reusable structured learning and content-validation ideas.
- `phoenix`: private athlete metrics; owner-scoped overlay only, not public bike truth.
- `jarvisOS`: governance, bounded workflows and audit receipts.
- 3D lab: Blender geometry recipes, part metadata, LOD, compression and measured browser/phone acceptance.

## V1 implementation decisions
1. Read-only projection/adapter, no new canonical store or dual writes.
2. No new renderer framework: use existing global machine-inspection kernel. Adapter maps semantic part IDs into the same GLB nodes.
3. Compare only dimensionally meaningful size-specific fields with units, model year and evidence. Missing = unknown.
4. Compatibility uses `compatible|incompatible|unknown`; only exact matching, reviewed manufacturer evidence can yield a positive answer.
5. Static/2D first; engineering 3D lazy on user intent, fallback accessible without WebGL.
6. Source and rights review before archiving PDFs/images/CAD and before marketing/manufacturer marks.
7. A separate repo/package may be proposed after versioned contract tests, governance and a measured consumer need; migrate with stable aliases and rollback.
8. No forum, seller account, payment or public post service in MVP.

## Candidate API / MCP (read-only)
`find_bikes(q,brand,year)`, `get_bike(id)`, `compare_bikes(ids,size_scope)`, `inspect_component(id)`, `find_manual(entity_id)`, `check_compatibility(bike_id,part_id)`. Every result carries stable ID, schema version, source refs, evidence class and unknowns. Adapters never become domain authority.

## Current baseline (observed October 19, 2026)
The current generated catalogue displayed 47 product entries, 29 distinct GLB paths and 18 museum editions using the underlying physical representations. This is a source-file inspection, not a hardware or visual test and not 47 independently modeled bikes. Source: `museum/catalog/products.json` on main at audit time. Rerun the local audit and record exact ref before relying on a future figure.
