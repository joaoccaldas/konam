# NOR // 3 · Norwegian Engine — canonical Kona.m room formula

Status: **candidate installation, unwired**

This concept intentionally reuses the existing Kona.m museum architecture. It does not create another scene, renderer, camera, lighting authority, navigation system or review runtime.

## Formula source

The implementation follows the existing room grammar in:

- `web/src/landing.js` — canonical museum renderer, AgX tone mapping, RoomEnvironment PMREM, responsive museum FOV, depth precision, quality tiers, routing, pickables, obstacles and frame loop.
- `web/src/galleries.js` — themed-room shell, per-room fog/exposure, group visibility and reduced-motion lifecycle.
- `web/src/engine/room-installations.js` — indexed room-atmosphere builders for Bio, Horror, Alien and Zombie.
- `web/src/engine/textures.js` and `web/src/roomkit.js` — shared deterministic procedural surfaces/effects.
- WYLD in `web/src/landing.js` — identity is created by local floor/wall/light/content treatment while the room remains inside the same museum renderer and navigation.

## Architectural rule

**New:** one `norwegian` installation preset.

**Not new:**
- WebGL renderer
- perspective camera
- OrbitControls
- PMREM / RoomEnvironment
- tone mapping
- global fog authority
- room navigation
- collision system
- pickable system
- bike/livery loader
- room card system
- mobile quality system
- standalone review application

## Concept

**Three lanes. One system. Measure. Adapt. Repeat.**

Editorial concept line, not an athlete quote.

The room should read as a western-Norway performance lab rather than a generic Nordic gym:

- dark wet stone / basalt
- brushed/anodised metal
- smoked timber
- matte rubber
- translucent environmental glass
- cool atmospheric light
- sparse Kona orange only for destination/progress
- visible human handling: protocol cards, bottles, towels, sample rack

No flag-saturated Norwegian theme, cyberpunk neon, glossy plastic, copied medal/trophy design, sponsor logo or athlete likeness.

## Local installation zones

The installation builder creates only local objects inside the host room:

1. **Three Rails** — three parallel training lanes.
2. **Protocol Table** — analyzer, sample rack and protocol cards.
3. **Altitude / Environment** — translucent controlled-environment bay.
4. **Heat / Cool** — fans and restrained heat source.
5. **Podium Vault** — abstract shared achievement objects.
6. **Fjord Relief** — original layered geometry, not copied map imagery.
7. **Kona Line** — one thin warm destination line.
8. **Moisture field** — shared `motes()` lifecycle, automatically culled/reduced with the host room.

## Three athletes without three new bike systems

The builder exposes three `specimenSlots`.

When visual design is approved, the existing museum bike asset/livery loader should populate these slots. The installation itself must not author or maintain another bike model pipeline.

## Current gate

The installation is registered in `museum/world/decorations.json` but **not referenced by `museum/world/rooms.json`**.

Therefore it is not currently:
- on the map,
- in the rail,
- walkable,
- visible,
- part of the canonical room count,
- or part of public navigation.

That wiring is a separate approval step after visual review.

## Evidence anchors for the eventual story layer

- Norway’s 2018 World Triathlon Series Bermuda podium sweep: Casper Stornes, Kristian Blummenfelt, Gustav Iden.
- The Norwegian training system has publicly documented heavy use of measured feedback including lactate, power/speed and environmental work.
- The 2025 IRONMAN World Championship in Nice ended with Stornes, Iden and Blummenfelt occupying the men’s podium.

Event facts must remain source-backed in public copy, and achievement objects should be original interpretations rather than copied medals or trophies.
