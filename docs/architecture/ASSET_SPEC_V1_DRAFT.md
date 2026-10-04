# AssetSpec v1 — Draft

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
- material-sharing policy
- texture inputs
- normal/roughness/metalness conventions
- transparency/glass policy
- anisotropy requirement where relevant
- color-space declaration
- environment/reflection assumptions

## Texture policy
- source texture resolution
- runtime encoding
- mobile texture edge budget
- desktop texture edge budget
- HERO texture budget
- KTX2 mode if used
- fallback

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

## Validation
- geometry validated
- materials validated
- provenance reviewed
- rights reviewed
- mobile visual reviewed
- desktop visual reviewed
- HERO visual reviewed where applicable
- optimization state

## Principle
One canonical product may have multiple runtime representations. Asset identity must not fork just because quality tier changes.