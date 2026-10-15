# Beast Cave (Lionel Sanders × Zwift) — visual review, 2026-10-03

Room: `beast-cave` · module `web/src/beast-cave.js` · package `world/konam/rooms/beast-cave.room.json`
Status: `candidate`, `public_wiring: false`. Only reachable with `?reviewRoom=beast-cave`.
Captured with headless Chromium (SwiftShader), 1440×900, 390×844, 844×390, after the crash fix below.

## 0. Before anything else: the room did not load

`buildBeastCave` threw `ReferenceError: rubber is not defined` (treadmill slats). The bug came in with
`99cd0c3 feat: publish Beast Cave candidate runtime`, so the review room had never rendered in a browser.
This commit fixes it by defining the missing `rubber` material and rebuilding `app/hall.js`.

## 1. How it looks now

| Shot | File |
|---|---|
| Room overview (arrival) | `d-overview.png` |
| From the doorway | `d-door.png` |
| Hero trainer + Speedmax CFR | `d-hero.png` |
| Training screen | `d-screen.png` |
| Run station (blocked) | `d-tread.png` |
| Story wall | `d-story.png` |
| Gear wall (blocked) | `d-gear.png` |
| Phone portrait | `p-overview.png` |
| Phone landscape | `l-overview.png` |

The room reads as **an empty grey concrete box with a white bike in it**. It doesn't read as a pain cave, and nothing in it is Lionel's.

## 2. Defects (must fix before showing anyone)

| # | Problem | Evidence | Fix |
|---|---|---|---|
| P0 | **Overlaps the Breitling brand room.** Beast Cave is x 7.35–35.35, z −4…−26; Breitling (`museum/world/brand_rooms.json`) is x 24.5–36.5, z −18…−30. Breitling's walls cut through the SE quarter, so the treadmill and the gear wall end up inside or behind them. | `d-tread.png`, `d-gear.png`, plus the black slabs in `d-door.png` | Re-footprint Beast Cave (e.g. z1 ≥ −17.5) or move Breitling. This is a world-authority change (`rooms-v1.json`), so it needs its own decision and PR. |
| P0 | **The trainer is assembled wrong.** The flywheel stands *beside* the bike at `heroZ+0.9`. The trainer group isn't rotated with the bike (`rotY = π/2`), and the hidden rear wheel leaves the dropouts hanging in the air. | `d-hero.png` | Rotate the trainer to the bike axis and put the cassette/flywheel at the rear dropout. Or reuse the sourced Zwift Ride / KICKR CORE 2 product (`integrations/sources/zwift-room-v0.json`) as a proper asset. |
| P1 | Story wall text is clipped ("…→ RET", "…nobody se"). | `d-story.png` | Widen the canvas or reduce the font in `lettering(6.4,2.8,…)`. |
| P1 | Fans read as floating bike wheels with no stand. | `d-story.png`, `d-door.png` | Add a floor stand and a grille, and aim the fans at the rider. |
| P1 | The area pill shows the raw id `beast` instead of "Beast Cave". | all shots | Add `beast` to the `WORDS` table in `landing.js`. |
| P1 | Phone portrait overview frames the screen and cuts the hero bike off at the right edge. | `p-overview.png` | Give portrait its own overview target centred on the bike. |
| P2 | Lighting is flat, with one ceiling hotspot. The orange accents (cove, slit) barely register. | all | Add a low key light on the bike, a screen glow spill and a darker ceiling (see §4). |
| P2 | The training screen is a static, generic mountain picture. | `d-screen.png` | Show a live Kona/Queen K route (see §4). |

## 3. What's missing

1. **Lionel.** No voice, no story beats, no numbers, no moment. The pitch JSON lists 8 zones and the room only half-delivers 5 of them. The `kona-horizon` zone doesn't exist at all.
2. **Zwift.** Zwift appears once, as a sentence on a card ("Zwift is the companion"). `integrations/sources/zwift-room-v0.json` (Zwift Ride, KICKR CORE 2, Cog & Click, sourced, with affiliate terms) isn't used anywhere except a unit test.
3. **Interaction.** Every object opens the same kind of text card. There's no ride, no challenge, nothing to take away.
4. **Mess.** Real pain caves are ugly in a specific way: towels, bottles, a whiteboard of intervals, a sweat-stained floor mat, cables, a chalk tally. This room is museum-clean.
5. **Sound.** `theme_scope` lists sound, but none exists (no flywheel whine, no fans, no breathing).

## 4. Turning it into something he'd want

What makes an athlete with a big YouTube channel say yes: (a) it's true to how he sees himself, (b) it's useful to his audience and partners, (c) it's shareable without rights risk to him.

**Concept: "The work nobody sees", an empty saddle you can climb into.**

1. **Empty-saddle hero.** Keep `likeness_status: not-used`. Make the absence the point: the bike on a correctly built smart trainer, a towel over the bars, a bottle on the floor, fans pointed at the empty saddle, the screen still running. Visitors press **Ride** and the camera drops into the cockpit.
2. **The screen becomes Kona.** Swap the generic mountains for an original KONA.m render of the Queen K / Energy Lab with an elevation strip and a moving power trace. This links his room to the product's home course without copying Zwift UI.
3. **A 60-second "Beast Interval" challenge.** A tap or hold rhythm game on the trainer: hold a target "watt band" while the fans spin up and the room's light goes from cold to orange. Result: "You held it for 43 s. Lionel's sessions are measured in hours." It hooks into canonical progression (`CHALLENGE_COMPLETED`) and adds no new state store.
4. **The experiment wall** (replaces the generic gear wall, moved out of the Breitling overlap). A whiteboard runs his loop, EXPERIMENT → MISS → INSPECT → ADAPT → RETURN, as 5 pinned cards, each a *publicly documented* experiment from his career (sourced, dated, linked to his own videos). His audience knows these, so it reads as respect, not marketing.
5. **The Gap, made specific.** The basalt slit sculpture gets one sourced fact: his Kona runner-up finish (verify the year and margin against official results before shipping). "Almost is still information" then lands.
6. **Zwift, done properly.** One "Build this cave" card: Zwift Ride / KICKR CORE 2 from the sourced registry, with the date stamp and an "Unofficial, not a partnership" line. Affiliate links stay off until the programme is approved (`affiliate.status: program-available-not-approved`).
7. **Sound bed.** Flywheel whine that scales with the challenge, fan hum and a low room tone. It's cheap and does more for atmosphere than any mesh.
8. **The pitch artifact.** A 30-second fly-through video plus a direct link (`?reviewRoom=beast-cave&room=beast`) sent with the pitch. That's what he'll actually look at, probably on a phone, so phone portrait must be the best-looking capture, not the worst.

## 5. Truth / rights boundaries (unchanged)

- No endorsement, partnership or sponsorship claims for Lionel Sanders, Zwift or Canyon (`docs/LAUNCH_TRUTH.md`).
- No likeness or image use until rights are cleared. All career facts must be sourced and dated.
- The Speedmax CFR stays labelled as a KONA.m study, not his race build.
- No copied Zwift UI, logos or route art.

## 6. Suggested order

1. Re-footprint vs Breitling (world authority PR).
2. Fix the trainer assembly, clipped story text, area label and phone framing.
3. Lighting pass, mess props and sound.
4. Kona screen, Ride camera and Beast Interval challenge.
5. Experiment wall with sourced cards, plus the Zwift "build this cave" card.
6. Capture the pitch fly-through (portrait first).

---

# v2 — split, cinematic pass, generated equipment (2026-10-03)

Evidence: `v2/` (desktop 1440×900, phone portrait 390×844 `p-arrive.png`, phone landscape 844×390 `l-arrive.png`).
Captured headless (SwiftShader); a real GPU renders the same scene at full frame rate.

## What changed

| Area | Change | Evidence |
|---|---|---|
| Footprint | Beast Cave is the north half (z −4…−17.7); Breitling keeps the south half unchanged, joined in review by one door in the party wall. A test fails if they overlap again. | `d-door.png`, `d-breit.png` |
| Acoustic foam | ~5k real 3D pyramids on three walls, one instanced draw call | `d-neon.png`, `d-hero.png` |
| Neon | Amber "BEAST CAVE / the work nobody sees" with a painted halo (no post pass) and a RectAreaLight onto the room | `d-neon.png`, `d-side.png` |
| Screen | Original Queen K → Energy Lab route study, live power trace, RectAreaLight, mirrored in the floor | `d-hero.png` |
| Hero | Empty saddle; Speedmax CFR study on a generated direct-drive trainer at the rear axle; drum fans aimed at the saddle; towel, bottles, sweat | `d-close.png`, `d-side.png` |
| Story | Experiment wall: five published results read as one loop; The Gap with 2:27 (Kona 2017) | `d-exp.png`, `d-gap.png` |
| Gear | Dense slatwall: helmets, bottles, shoes, blank bibs, medals | `d-gear.png` |
| Run | Generated curved treadmill | `d-tread.png` |
| Ride | "Ride" puts the visitor in the cockpit for a 60 s interval; fans, light and flywheel sound follow the watts; ≥ 30 s in band logs CHALLENGE_COMPLETED | — |
| Breitling | Data-driven mood: dark exposure, fog, spot + shaft on the watch, glossy dais, 17-hour race-clock dial, swim/bike/run portals onto the Pacific | `d-breit.png`, `d-portals.png` |
| Phones | Arrival frames the bike against the screen; a hint replaces the full card | `p-arrive.png`, `l-arrive.png` |

## Generated assets

Trainer, drum fan and curved treadmill were generated with Higgsfield (gpt_image_2_5 unbranded reference → Meshy 7 image-to-3D) and optimised with gltf-transform (1K WebP textures, meshopt, ~14k tris, 480–880 KB each). Job IDs, hashes and the `generated-unbranded-rights-review` status are in `world/konam/candidates/beast-cave-asset-manifest-v1.json`. Procedural stand-ins render until each GLB loads.

## Truth boundaries kept

- Facts come from `pitch/lionel-sanders/career-facts-v1.json`, all sourced and dated. The Antigravity notes' "440 W threshold" and "St. George 2021 near miss" are unsourced and were not used.
- No likeness, no endorsement or partnership claims, no Zwift UI or route art, no Breitling marks.

## Still open

- Fronds from the hall palm at (6.1, −11.8) poke through the west wall near the Gap.
- The artworld Secret Collection room (x 35–55, z −15.5…−44) overlaps Breitling's east glass strip (x 35–36.5). This was there before this work; Breitling's footprint is unchanged.
- Public URL: GitHub Pages publishes `main` only after certification, so the room needs a merge to be public.

---

# v3 → v4: athlete-safe, lived-in, then intimate (2026-10-04)

Evidence: `v4/before-after.png`, `v4/progression.png`, `v4/{approach,reveal,hero,wall,gear,phone-arrival}.png`.

- **v3**: removed the Breitling link door and the Zwift price card (tests now forbid them). Replaced the neon with a painted block wall (sprayed stencil, chalk tally, taped generic sessions). Added bare bulbs, duct, a worn rug, patchy foam and clutter. Added a calm arrival card, a shareable result image, a personal best through `storage.js`, an explicit empty "Lionel's line" slot, and `APPROVAL_KIT.md`.
- **v4**: the 28×14 m, 5.4 m-high box became a tall approach gallery (career wall, the Gap, story wall). A lit doorway with an ember lintel leads into a 14×9 m cave with a 3 m joisted ceiling, foam-lined walls and the bike 6 m from a 4.4 m screen. Everything else is within reach.
- **Bug caught by the render pipeline, not by unit tests**: in v3 a helper was used before it was defined, which crashed the 3D world on the review link. Fixed in `fix(beast-cave): declare info()…`.

## Why it is still not a definite yes

1. **Consent.** The room uses his name and career. Only Lionel and his team can turn this into a yes, by approving or replacing the name and the five captions (see `APPROVAL_KIT.md`).
2. **Reach.** It is unmerged and review-only. The public app gates 3D behind onboarding and progression, so a pitch link would need to land straight in the room after merge.
3. **It is not his cave.** The room is a convincing *pain cave*, not *his*. Real authenticity needs his input (what the real room looks like, what is on the wall) or it stays generic.
4. **"Lionel's line" is empty by design.** The strongest hook, racing his actual interval, needs one ride from him.
5. **Fidelity.** The generated trainer, fans and treadmill are good at room distance and soft up close. The bike is a Speedmax study, not his machine. The phone frame rate is unmeasured on real devices (all evidence here was rendered in software).
