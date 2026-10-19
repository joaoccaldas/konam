# AssetSpec v1 - Draft

Status: research draft. Must not supersede existing canonical schemas until reconciled with the Authority Map.

## Goal
Define the minimum portable semantics for assets that may travel between rooms, worlds, product inspection, architecture and brand experiences.

## Identity
- asset_id
- semantic_category
- display_name
- version
- canonical_source
- lifecycle_state

## Identity vs presentation
One canonical product may have multiple runtime representations without forking identity.

The asset owns:
- intrinsic geometry
- units/orientation
- pivot/origin
- bounds
- named interaction/inspection anchors
- part relationships
- material semantics
- provenance/rights
- LOD/HERO representations

The room/world owns presentation:
- placement transform
- fixture/plinth geometry
- display-surface height
- local lighting choreography
- surrounding environment
- presentation camera
- room-specific interaction framing

A room descriptor such as `station.top` must not be duplicated into the product identity merely to make a display work.

## Geometry
- units: meters
- orientation / up axis
- pivot/origin convention
- bounding box
- LOD2 / LOD1 / LOD0 / HERO references
- collision proxy
- interaction anchors
- exploded-view part map where applicable
- instancing_safe flag
- deformable flag

## Materials
- canonical material slots
- material-sharing policy: shared / parameterized-shared / intentionally-unique
- texture inputs
- normal/roughness/metalness conventions
- transparency/glass policy
- anisotropy requirement where relevant
- color-space declaration
- environment/reflection assumptions
- material mutation rules so visual upgrades do not silently clone shared materials

## Texture policy
- source texture resolution
- runtime encoding
- mobile texture edge budget
- desktop texture edge budget
- HERO texture budget
- KTX2 mode if used
- texture-class suitability for ETC1S vs UASTC
- fallback

KTX2 is a measured encoding choice per texture class and quality tier, not a blanket requirement.

## Product / provenance
- brand
- product
- model
- year
- variant
- source
- source URL/reference
- primary/secondary evidence
- license/rights status
- endorsement/partnership status
- claim confidence

## Runtime
- mobile triangle budget
- desktop triangle budget
- HERO triangle budget
- mobile draw-call expectation
- texture byte budget
- decode dependency
- Meshopt/Draco/KTX2 requirements
- BVH/collision requirements
- material/program expectations where relevant

## Quality ladder
LOD changes may change representation cost, not product identity:
- LOD2: distant/world
- LOD1: normal room
- LOD0: close inspection
- HERO: macro/cinematic

Each level should declare:
- intended screen-space range
- geometry/texture budget
- material fidelity
- load policy
- fallback
- visual acceptance camera(s)

## Validation
- geometry validated
- materials validated
- provenance reviewed
- rights reviewed
- mobile visual reviewed
- desktop visual reviewed
- HERO visual reviewed where applicable
- optimization state
- identity invariant across quality tiers

## Current evidence note - 2026-10-04
EXP-003 exposed a boundary bug: a Breitling room descriptor carried `station.top`, but generic room presentation ignored it. The research fix makes presentation height affect the room fixture/product placement without changing product identity. This supports keeping intrinsic asset semantics separate from room presentation semantics.

## Principle
Asset fidelity may scale aggressively by context. Asset identity must not fork just because quality tier or room presentation changes.