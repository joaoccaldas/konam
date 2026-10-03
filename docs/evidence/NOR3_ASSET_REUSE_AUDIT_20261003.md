# NOR // 3 asset reuse audit — 2026-10-03

## Rule

Inventory first. Decision order:

REUSE → ADAPT → RESTYLE → COMPOSE → CREATE

No asset is generated merely because it appears in a room concept.

## Repository-wide inventory result

Current main contains 36 committed GLBs. No committed GLB matches were found for:
- direct-drive trainer
- run deck / treadmill
- protocol table
- analyser
- vial rack
- environment bay
- cooling fan
- recovery bench / roller
- fjord relief

The generated Admin Asset Portfolio also does not currently expose a reusable equivalent for those room objects.

Historical Next100 reconciliation mentions a generic transition-bottle concept, but the referenced `museum/assets/next100-v1.json` source and corresponding committed runtime GLB are not present on current main. It is therefore not a usable runtime asset today.

## Decisions

| NOR element | Decision | Reason |
| --- | --- | --- |
| Canonical athlete bike slots | REUSE | Must use canonical bike/product pipeline; never generate athlete bikes inside the room |
| Room renderer/camera/player | REUSE | Global Kona.m authority |
| Machine inspection | REUSE | Global inspection kernel |
| Moisture/motes | REUSE | Existing roomkit primitive |
| Contact shadows | ADAPT | Reusable render primitive; keep procedural |
| Environmental typography | ADAPT | Reusable canvas/type primitive; keep procedural |
| Wet-floor fields | COMPOSE | Material/geometry treatment, not a standalone asset |
| Overhead ribs/service spine | COMPOSE | Room architecture from simple host geometry |
| Direct-drive trainer | CREATE candidate | No existing committed equivalent; generic original study only |
| Run deck | CREATE candidate | No existing committed equivalent |
| Protocol table | CREATE candidate | No existing committed equivalent |
| Protocol analyser | CREATE candidate | No existing committed equivalent |
| Vial rack | CREATE candidate | No existing committed equivalent; instance repeated vials |
| Environment bay | CREATE candidate | No existing committed equivalent |
| Cooling fan | CREATE candidate | No existing committed equivalent; generic room equipment |
| Podium vault | CREATE candidate | Original abstract art, not a replica |
| Fjord relief | CREATE candidate | Original geometry, no copied map/photography |
| Recovery bench | COMPOSE first | Simple geometry does not justify a separate GLB unless later reused |
| Bottles/rollers/towels | REUSE/COMPOSE first | Keep procedural until a canonical shared gear-prop asset exists |
| Kona line/mark | REUSE/COMPOSE | Brand/environment primitive, never separate product data |

## Duplication finding

The former `web/src/review/norwegian-installation.snapshot.js` duplicated the NOR geometry authority.

It is removed in this branch. Both production installation and review now consume:

`web/src/engine/room-installations.js → buildInstallation('norwegian', ...)`

This is the most important deduplication in the NOR pipeline.

## Generation gate

Do not run the Blender generator just to satisfy the manifest.

Generate a GLB only when all are true:
1. no canonical reusable asset exists;
2. the element benefits materially from authored mesh detail;
3. it is likely reusable or visually important enough to justify asset lifecycle cost;
4. provenance/rights classification is explicit;
5. the procedural version is insufficient in visual evidence.

Based on the current room, the first GLB candidates worth producing are:
- direct-drive trainer
- run deck
- protocol table
- analyser
- environment bay
- podium vault
- fjord relief

Fans and vial rack are secondary. Recovery props should remain procedural/shared until reuse demand appears.

## Public truth boundary

All equipment remains generic unless an athlete-specific source is verified. No athlete likeness, exact bike assignment, trainer brand, sponsor association, or partnership is implied.
