# SATURDAY // ALIʻI · Kona 2026 (event room, candidate)

`?reviewRoom=kona-2026-saturday` · module `web/src/kona-2026-saturday.js` · package `world/konam/rooms/kona-2026-saturday.room.json`
(parent: room-011 Race Week).

**Why this room, now:** the IRONMAN World Championship was raced in Kailua-Kona on 10 October 2026, and both races were
decided late. Race Week (room-011) had no built space. This room is the reason to come back the week after the race.

**The room:** Aliʻi Drive after dark.
- A finish carpet runs from the door to a truss gantry. The race clock over the line alternates the two winning times.
- The last mile is stencilled on the carpet: `1 MI · PALANI ROAD`, `0.7 MI · WHERE THE LEAD CHANGED`, `FINISH`.
- The broken tape lies past the line.
- North wall: the women's race (Taylor Knibb, 8:36:29) and the women's top 5. South wall: the men's race (Vincent Luis,
  7:47:27) and the men's top 5.
- Spectator chairs and street lamps line both kerbs. String lights hang overhead. Kailua Bay, the pier lights and
  Hualālai sit at the end of the road (a procedural shader, not a photograph).

**Truth:**
- All results come from `pitch/kona-2026/kona-2026-results-v1.json`, sourced to NBC Sports.
- Every time is labelled **unofficial**, in the room and in every card, until the official results are published.
  Replace the facts file then.
- Splits are not shown: none were available from a source that could be read.
- Two other outlets refused automated reads, so the facts rest on NBC's two articles.

**Rights:**
- No photographs, no likeness, no event or athlete marks.
- No bike is shown, and the room makes no claim about what the winners rode.
- Taglines are KONA.m copy.

**Reuse:**
- Shared props from `museum/world/decorations.json`: `kona-palm`, `promenade-chair` (spectators, one draw),
  `promenade-lamp` (street lamps, three draws, no lights).
- Engine and room kit: `mergeStatic` with decals, `localEnvCapture`, roomkit motes.
- Only the facts file is new; every visual element is procedural or reused.

**Measured (room-package budgets, 0 page errors):** desktop 35 room meshes · 66k triangles (190 / 450k); phone 35 ·
30k (110 / 220k). Frames: `hero`, `clock`, `women`, `men`, `last-mile`, `kerb`, `bay` (1600×900) and `phone-hero`,
`phone-clock`, `phone-women` (390×844). On a portrait phone the 4.5 m winner panels are wider than the view; tapping
one opens its card with the full text.
