# Unified room / world inventory — 2026-10-04

Status: audited research inventory. No production rewiring implied.

## Scope
Repositories inspected:
- joaoccaldas/konam
- joaoccaldas/canyonmuseum
- joaoccaldas/bellagio
- joaoccaldas/studio-kona
- joaoccaldas/rawdogging
- joaoccaldas/rawdog3d (archived)
- joaoccaldas/blockscreateworld (not code-indexed)

## Core finding
There are multiple overlapping room taxonomies and multiple historical runtime generations. The unification target must therefore separate:
1. world identity,
2. room/experience identity,
3. asset identity,
4. runtime host,
5. lifecycle/finality.

A public route or current-main file is not sufficient evidence that a room is the final artistic version.

## KONA.m / museum runtime
Current generated museum registry: 30 areas.
Ground:
- hall — The Queen K Hall
- sanctuary — The Sanctuary
- hween — Lava Night
- kona — Kona Champions
- pier — Kona by Year
- secret — The Secret Collection

Upper / gallery:
- stair — The Glass Stair
- nave — The Gallery Nave
- bay-st-george
- bay-las-vegas
- bay-nice
- bay-kona
- room-bio
- room-horror
- room-alien
- room-zombie

Against the Clock wing:
- wing-against-the-clock
- hour
- mono
- tri
- types
- paint
- refs

Kona Light wing:
- wing-kona-light
- queen-k
- clipon
- velodrome
- bay
- after-dark
- tunnel

Production brand room outside the 30-area registry:
- nike-running — Nike Running Lab

## KONA canonical product taxonomy
world/konam/rooms-v1.json defines 28 stable room IDs.

Reconciliation state:
- READY_EXISTING: 2
- EXISTS_RENAME: 2
- EXISTS_RECOMPOSE: 9
- EXISTS_NEEDS_QA: 3
- VIRTUAL_CONFIG_ONLY: 5
- ACTUALLY_NEEDS_BUILDING: 7

Important: 28 canonical IDs does not mean 28 finished 3D rooms.

### Ready / near-ready mapping
- room-003 The Pier <- pier
- room-005 Champions <- kona
- room-006 Against the Clock <- wing-against-the-clock
- room-007 Canyon Museum <- hall / Canyon collection

### Recompose from legacy geometry/content
- room-001 The Queen K
- room-002 The Bay
- room-004 Aliʻi
- room-008 The Aero Lab
- room-012 Island Stories
- room-013 The Archive
- room-014 Lost & Found
- room-024 The Makers
- room-028 Elsewhere

### Needs QA/canonicalization
- room-009 The Kit Room
- room-019 Run Lab
- room-025 Prototype Vault

### Virtual/config first
- room-010 Transition
- room-011 Race Week
- room-023 Before Saturday
- room-026 Athlete Rooms
- room-027 Makers' Row

### Actually needs dedicated building
- room-015 The Wind Room
- room-016 Heat
- room-017 Fuel
- room-018 Swim Lab
- room-020 Age Group
- room-021 Women of Kona
- room-022 The Volunteers

## Athlete / brand candidate rooms
Current main contains candidate room packages:
- beast-cave — candidate, public=false, parent room-026
- norwegian-engine — candidate, public=false, parent room-026

Today's final artistic/runtime work is on claude/sharp-ritchie-lycv70 @ cc80c48:
- beast-cave review
- nor3-winter — NOR // 3 · KONA WINTER
- breitling-kona — BREITLING × KONA · Finish-Line Atelier

These must be selectively recovered onto current main before being treated as final public sources.

Superseded/stale for final-room integration:
- norwegian-engine-review.html as a NOR final
- generic ?room=breitling as the final Breitling room

## Bellagio / Las Vegas
Existing Bellagio interior spaces:
- main lobby / Fiori di Como installation
- passage
- Conservatory & Botanical Gardens

Invented level-36 penthouse functional zones:
- Lake Como salon
- dining
- Rat Pack bar
- Fiori glass gallery
- spa / indoor pool
- lift foyer + kitchen end block
- Desert Moon library
- master bedroom
- master bath
- dressing room
- core rotunda atrium
- roof terrace

Cross-world Lab Wing currently exists but must be corrected because its 3 links target stale KONA room generations.

Luxor:
- pyramid exterior
- ziggurat towers
- Sphinx
- obelisk
- Strip/city context
No dedicated walkable Luxor interior rooms found.

## Studio-Kona / full Kona Island
Treat as a WORLD, not a room.

Canonical world zones from PLAN.md:
- Z1 Swim & Kailua Bay
- Z2 Kailua Pier / transition
- Z3 Dig Me Beach / Kamakahonu / Ahuʻena Heiau
- Z4 Aliʻi Drive seawall + finish line
- Z5 Palani Rd
- Z6 Kailua Village
- Z7 Aliʻi Drive south
- Z8 Kuakini / Makala / Queen K town section
- Z9 Queen K lava corridor -> Hāwī
- Z10 Energy Lab
- Z11 Hāwī

Runtime capabilities already include walk, bike, swim and drone modes.
A Canyon Speedmax 3D Museum Studio also exists as an in-world experience.

Studio-Kona also contains a standalone procedural Nice 2026 world in preview-v2.

## Legacy handling policy
Do not delete old rooms until mapping is complete.

Every legacy room must receive one lifecycle:
- CANONICAL
- FINAL_CANDIDATE
- LEGACY_SOURCE
- SUPERSEDED
- ARCHIVE_EVIDENCE
- FUTURE_CONFIG

Rules:
- preserve unique geometry, evidence and authored visual work;
- retire duplicate public navigation;
- never maintain two active canonical identities for the same room;
- aliases may point old IDs/routes to the new semantic ID;
- generated outputs are never source authority;
- final artistic reference requires an explicit source ref/commit plus visual evidence.

## Unified scaling model
World owns:
- global coordinates / zones / streaming
- navigation between rooms
- environment/time/weather
- host renderer lifecycle

Room package owns:
- local geometry/composition
- local interactions
- local story/evidence envelope
- local lighting intent and quality requirements
- no independent global renderer authority

Asset owns:
- canonical identity
- geometry representations / LODs
- materials
- provenance / rights
- anchors / parts
- runtime budgets

Proposed IDs:
- world:vegas
- world:kona-island
- world:nice-2026
- room:konam:beast-cave
- room:konam:nor3-winter
- room:konam:breitling-kona
- room:konam:nike-running
- room:bellagio:lake-como-salon

## Immediate gates
1. Recover the three final 2026-10-04 athlete/brand rooms onto current KONA main safely.
2. Disable/replace stale Bellagio Lab Wing links.
3. Introduce one machine-readable experience registry with final_ref, source_repo, lifecycle, host_type and semantic_id.
4. Map the 30 museum areas into the 28 canonical KONA room IDs without deleting unique content.
5. Register Studio-Kona as world:kona-island, with its 11 zones.
6. Register Bellagio/Luxor as world:vegas zones, not room aliases.
7. Add duplicate-authority validation: one active canonical semantic ID only.
8. Add cross-host smoke/visual/performance tests before native room portability.
