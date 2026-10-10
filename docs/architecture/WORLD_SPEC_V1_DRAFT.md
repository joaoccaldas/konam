# WorldSpec v1 - Draft

Status: research draft. Content/world semantics only. Does not create a second renderer authority.

## Purpose
Describe world content declaratively enough for multiple experiences to share semantics without forcing them to share artistic composition.

## World identity
- world_id
- version
- real / fictional / hybrid
- provenance requirements
- coordinate system
- units
- origin/georeference if relevant

## Spatial structure
- regions
- zones
- rooms
- streaming cells
- visibility groups
- portals / connections
- spawn points
- traversal constraints
- canonical cameras

## Lifecycle contract
Semantic existence must be separate from runtime lifecycle.

A zone/room/entity may move through:
`declared -> instantiated -> resident -> visible/active -> cold -> unloaded`

WorldSpec should declare, where relevant:
- activation condition
- visibility condition
- instantiation policy
- residency policy
- unload threshold
- unload hysteresis
- rebuild policy
- retained state after geometry unload
- shared-resource ownership
- disposal responsibility

A room being declared in the world graph must not imply that its geometry is instantiated or GPU-resident.

## Cross-world integration
Declare an `integration_mode` when one world hosts or references another experience:
- `canonical-embed`: host navigates/embeds the canonical source surface; no renderer sharing is implied.
- `same-origin-package`: host serves another experience's packaged surface but runtime authorities remain separate.
- `shared-runtime-adapter`: host and source deliberately share selected runtime primitives through an adapter.
- `native-shared-scene`: content participates in one scene/renderer lifecycle and one explicit ownership graph.

Also declare:
- source_project
- source_ref / source_sha
- source_route or scene_id
- host_owns
- source_owns
- state_bridge if any
- fallback behavior
- version compatibility

Do not describe an iframe/canonical embed as a shared runtime.

## Environment
- sky / time
- sun
- weather
- wind
- water
- fog
- ambience
- local lighting overrides
- environment capture/HDR reference

## Geometry/content
- terrain
- architecture
- props/assets
- vegetation
- road/surface
- hero products
- dynamic entities
- decals/signage

## Interaction
- pickables
- interaction anchors
- proximity triggers
- inspection targets
- quest hooks
- navigation
- locomotion constraints

## Simulation
Optional modules:
- cycling physics
- walking/swimming
- wind/weather
- structural/form-finding
- thermal/daylight
- crowds
- water
- aero/CFD-derived approximations

## Performance
- quality tiers
- target FPS
- zone draw-call budget
- zone triangle budget
- texture budget
- max DPR
- shadow policy
- particle policy
- LOD policy
- streaming policy
- unload policy
- material-sharing policy
- HERO override policy

## Rights/truth
Every real-world subject, product, athlete, venue or branded element must declare provenance/rights/claim status.

## Current evidence note - 2026-10-04
Studio-Kona PR #54 provides a concrete lifecycle candidate: geometry is built lazily, hidden when outside activation range, and disposed when sufficiently cold while semantic place identity and visited/favorite state remain resident. This is useful evidence for the lifecycle model, not yet a cross-project standard.

Bellagio's current Lab Wing is `canonical-embed`, not shared runtime. Its main branch currently points to older KONA routes; KONA PR #123 identifies the newer room variants that still require reconciliation before Bellagio can be treated as visually current.

## Principle
WorldSpec describes what exists, how it relates, and how it may enter/leave runtime residency. It must not hard-code a second renderer, shell, storage system or progression engine.