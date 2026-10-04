# NOR // 3 · Kona Winter: review build (2026-10-04)

**Route:** `?reviewRoom=nor3-winter` (review only, not public). It reuses the review footprint and the host world renderer, cards, mood, navigation and sound.
**Source:** `web/src/nor3-winter.js`
**Facts:** `pitch/norwegian-trio/trio-facts-v1.json` (status: verify-before-outreach)
**Assets:** `world/konam/candidates/nor3-winter-asset-manifest-v1.json`

`concept-vs-render.jpg`: the reference concept image (top) against the real-time render (bottom).

| Shot | What it shows |
|---|---|
| `hero.jpg` | The concept view from the lounge: plunge pool, three lit lanes, three athlete panels, KONA.m header, and the window turning from fjord to Kona sunset |
| `lanes.jpg`, `towel.jpg` | Platforms with LED edges, unbranded Speedmax CFR study on wheel-on trainers, drum fans, terry towels with house slogans and the Norwegian flag |
| `window.jpg` | Glass wall, terrace with snow and lava stones, 3D palms in front of the generated plate, falling snow |
| `fire.jpg`, `plunge.jpg`, `lounge.jpg` | Stone-ring fire with flame and ember shaders; plunge pool with water shader and ice; sofa, fur blanket, table with books, candle, KONA.m bottle, mug and notebook |

## Measured (headless, exact source)

| | Room meshes | Room triangles | Scene draw calls | Errors |
|---|---|---|---|---|
| Desktop 1440×900 | 95 | 312k | 355 | 0 |
| Phone 390×844 | 95 | 169k | 101 | 0 |

Budget from the room manifest:
- Phone: ≤ 95 calls, ≤ 180k triangles.
- Desktop: ≤ 180 calls, ≤ 450k triangles.

How the room stays inside it:
- The three bikes share one set of InstancedMeshes.
- Static architecture is merged per material.
- One shadow pass covers all three lanes.
- Snow, embers, flames and water animate on the GPU.
- One local cube capture provides reflections. It sees only this room and is re-taken only when the room changes.
- The host now skips drawing the rest of the world once you're 4 m inside a review room. This applies to the Beast Cave too.

## Truth and rights

- **Results:** only from the sourced facts file (Wikipedia citations). Casper Stornes' lane deliberately carries no results.
- **Copy:** panel taglines and towel slogans are KONA.m copy, and each panel says "A KONA.M READING · NOT THE ATHLETE'S WORDS".
- **Concept copy not used:** "STRATEGIC NON-START" from the concept image reads as a joke about a real race and is replaced with "PATIENT / PRECISE / STILL AERO".
- **Bikes:** KONA.m's Speedmax CFR study, drawn without decals. No Canyon, DT Swiss or other marks sit next to the athletes' names. The concept's branded bikes are not reproduced.
- **Likeness:** none used. No endorsement or partnership is claimed, and every card carries the disclaimer.
- **Window plate:** generated imagery, recorded with provenance; it shows an imagined landscape.

## Still short of the concept

- **Floor reflections:** the concept's mirror-wet floor needs real planar reflections, which would cost a second scene render. Today's floor uses a local cube capture plus a faded plate reflection.
- **Bloom:** the concept's LED and fire glow needs post-processing; the host world has no composer yet. Glow is painted with additive planes.
- **Hero props:** the sofa, kit and fire are procedural. Authored GLBs (fur throw, tri-suit on a hanger, fire bowl) would close the gap on close-ups.
- **Plate resolution:** the window plate is 2048 px wide. A higher-resolution plate would sharpen the view for big desktop screens.
