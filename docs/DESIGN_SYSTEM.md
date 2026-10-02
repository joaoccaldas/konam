# KONA Design System

## Principle

**Quiet interface. Dramatic moments. Rich world when chosen.**

## Typography

- UI/body: Manrope
- Editorial/display: Instrument Serif
- Technical/data: system monospace

## Core colors

Light:
- background: #f4efe7
- surface: #fbf9f5
- text: #12181d
- muted: #5f6a72
- accent: #e85a22
- cyan/info: #1db7d8
- success: #2bbf88

Dark:
- background: #071116
- surface: #0d1920
- text: #f5f3ee
- muted: #b4c0c8
- accent: #ff6a22
- cyan/info: #39c8ef
- success: #55d6a0

## Interaction

- One dominant primary action per surface.
- Minimum touch target: 44 px.
- No hover-only critical action.
- Respect safe areas.
- Reduced-motion mode remains functional.
- 3D loads only after explicit Explore intent.
- Room themes may vary, but navigation, accessibility, evidence, error and consent patterns remain global.

## Visual QA

Every material UI change requires:
- phone portrait
- phone landscape where relevant
- desktop
- light/dark where relevant
- overflow/clipping check
- active navigation check
- safe-area check
