# WorldSpec v1 — Draft

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

## Rights/truth
Every real-world subject, product, athlete, venue or branded element must declare provenance/rights/claim status.

## Principle
WorldSpec describes what exists and how it relates. It must not hard-code a second renderer, shell, storage system or progression engine.