# The Hollow House — Halloween haunted house (candidate native room)

A storm night in a house that remembers every ride that never finished. **ARRIVE → LISTEN → READ → DESCEND → FIND → RUN.**

Status: `candidate`, not public. Review it at `index.html?reviewRoom=hollow-house` (it adds a **Hollow House** chip to the rail and map; nothing is wired into the public registry or sitemap). Manifest: `world/konam/rooms/hollow-house.room.json`. Assets: `world/konam/candidates/hollow-house-asset-manifest-v1.json`.

## Architecture (same contract as Lava Night and Beast Cave)

One native-room module built into `landing.js` on the shared host: the host's renderer, camera, controls, cards, pickables, obstacles, map, quality tiers, culling and loading. The room adds **no renderer, camera or controls** (a test enforces that). East of the hall's glass wall, x 7.35 → 35.35, z −31.2 → −45.6, entered through a doorway cut into the glass at z −36.9 → −39.9.

| Module | Owns |
| --- | --- |
| `web/src/hollow-house.js` | the seven zones, furniture, interactions, per-frame update |
| `web/src/hollow-director.js` | every scare. Pure logic, no three.js, unit-tested |
| `web/src/horrorkit.js` | shared primitives: lighting shield, geometry batching, light pool, fog swap, skeleton / bat / cobweb / pumpkin / dust-sheet props |
| `web/src/horrorkit-surfaces.js` | seeded, tileable PBR surfaces |
| `web/src/roomSound.js` | extended with a `haunt` bed and `cue()` one-shots (synthesised, no audio files) |

### Reuse decisions (REUSE → ADAPT → RESTYLE → COMPOSE → CREATE)

- **REUSE** the Speedmax CFR GLB and bike pipeline; Lava Night's skeleton and cobwebs (extracted unchanged into `horrorkit.js`, and Lava Night now imports them, so the two rooms share one implementation); `roomkit.js` dust, mist, tally-mark and glyph painters; the host's `lettering`.
- **ADAPT** `engine/skins.js` for the machine's pale livery; `roomSound.js` for the audio.
- **CREATE** only what did not exist: the lighting shield, geometry batching, light pooling, fog swap and drape primitive (all in `horrorkit.js`, written to be reused by the next dark room), the surface set, and the room itself. Reasons are recorded per asset in the asset manifest.

## Why it looks the way it does

- **The dark is the room's own.** The hall is lit by a 2.45 sun, a hemisphere light and a bright environment map, and the sun's shadow frustum does not even reach the east end of the footprint. A night interior cannot depend on any of that. `shieldMaterial` rewrites the PBR light loop so room materials ignore the sun, sky light and environment and are lit only by point lights plus one ambient uniform the room controls (that is also what makes lightning and blackouts possible). `web/test/hollow-house-native.test.mjs` proves the patch applies to the installed three.js.
- **Hyper-detailed without hyper-cost.** Every static surface is merged per material with world-metre UVs, so one texel density runs across walls, floors and furniture: ~25 draws for the shell and furniture. Surfaces are colour + bump (+ wet roughness) maps painted from seeded noise: planks with grain and nails, cracked marble with veins, three wallpapers with peeling and water runs, brick with salts, flagstones, a worn runner, rust, sheets, craquelured portraits.
- **Real light where it matters.** One lantern follows the visitor, and a pool of four real lights (two on phones) re-aims at the nearest of ~25 flame sources, fading as the nearest set changes. Everything else is emissive colour, additive glow and baked-style ambient occlusion ramps at wall junctions.
- **Depth.** Fog is swapped from the hall's day haze to a close dark fog while inside (and restored exactly on exit), so the corridor vanishes into black. Low mist, dust motes, moonbeams from every window, rain and a storm view outside.
- **Surfaces arrive lazily.** The room is built at once from plain dark materials; the painted surfaces are generated one per idle slice, nearest the door first, so the museum's start-up is not blocked (generation is ~6 s of main-thread work on a software-rendered CI browser).

## The house rules (enforced by tests)

1. Nothing ever touches, blocks or traps the visitor, and nothing takes control of the camera. The front door shuts behind you and swings open again before you reach it; the doorway itself is never blocked.
2. **The Lodger only ever moves while it is out of view or the lights are out**, and never comes closer than 5.2 m. If you hold its gaze too close, the lights flicker and it is gone.
3. Lightning is at most one flash every 13 s with a soft 90 ms attack. No strobe.
4. **Reduced motion gets stillness**: no lightning, flicker, blackout, door slam, rocking or movement. The static house is still unsettling.
5. Fiction. No real people, no likenesses, no brand marks, no equipment claims. The portraits are invented sitters; the ledger's names are blank on purpose. The doorway sign carries the content note.

## Zones

Foyer (double height: checker marble, grand stair to a landing door that glows underneath, stained window over it, a swinging chandelier, eight portraits whose pupils find you, a clock, a mirror, sheeted armchairs) → corridor (runner, sconces that die one by one from the far end, the Lodger) → parlor (séance table, six chairs and seven candles, a chalk circle, fireplace, piano) · nursery (a rocking chair that rocks harder while you are in the room, crib and mobile, a doll that turns only when you are not looking) · library (643 books on one draw call, a lamp, the ledger, a book that leaves its shelf when you look away) · dining (a table laid for guests, one sheeted chair at its head) → cellar (brick, pipes, swinging bulbs, furnace, tally marks, a skeleton, and the CFR under a half-pulled sheet; reach it and the lights go for a few seconds, then the way out is lit for you).

## Review checklist (release gates)

`schema`, `architecture`, `assets`, `desktop-visual`, `mobile-portrait`, `mobile-landscape`, `interaction`, `performance`, `truth`, `rights`, `content-safety`. Evidence belongs in `docs/evidence/hollow-house/`, captured from this implementation with `node web/hollow-house-evidence.mjs`.

Known limits at candidate stage: no real-device performance numbers yet (budgets are measured by the evidence script on a software-rendered browser and must be re-measured on a phone before promotion); a content-safety review of the lightning/blackout moments is part of promotion; the surfaces are procedural, and a Blender-authored furniture pass can replace individual pieces later by manifest without changing the room.
