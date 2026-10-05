# LAIDLOW // NICE · Baie des Anges

An independent KONA.m athlete room for Sam Laidlow (`?reviewRoom=laidlow-nice`, candidate, not public).

**The idea:** the Promenade des Anglais at golden hour, brought indoors. Limestone underfoot, Nice's blue chairs
turned to a live Baie des Anges, cast-iron lamps along the railing, voile breathing in the sea breeze, and in the middle
of it all the Canyon Speedmax CFR on a drum of stone ringed in blue, white and red.

**What the walls say (every number sourced in `pitch/sam-laidlow/laidlow-facts-v1.json`):**
- North: **8:06:22** — IRONMAN World Championship, Nice, 10 September 2023. Swim 47:50 · bike 4:31:28 · run 2:41:46.
  First from France, youngest man ever.
- South: Kona 2022 — **4:04:36**, the bike course record (2nd, 7:42:00) · Roth 2026 — **7:21:04**, described by
  Canyon as a long-distance world record · *Le Promeneur*, a fictional front page: "Le jeune homme et la mer. Nice. Very nice."
- The coach's corner: a director's chair and a race-week whiteboard signed "— Dad" (coached by Richard Laidlow, the athlete’s father).

**Reuse, not new assets:** the museum's canonical Speedmax CFR (desktop: derived 134k near level, 77k beyond 5 m;
phones: 77k), three museum paintings and two sculptures (`framedPainting()`, the wings' own hanger), the canonical
`kona-palm`, roomkit dust and light shaft, `env-capture`, `mergeStatic`. The bay, sky, sails, gulls and the Negresco
dome are a shader — no photograph.

**Measured (room-package budgets, bike loaded, 0 page errors):** desktop 113 meshes · 431k triangles (190 / 450k);
phone 90 meshes · 187k triangles (110 / 220k). `metrics.json`.

**Truth and rights:** results only; taglines are KONA.m copy; no likeness, no athlete marks; the bike is the line Laidlow
races, not the actual race bike. The facts file records, for presenters, the ITA investigation Laidlow announced in October
2023 (no public outcome or suspension as of verification); the room never displays it.

**Frames:** `hero`, `low`, `monument`, `records`, `bay`, `promenade` at 1600×900; `phone-portrait-hero` and
`phone-portrait-promenade` at 390×844 (the lite 77k bike). Reproduce:
`node tools/room-evidence.mjs --review laidlow-nice --out <dir>` (add `--size 390x844` for phone, `--metrics` for budgets).
