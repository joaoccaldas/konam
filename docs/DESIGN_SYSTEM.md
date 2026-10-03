# KONA Design System

## Product line

**Race the version of yourself you haven't met yet.**

## Principle

**Quiet interface. Dramatic moments. Rich world when chosen.**

## Authority

Runtime visual authority lives in:
- `brand/tokens.css`
- `brand/themes.css`
- `brand/typography.css`

The approved KONA.m Unified Master Brand Strategy defines the intended visual system. Component and feature styles consume semantic tokens rather than redefining the brand.

## Typography

- UI/body: Manrope
- Editorial/display: Instrument Serif
- Technical/data: system monospace
- Human notes / The Intern: Caveat

## Core colors

Light:
- background: #f4efe7
- surface: #fbf9f5
- text: #12181d
- muted: #5f6a72
- accent/action: #ff6a00
- cyan/info/discovery: #00a7c7
- success: #2bbf88

Dark:
- background: #071116
- surface: #0d1920
- text: #f5f3ee
- muted: #b4c0c8
- accent/action: #ff6a22
- cyan/info/discovery: #39c8ef
- success: #55d6a0

Supporting canonical accents:
- molten ember: #ff833d
- progression/lime: #c7f300
- personality/hibiscus: #ff2d6d
- mythic/lilac: #a876fa
- raw salt mist: #e6e9ed
- basalt slate: #282f36
- deep lava obsidian: #080b0e

Do not use pure black or pure white as canonical surfaces. Bright saturated colors are semantic accents, not general background decoration.

## Spacing and geometry

Canonical spacing rhythm:
- 4px
- 8px
- 12px
- 16px
- 24px
- 32px
- 48px
- 64px

Canonical radii:
- controls: 12px
- cards: 20px
- sheets/drawers: 24px
- pills: 999px

## Interaction

- One dominant primary action per surface.
- Minimum touch target: 48 px.
- No hover-only critical action.
- Respect safe areas.
- Reduced-motion mode remains functional.
- 3D loads only after explicit Explore/Inspect intent where the 2D surface can deliver the core value first.
- Room themes may vary, but navigation, typography roles, accessibility, evidence, error and consent patterns remain global.
- Mobile and desktop are responsive compositions of one component system, not separate products.

## Visual QA

Every material UI change requires:
- phone portrait
- phone landscape where relevant
- tablet where layout materially changes
- desktop
- light/dark where relevant
- overflow/clipping check
- active navigation check
- safe-area check
- touch-target check
- focus/keyboard check
- reduced-motion functional check

## Engineering principle

New feature CSS must consume canonical tokens and shared primitives when they exist. A migration is complete only when the superseded duplicate implementation can be removed.
