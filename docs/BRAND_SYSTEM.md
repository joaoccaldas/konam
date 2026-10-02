# Kona.m Brand System V10

This is the canonical brand and interface contract for Kona.m. Historical design documents are evidence, not competing authorities.

## Product principle

**Calm surface. Deep world underneath. Professional where trust matters. Strange where discovery creates memory.**

The interface should feel editorial and human before it feels like software. The 3D world, Studio and museum are optional depth, never the front-door dependency.

## Launch freeze

The launch visual language is established. Do not introduce another global aesthetic before launch.

Keep:
- sand / lava / ocean / sunrise semantic roles;
- Instrument Serif for editorial meaning;
- Manrope for functional UI;
- system monospace for evidence/data;
- sparse handwritten human accents;
- image/3D-led hero moments;
- semantic artifact grammar;
- negative space;
- one dominant primary action.

Park:
- cinematic onboarding;
- neon/sci-fi dashboard as global UI;
- additional primary fonts;
- broad CSS/radius redesign;
- decorative animation before intent.

## Information architecture

Keep five deterministic destinations:

- Home
- Discover
- Garage
- Plan
- Me

Internal route IDs remain stable. Do not rename navigation just to add personality.

## Typography

- Functional UI/body: Manrope
- Editorial/display: Instrument Serif
- Technical/data: system monospace
- Human note: Caveat, sparingly

No additional primary UI typeface for launch.

## Modes

Kona.m exposes:
- **Light**: warm paper, dark ink, sunrise action;
- **Dark**: deep blue-black, warm light ink, bright sunrise action;
- **Random**: stable-for-session expressive variation using the same hierarchy.

Random is not rainbow CSS. It changes expressive tokens and selected moments without changing navigation, accessibility or information priority.

## Personality allocation

- 70% calm and literal
- 20% human and emotionally aware
- 10% unexpected

Unexpected copy is event-driven. Serious information is always literal.

## Artifact grammar

Prefer semantic artifacts over universal cards:

- EditorialHero
- PhotoArtifact
- MuseumLabel
- SpecPlate
- RaceBib
- MapFragment
- Sticker
- FilmFrame
- FieldNote

New surfaces should compose existing primitives before inventing another rounded container.

## Shape

Shape communicates object type.

- editorial surfaces may be edge-to-edge or restrained;
- museum labels/spec plates mostly square/lightly rounded;
- photo/film artifacts use physical borders;
- stickers may be irregular;
- pills are controls/tags, not the default content shape.

Avoid making every object a 20–26px rounded card.

## Core palette

Light:
- background #f4efe7
- surface #fbf9f5
- text #12181d
- muted #5f6a72
- action/sunrise #ff6a00
- discovery/ocean #00a7c7
- success #2bbf88

Dark:
- background #071116
- surface #0d1920
- text #f5f3ee
- muted #b4c0c8
- action #ff6a22
- discovery #39c8ef
- success #55d6a0

The canonical values live in `brand/tokens.css` and `brand/themes.css`; this document describes intent.

## Interaction

- one dominant primary action per surface;
- minimum touch target follows canonical token;
- no hover-only critical action;
- respect safe areas;
- reduced motion remains fully functional;
- no Three.js/GLB/HDR dependency on first paint;
- 3D loads only after explicit intent;
- mobile world movement favors guided/tap/recenter patterns over miniature FPS controls.

## Content composition

Default hierarchy:

1. one visual field;
2. one idea;
3. one primary action;
4. utility after the main action.

Home should feel like today's page in a race story, not a dashboard.

Discover is organized around:
**People · Machines · Stories · Places · Rooms.**

Rooms are one depth dimension, not the entire IA.

## Imagery grammar

Target mix:
- 40% people
- 25% objects
- 20% place
- 10% evidence
- 5% interruption

Do not let Kona.m become visually dependent on lava, palms and sunsets.

## Language

Product identity is **Kona.m**.

Preserve:
- Canyon and Speedmax when they are real brand/history content;
- Kona when referring to the place/race context;
- technical legacy identifiers where compatibility requires them.

Do not perform global product-name replacement across historical/provenance content.

## Accessibility and privacy

Brand expression never overrides:
- readable contrast;
- semantic labels;
- keyboard access;
- reduced motion;
- safe areas;
- privacy/consent language;
- source/evidence markers.

## Visual QA

Material UI changes require evidence for:
- phone portrait;
- short landscape where relevant;
- desktop;
- Light/Dark;
- Random where relevant;
- clipping/overflow;
- safe areas;
- active navigation;
- reduced motion;
- no accidental 3D load on entry.

Golden surfaces:
1. Landing
2. Home
3. Discover
4. Artifact
5. Garage

They should feel related even with the logo removed.
