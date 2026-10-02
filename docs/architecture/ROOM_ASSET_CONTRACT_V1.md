# Room + Asset Contract V1

KONA.m has one host runtime and multiple room implementation adapters.

## Authorities

Host owns renderer, lifecycle, camera, navigation, responsive FOV, tone mapping, environment, quality tiers, reduced motion, WebGL recovery, map/rail/routing, pickables, collision, shared UI, progressive loading, culling, typography/tokens and canonical bike loading.

Room owns local geometry, composition, materials, lighting accents inside budget, props, local interactions, animation and environmental storytelling.

Rooms must not instantiate a renderer, perspective camera, OrbitControls, RoomEnvironment or equivalent parallel runtime.

## Implementation classes

Installation: host supplies architectural shell/lifecycle and the room contributes an installation. NOR // 3 uses this.

Native room: unique bounds, doorway, architecture or walkability are required. Beast Cave uses this. Native does not mean independent runtime.

## Source-of-truth map

Room identity/lifecycle/semantics: world/konam/rooms/*.room.json
Implementation geometry/algorithms: referenced JS builder/module
Reusable asset identity: generic asset contract
Asset placement: room placement data, never intrinsic asset identity
Bike identity: existing museum/bike.schema.json pipeline
Navigation/walkability/pickables: host runtime with optional native-room adapter
Performance: common room-manifest vocabulary
Subjects/truth/rights: room subject envelope plus evidence
Evidence: evidence/rooms/<room-id>/
Public state: lifecycle plus release gates, never inferred from file presence

## Lifecycle

concept -> candidate -> visual-review -> technical-review -> rights-review -> approved-unwired -> release-candidate -> public -> deprecated

Only public may be wired to public map/navigation/sitemap.

## Meaning vs rendering

JSON owns stable meaning: identity, lifecycle, zones, asset references, subjects, specimen anchors, interaction IDs, budgets, provenance, rights and release gates. Code owns meshes, materials/shaders, procedural geometry, animation, dimension-derived calculations and quality adaptations.

## Evidence

Concept imagery is reference only. Runtime evidence comes from the actual implementation and identifies branch/commit. Desktop, phone portrait, phone landscape, interaction, performance, truth/provenance and rights are release gates.

## Future factory boundary

A future skill can create a manifest, resolve assets, choose an adapter, generate implementation, capture evidence, validate, run truth/rights QA and prepare release without inventing architecture.
