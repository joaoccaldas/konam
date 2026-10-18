# TRANSITION // THE PIER (room-010 Transition, candidate)

`?reviewRoom=transition-pier` · module `web/src/transition-pier.js` · package `world/konam/rooms/transition-pier.room.json`.

**Why:** Transition (room-010) is a public foundation room with nothing built behind it. It is also the most practical
room: race craft, the part of race day that people actually rehearse.

**The room:** race morning on the Kailua Pier.
- Swimmers climb pier steps out of Kailua Bay at the east end; a board over the steps gives the 2026 swim starts
  (pro men 6:20, pro women 6:30 am).
- A blue carpet runs west between two banks of racked bikes (`SWIM IN` · `T1` · `BIKE OUT`) to a yellow mount line by
  the door.
- Gear bags hang along both walls: blue for the bike, red for the run (KONA.m colours, not a race rule).
- One rack slot stays empty: `YOUR SLOT`.

**Truth:** place facts come from `pitch/transition/transition-facts-v1.json`, sourced to the Big Island Guide's 2026
race page: the swim starts in Kailua Bay; the bike and the run both leave from the Kailua Pier transition. Race-craft
notes (T1/T2, mount line, bags, practice) are marked general, not the rules of any race.

**Rights:**
- The 19 racked bikes are anonymous KONA.m atlas studies (`studio-*`, `type-*`, about 8k triangles each), not anyone's
  equipment.
- No photographs, no likeness, no marks.

**Reuse:**
- `loadDecor` places the atlas bikes from `world/konam/rooms/transition-pier.decor.json`. New flag `lite: "full"` keeps
  the same model on phones.
- Shared props `kona-palm` and `race-marker`; `mergeStatic` with decals; `localEnvCapture`.
- Only the facts file is new.

**Measured (room-package budgets, 0 page errors):**
- With all 19 bikes loaded the room is about 168k triangles. Phone: 70 meshes · 168k (110 / 220k).
- Desktop was captured with part of the rack still loading (54 meshes · 95k); a full load stays well inside 190 / 450k.
  The evidence tool does not yet wait for decor-loaded bikes.

**Fixed while building:** the south wall sat inside the Breitling room's wall (z −18 to −17.7) and fought it for depth,
leaving a stair-stepped grey patch on desktop. It now stands 10 cm further in.

**Frames:** `hero`, `racks`, `swim-in`, `bags`, `slot` (1600×900); `phone-hero`, `phone-slot` (390×844).
