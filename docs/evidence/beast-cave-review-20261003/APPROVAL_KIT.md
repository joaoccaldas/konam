# Beast Cave: approval kit for Lionel Sanders and team

**What this is.** An independent KONA.m 3D room about training indoors and trying again. It is built around published race results, an empty saddle, and a 60-second interval anyone can ride in the browser.
**What it is not.** It is not affiliated with you, endorsed by you, or sponsored by you or any brand. Nothing goes public without your sign-off.
**Status.** Private review build only: `?reviewRoom=beast-cave`, not linked from the public app.

---

## 1. Our promises (enforced by automated tests in the repo)

| Promise | How it's enforced |
|---|---|
| No third-party brands inside your room: no watch brand, no training-app or hardware sales | Test fails if `breitling`, `zwift-room`, "BUILD THIS CAVE" or prices appear in the room code |
| No door or route from your room into any brand room | Test checks the south wall is solid, with no walkable gap |
| No likeness: no photos, no avatar of you, no voice | `likeness_status: not-used` in the room manifest |
| No invented numbers about you | Every result comes from one sourced file (`pitch/lionel-sanders/career-facts-v1.json`) |
| "Lionel's line" stays empty until you ride it | The result card says so in plain words. No ghost or estimate is ever invented |
| The bike is not presented as yours | Speedmax CFR study, labelled "not presented as Lionel Sanders' race build" |
| No copied training-app UI or route art | Original route study, drawn in code |

---

## 2. Every fact about you on screen

| Wall card | Result | On-screen line | Source |
|---|---|---|---|
| EXPERIMENT · 2010 | IRONMAN Louisville · 10:14:31 | "First full-distance finish." | Wikipedia: Lionel Sanders |
| MISS · 2016 | IRONMAN World Championship, Kona · 29th · 8:44:49 | "A hard day on the island." | Wikipedia: Lionel Sanders |
| INSPECT · 2016 | IRONMAN Arizona, 20 November · 7:44:29 | "Six weeks after Kona, the full distance in under 7:45." | Wikipedia: Lionel Sanders |
| ADAPT · 2017 | IRONMAN World Championship, Kona · 2nd · 8:04:07 | "40 minutes faster on the same course, one year on." | Wikipedia: 2017 IRONMAN WC; TRI247 race report |
| RETURN · 2020 | Canadian hour record, 23 October · 51.304 km | "One hour, as far as possible." | Wikipedia: Lionel Sanders |
| THE GAP (sculpture) | Kona 2017: 8:04:07 vs Patrick Lange 8:01:40 → **2:27** | "Almost is still information." | Wikipedia: 2017 IRONMAN WC; TRI247 |

The loop labels (EXPERIMENT → MISS → INSPECT → ADAPT → RETURN) are our editorial reading, and the wall says so: *"A KONA.m reading, not the athlete's words."*

**Please confirm or replace:** each of the five one-line captions, and whether you want the Gap (the 2017 margin) in the room at all.

---

## 3. Every other sentence on screen

**Hall sign:** "LIONEL SANDERS · BEAST CAVE" / "The work nobody sees."
→ *Needs your sign-off on the name.* Alternative: "The Cave". We will not use "Beast" if it isn't yours to give.

**Arrival card:** "AN INDEPENDENT ROOM · LIONEL SANDERS" / "The work nobody sees." / "Not a trophy room." / "A training room with nobody in it. Five published results on the wall, one empty saddle, one 60-second interval." / disclaimer.

**Wall stencil:** "THE WORK / NOBODY SEES". **Story wall:** "Not a trophy room. / A room for the work nobody sees."

**Object cards** (title / line):
- **The machine:** "The place where excuses get boring." The bike is the KONA.m Speedmax CFR study, not presented as your race build.
- **Screen:** "Queen K, on loop." Original route study, with no third-party training-app screens.
- **Fans:** "Wind you have to bring yourself."
- **Whiteboard:** "Written down, then done." Generic session, *"not an athlete's actual plan."*
- **Taped sheets and calendar:** generic sessions, *"example sessions · not an athlete plan"*, no dates claimed.
- **Run lab:** "Same cave, different suffering."
- **Gear wall:** "Objects remember work." Nothing labelled as your equipment.
- **Fuel:** "Within arm's reach of the bike." No products shown.
- **Archive:** "The laboratory came first." *"History of the idea, not a claim about any athlete's current setup."*
- **Reset:** "Recovery is part of the work."
- **Repeat (sculpture):** "Same circle. Different athlete."

**Interval:** "BEAST INTERVAL · 60 S", four bands (Settle 240–280 W, Build 280–320 W, Hold 310–350 W, Empty it 340–385 W). The result card adds: "Simulated power from your taps, not a real trainer reading."
**Lionel's line:** "Not recorded. This slot stays empty until Lionel Sanders chooses to ride the interval; nothing here is invented on Lionel's behalf."
**Share image footer:** "KONA.M · AN INDEPENDENT ROOM · SIMULATED POWER FROM TAPS".

The full machine-extracted list lives in `web/src/beast-cave.js`. Every string there is the string on screen.

---

## 4. What's original, what's generated, what's reused

| Element | Origin |
|---|---|
| Room, walls, foam, block wall, stencil, sculptures, screen graphics | Original KONA.m code (procedural) |
| Trainer, drum fans, curved treadmill | Generated with Higgsfield (unbranded reference image → Meshy 7 3D). Generic, not a model of any named product. Provenance and hashes are in the asset manifest |
| Bike | KONA.m's existing Speedmax CFR study |
| Pitch videos | Real app renders. In the room shots, the camera motion is AI-interpolated by Kling 3.0 and disclosed as such |

---

## 5. What's in it for you

- **An interval your audience can ride** from a link: 60 seconds, four bands, fans and lights that respond. It ends with a **shareable result card** ("I held 43 s of the Beast Interval").
- **Personal bests** on each device. A public leaderboard is the next step if you want it.
- **Your line, if you choose.** Ride it once (any trainer file), and the empty slot becomes "Lionel's line": a ghost trace everyone can race. You decide the session.
- **Your words, if you choose.** Any caption above can be replaced with yours.
- **Your channel linked** from the arrival card, if you want that.

## 6. What we'd ask

1. Yes or no on the room existing, and on its name.
2. Your edits to the five captions and the Gap.
3. Optional: one ride for "Lionel's line".
4. Optional: one link out (channel or site).
