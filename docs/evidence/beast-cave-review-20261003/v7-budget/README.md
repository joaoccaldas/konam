# Beast Cave · budget pass (2026-10-12)

Measured with `node tools/room-evidence.mjs --review beast-cave --package world/konam/rooms/beast-cave.room.json --metrics`
(headless Chromium, software WebGL; counts, not frame times).

| | Room meshes (budget) | Room triangles (budget) |
|---|---|---|
| Desktop before | 228 (190) ❌ | 631,730 (450k) ❌ |
| Desktop after | 136 ✅ | 213,998 ✅ |
| Phone before | 227 (110) ❌ | 191,072 (220k) ✅ |
| Phone after | 108 ✅ | 168,748 ✅ |

0 page errors before and after.

What changed:
- The bike: one material per name, oriented, then merged (~70 parts → one draw per material); desktop now receives the
  derived 134k hero (`speedmax_web-hero.glb`) instead of the full CFR, phones keep the 77k lite.
- The cave: `mergeStatic(..., { byValue })` folds props that each built an identical material; on phones near-identical
  colours/finishes fold too. Floor sweat drops merge as decals. Fans merge their static parts (blades still spin);
  loaded GLBs (fans, treadmill, trainer) merge once placed, keeping their cards.
- Phones only, as the package's `lod_policy: LOD1/micro-props-optional` allows: decorative glow sprites, light pools
  and washes are hidden; the orange coves, the light shaft, the fan blur and anything you can tap stay.

Frames: `phone-hero.jpg`, `phone-wide.jpg` (390×844).
