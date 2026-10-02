# KONA Brand System V9

This is the canonical brand and interface contract for the KONA product. Other design-system documents are historical pointers only.

## Product principle

**Calm surface. Deep world underneath. Professional where trust matters. Strange where discovery creates memory.**

The interface should feel editorial and human before it feels like software. The 3D world, Studio and museum are optional depth, never the front-door dependency.

## Information architecture

Keep the five destinations deterministic:

- Home
- Discover
- Garage
- Plan
- Me

Do not rename navigation for personality. Personality belongs in content, artifacts and moments.

## Typography

- Functional UI/body: Manrope
- Editorial/display: Instrument Serif
- Technical/data: system monospace

No additional primary UI typeface.

## Modes

KONA exposes three appearance modes:

- **Light**: warm paper, dark ink, Lava accent.
- **Dark**: deep blue-black, warm light ink, bright Lava accent.
- **Random**: a stable-for-the-session expressive mode using the same neutral structure with one dominant family and at most one collision family.

Random is not rainbow CSS. It changes expressive tokens, artifact treatments and selected micro-moments while preserving hierarchy, accessibility and navigation.

Random families:

- Lava
- Ocean
- Hibiscus
- Lilac
- Lime

## Personality allocation

- 70% calm and literal
- 20% human and emotionally aware
- 10% unexpected

Unexpected copy is event-driven, never sprayed across every screen.

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

New surfaces should compose these primitives before inventing another rounded container.

## Shape

Shape communicates object type.

- Editorial surfaces can be edge-to-edge or use restrained 0-12px radii.
- Museum labels/spec plates are mostly square or lightly rounded.
- Film frames and photo artifacts use physical borders.
- Stickers may use irregular rotation and tighter radii.
- Pills are reserved for compact controls, segmented controls, tags and primary actions where appropriate.

Avoid making every content object a 20-26px rounded card.

## Core Light palette

- background: #f4efe7
- surface: #fbf9f5
- text: #12181d
- muted: #5f6a72
- accent: #e85a22
- info/ocean: #1db7d8
- success: #2bbf88

## Core Dark palette

- background: #071116
- surface: #0d1920
- text: #f5f3ee
- muted: #b4c0c8
- accent: #ff6a22
- info/ocean: #39c8ef
- success: #55d6a0

## Interaction

- One dominant primary action per surface.
- Minimum touch target: 44px.
- No hover-only critical action.
- Respect safe areas.
- Reduced-motion mode remains fully functional.
- No Three.js/GLB/HDR dependency on first paint.
- 3D loads only after explicit Explore intent.
- Mobile world movement favors guided follow, tap-to-move, tap-to-select, recenter and overview instead of miniature FPS controls.

## Content composition

Default screen hierarchy:

1. one image or visual field
2. one idea
3. one primary action
4. utility after the main action

Home should feel like today's page in a race story, not a dashboard.

Discover is organized around interesting things:
People · Machines · Stories · Places · Rooms.

Rooms are one depth dimension, not the whole information architecture.

## Imagery grammar

Target mix across the product:

- 40% people
- 25% objects
- 20% place
- 10% evidence
- 5% visual interruption

Do not let KONA become visually dependent on lava, palms and sunsets.

## Accessibility and privacy

Brand expression never overrides:

- readable contrast
- semantic labels
- keyboard access
- reduced motion
- safe-area handling
- privacy and consent language
- source/evidence markers

The public repository must not contain private user information, credentials, local-machine paths or private correspondence.

## Visual QA

Material UI changes require evidence for:

- 390px portrait Light
- 390px portrait Dark
- Random state where relevant
- desktop Light
- desktop Dark
- clipping/overflow
- safe areas
- active navigation
- reduced motion
- no accidental 3D load on entry

Golden surfaces are:

1. Landing
2. Home
3. Discover
4. Artifact
5. Garage

The five should feel recognizably related even with logos removed.
