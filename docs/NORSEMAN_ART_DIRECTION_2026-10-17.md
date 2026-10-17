# Norseman: a place before a prop collection

Baseline: `13d151c0155e2f0f49b07ad3ab4f133cbe09de01`. Candidate revision stays private/unwired.

The visitor should feel a journey from cold water to a mountain finish. Real elevation data is useful because it gives the imagined room a specific place. It does not make the room a race replica, the procedural trees realistic, or its lighting physically measured.

## Reuse decisions

|Decision|Existing authority|Reason|
|---|---|---|
|REUSE|`web/src/engine/terrain-portal.js`|One shared landscape pass, original renderer; keep the heightfields and attribution.|
|REUSE|`web/src/landing.js` route/teleport/card|Named views should actually move the visitor, including when a walking route meets the sculpture.|
|REUSE|`web/src/engine/decor.js`, existing bike/fan/treadmill files|No new GLB or copied asset library.|
|RESTYLE|Norseman course sculpture|Lower the interpreted vertical scale to 1.65 m and narrow its body so water and landscape remain visible. Source anchor elevations are unchanged.|
|ADAPT|NOR // 3 warm surface washes and Breitling's single focal installation principle|The existing Norseman washes already use the inexpensive technique; improve hierarchy rather than adding lights. No claim that Breitling's source geometry was copied.|
|COMPOSE|Existing hall and glazing|Fewer, slimmer mullions and lighter beams frame the landscape rather than subdividing it repeatedly.|

## What changed

Arrival framing lives in the existing decor shot registry, including a portrait shot. Entry reads that registry. Three concise actions use the host's existing fade/teleport authority; they no longer pretend a close-card action is a tour. Original map, cards, progression, saved state and source assets remain.

## What failed and how to check it

- A successful build did not immediately update the browser. The existing service worker offered a verified update; apply it and inspect visible revised copy before capturing.
- Walking to a named view could stall against an obstacle. Named viewpoints now request direct travel through the host route function; ordinary walking is unchanged.
- The old performance harness compared mesh count with a draw-call budget. That is invalid. `within_budget` now remains null; the geometry-only check is explicitly partial. The former 16.3 desktop FPS and phone 60 FPS are old headless observations, not evidence for this revision or physical phones.
- Real terrain with coarse trees can still look illustrative. Do not promote a beautiful-looking horizon as a realistic landscape without close inspection.
- A requested camera, readable PNG or passing validator does not establish a good arrival view. Inspect actual saved pixels after transition settles.

## Acceptance still required

Desktop, portrait and landscape arrival; all three view actions; return via the map; terrain and gear detail; reduced motion; complete-frame p50/p95 timing including terrain/mirror/shadows; physical phone; owner visual acceptance. Candidate status remains until these gates are supported.

## Reusable review loop

1. Pin the source and baseline images.
2. State one place/story and one focal view.
3. Inspect existing room implementations and asset identities.
4. Change composition first; keep data, assets and architecture authorities.
5. Build and seal with maintained tools; verify the browser loaded that revision.
6. Check actual interaction and saved images on all three viewport shapes.
7. Report geometry, full-frame cost and visual judgement separately.
8. Preserve rejected captures and explain the next repair.

Portrait now frames the bike toward the fjord rather than trying to compress the whole hall into a narrow view. Arrival getters re-evaluate orientation when entering; they do not freeze the first viewport shape. The portal renders at 0.85 buffer scale on the lite tier instead of 0.5 to reduce obvious pixelation. That increases fill cost and needs fresh full-frame timing; no FPS improvement is asserted.
