# Room decoration authority

`museum/world/decorations.json` indexes reusable prop and installation IDs. Original room names, presentation values and explicit prop placements live in `museum/world/rooms.json`. Brand and wing rooms keep placements in their existing descriptors. Bikes, paintings and sculptures keep their existing product/art catalogues; do not duplicate their records in the decoration index.

- `engine/decoration-props.js` builds small reusable props. A placement is `{prop, x, z, height?, seed?, y?, rotation?}` in world metres. A host passes its group, collision registry and optional sway registry. Explicit seeds keep a room stable between visits.
- `engine/room-installations.js` builds the existing Bio, Horror, Alien and Zombie installations in supplied bounds. Hosts own architecture, navigation, framing and exhibit selection. Installation geometry stays grouped so visibility can remove its rendering cost. Their animation update is currently called by galleries; migration of that update to the installation module is the next small cleanup.
- `engine/roomscene.js` builds brand rooms and accepts the same prop placements. `engine/wing.js` accepts them in wing descriptors too.
- `engine/skins.js` remains the single bike paint implementation. `engine/framing.js` owns bound-based studio camera fitting. A new prop or room must not create another paint or camera authority.

Add a prop by defining its indexed ID/defaults, implementing one factory, and placing that ID in a room descriptor. Check walkable space, first view, reduced motion, mobile visibility and draw calls. Decorative geometry must not overlap doors or existing exhibits. No unbounded per-frame allocations, duplicate point lights or new remote asset fetches by default.

Landing artwork is reproducible with `node tools/render_entry_art.mjs` (Chrome and the web dependencies required). It reads `museum/entry-art.json`, the product catalogue and WYLD registry. Generated WebP files are shipped so mobile visitors do not pay for an initial WebGL render.
