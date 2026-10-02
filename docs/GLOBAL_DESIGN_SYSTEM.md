# Global Experience Design System

Canyon Museum is the reference implementation for every Kona-universe app.

## Typography
- UI/body: Manrope 300-700.
- Editorial/display: Instrument Serif, regular/italic.
- Monospace only for measurements, coordinates and machine data.
- Avoid introducing another UI font.

## Core palette
- Sand: #f4efe7
- Paper: #fbf9f5
- Ink: #12181d
- Muted: #5f6a72
- Reef: #138a8f
- Lava: #e8471c
- WYLD pink: #ff3d8e
- WYLD lilac: #e9cde8
- WYLD aqua: #5fd8d3

Dark rooms may invert surfaces while retaining typography, spacing, radii and semantic accents.

## Shape and spacing
- Primary navigation/actions use pill geometry.
- Cards: 20-26 px radius.
- Small controls: 10-14 px radius.
- Touch target: >=44 px on coarse pointers.
- Default gaps follow an 8/12/16/24/32 rhythm.
- Respect safe-area insets on every mobile edge.

## Interaction
- One dominant primary action per surface.
- Secondary controls stay visually quiet.
- No hover-only action.
- Reduced-motion mode must remain functional.
- 3D remains the hero. UI should frame the world, never cover it.

## Visual regression rule
Changes are not accepted on description alone. Desktop and mobile evidence must show no clipping, flashing/z-fighting, illegible text, lost 3D detail, unexpected darkness or obstructed controls.
