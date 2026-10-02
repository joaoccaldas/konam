# Room + Asset Contract V1

Kona.m has one host runtime and multiple room implementation adapters.

## Principle

**Same contract, different implementation adapters.**

The contract standardizes truth, lifecycle, branding, assets, evidence, performance and release behavior. It does not force every room to use the same rendering technique.

## Authorities

The Kona.m host owns:
- renderer and scene lifecycle;
- camera/navigation/responsive FOV;
- tone mapping and environment;
- quality tiers, reduced motion and WebGL recovery;
- map/rail/routing, pickables and collision;
- shared UI/components;
- progressive loading and culling;
- canonical bike loading;
- global brand/interface authority.

A room owns only:
- local geometry and spatial composition;
- local materials and lighting accents inside budget;
- props and local interactions;
- local animation;
- environmental storytelling.

Rooms must not instantiate a renderer, perspective camera, OrbitControls, RoomEnvironment or equivalent parallel runtime.

## Global brand contract

Rooms do not own a second visual language.

Every room consumes:
- `docs/BRAND_SYSTEM.md`;
- `brand/tokens.css`;
- the canonical Manrope functional UI;
- Instrument Serif editorial hierarchy;
- system monospace for evidence/data;
- Caveat only as a sparse human note;
- Light / Dark / Random modes through the host;
- semantic sunrise/action, ocean/discovery and lime/progression roles;
- canonical accessibility, touch, safe-area and reduced-motion behavior.

Theme is allowed to change **environment, story, props, materials, sound and local lighting**. It must not fork navigation, controls, typography, generic cards, buttons or design tokens.

The emotional product principle remains global:

**Calm surface. Deep world underneath. Professional where trust matters. Strange where discovery creates memory.**

Room storytelling should preserve Kona.m's curiosity, joy, play, human imperfection and forward motion. Serious information stays literal. The world can be unexpected without becoming noisy.

## Implementation classes

### Installation
The host supplies architectural shell/lifecycle and the room contributes an installation.

NOR // 3 uses this pattern.

### Native room
Unique bounds, doorway, architecture or walkability are required.

Beast Cave uses this pattern.

Native does not mean independent runtime.

## Source-of-truth map

- Room identity/lifecycle/semantics: `world/konam/rooms/*.room.json`
- Implementation geometry/algorithms: referenced JS builder/module
- Reusable asset identity: generic asset contract
- Asset placement: room placement data, never intrinsic asset identity
- Bike identity: existing `museum/bike.schema.json` pipeline
- Navigation/walkability/pickables: host runtime with optional native-room adapter
- Performance: common room-manifest vocabulary
- Subjects/truth/rights: room subject envelope plus evidence
- Evidence: `evidence/rooms/<room-id>/`
- Public state: lifecycle plus release gates, never inferred from file presence
- Brand/interface: `docs/BRAND_SYSTEM.md` + `brand/tokens.css`

## Lifecycle

`concept -> candidate -> visual-review -> technical-review -> rights-review -> approved-unwired -> release-candidate -> public -> deprecated`

Only `public` may be wired to public map/navigation/sitemap.

A temporary `source_branch` reference is permitted only while status is `concept`. It records where an implementation is being developed without pretending that implementation exists in the current branch. Before promotion to `candidate`, implementation and required asset manifests must be reconciled locally and the escape hatch removed.

## Meaning vs rendering

JSON owns stable meaning: identity, lifecycle, zones, asset references, subjects, specimen anchors, interaction IDs, budgets, provenance, rights and release gates.

Code owns meshes, materials/shaders, procedural geometry, animation, dimension-derived calculations and quality adaptations.

## Global machine / exploded-view rule

Exploded inspection is a **global Kona.m machine capability**, not a room feature and not a Studio-only feature.

Rooms may host machines. They must not implement their own explode algorithms.

The canonical machine layer will own:
- part discovery and stable part IDs;
- assembled transforms;
- explode vectors and sequencing;
- interpolation/reduced-motion behavior;
- part lookup and selection hooks;
- component hierarchy;
- inspection state;
- performance-safe detail levels.

Context-specific surfaces may own camera choreography and presentation, but not the underlying mechanical state machine.

## Evidence

Concept imagery is reference only. Runtime evidence comes from the actual implementation and identifies branch/commit.

Desktop, phone portrait, phone landscape, interaction, performance, truth/provenance and rights are release gates.

## Future factory boundary

A future skill can create a manifest, resolve assets, choose an adapter, generate implementation, capture evidence, validate, run truth/rights QA and prepare release without inventing architecture.
