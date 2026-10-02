# Global Machine Inspection Engine V1

## Purpose

Exploded inspection is a global Kona.m capability.

A bike may appear in the Museum, Garage, Studio, an athlete room, a partner pavilion or a future world. The mechanical identity and explode behavior of that bike must remain the same everywhere.

## Separation of concerns

### Machine truth owns
- stable part IDs;
- component hierarchy;
- source/provenance;
- mechanical system membership;
- interfaces between parts;
- fasteners;
- optional service metadata;
- authored explode vectors/order.

### Global inspection kernel owns
- part discovery;
- mesh-to-part lookup;
- assembled transforms;
- explosion sequencing;
- animation/reduced-motion behavior;
- part selection hooks.

### Context owns
- camera choreography;
- labels/cards/sheets;
- environment;
- lighting;
- narrative;
- whether inspection is available at that moment.

Rooms never own explode algorithms.

## Compatibility

Existing GLBs already carry `userData.part` and `userData.explode`. V1 treats these as a compatibility adapter so current bikes keep working.

The forward machine contract is `museum/schemas/machine-assembly.schema.json`. New high-fidelity bike production should emit a component graph in addition to GLB metadata.

## Why a graph matters

A world-class bike exploded view is not simply parts flying away from the frame.

The system needs to understand relationships such as:

```
frame
├── fork
│   ├── steerer
│   └── front brake
├── cockpit
│   ├── basebar
│   ├── risers
│   ├── extensions
│   └── arm pads
├── drivetrain
│   ├── crank
│   ├── chainrings
│   ├── chain
│   ├── cassette
│   └── derailleurs
└── hydration/storage
```

At higher fidelity, bolts, bearings, spacers, cable/hose paths and interfaces become inspectable nodes too.

That graph enables:
- mechanically sensible explode order;
- subsystem isolation;
- maintenance stories;
- compatibility reasoning;
- spare/vendor links;
- weight rollups;
- future training data for triathlon-specific 3D generation.

## Rendering principle

Preserve mechanical readability before spectacle.

The animation may be cinematic, but a user must still understand:
1. what the part is;
2. where it came from;
3. what it connects to;
4. what system it belongs to;
5. how to return to assembled state.

## Performance

Explosion must not duplicate meshes merely for animation. Move existing nodes whenever possible.

Repeated micro-components should use instancing where inspection semantics allow it.

LOD and detail loading should be progressive:
- distant/room view: silhouette;
- inspect intent: engineering detail;
- selected subsystem: granular parts;
- selected part: highest available evidence-backed detail.

## Brand

The machine experience consumes the global Kona.m brand authority.

Engineering precision is paired with curiosity and play. The interface remains calm, editorial and human; the machine can become spectacular without turning the controls into a sci-fi dashboard.
