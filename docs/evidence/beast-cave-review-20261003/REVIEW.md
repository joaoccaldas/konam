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
