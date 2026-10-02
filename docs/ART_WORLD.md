# Immersive Art World

The museum can now carry a second layer of 3D storytelling without replacing the bike-first exhibition.

## Design rule

The hall stays sparse. Each new installation has two readings:

1. **At distance:** one strong sculptural silhouette.
2. **Up close:** the sculpture separates into fins, light seams, depth and secondary details.

This creates discoverability through movement rather than through dense decoration or image-heavy walls.

## Place studies

Four lightweight procedural installations sit along the main hall:

- **St. George** — red-rock contour fins with a warm inner seam.
- **Las Vegas** — dark reflective fins that break into neon planes.
- **Nice** — pale sea-glass layers that open into a coastal ribbon.
- **Kona** — obsidian fins that expose a volcanic core.

The installations are real Three.js geometry. No private data or personal-story metadata is required to drive them.

## Hidden collection

A dark eclipse-like wall sculpture acts as an unlabelled portal. Selecting it opens a separate walkable room.

The room intentionally uses large negative space and repeated bays rather than dense prop dressing. Its collection contains:

- eight full-detail themed bikes on desktop and four on mobile;
- a larger back-wall archive of simplified bike silhouettes using the same source geometry with most small parts hidden;
- lacquered materials with lower roughness, clearcoat and stronger environment reflections so the bikes read as the brightest objects in the room.

Current themes are generic visual studies: witchcraft, stitched-doll, pagan runes, moon ritual, haunted carnival, ritual forest, slasher and Viking night.

The room is hidden when the visitor is elsewhere, and the main hall's bikes are hidden while the visitor is inside. This keeps the additional draw cost bounded.

## Mobile behavior

The existing touch joystick and look controls remain the navigation model.

On coarse-pointer/mobile devices the hidden room renders four full-detail bikes and five archive silhouettes; desktop renders eight full-detail bikes and twelve archive silhouettes. The geometry still reads as a large collection, but the renderer avoids drawing an excessive number of complete drivetrains.

## Runtime wiring

`web/src/artworld.js` is loaded after the main museum bundle. It consumes only the public museum runtime exported by `web/src/landing.js`:

- scene
- camera
- visitor state
- bike pieces
- pickable objects
- collision objects

The landing runtime provides four integration hooks:

- `walkable(x, z)` extension
- `regionOf(x, z)` extension
- custom portal picking
- per-frame `update(dt, t, ...)`

This keeps the experimental art layer modular and removable without changing bike reconstruction or studio code.

## Rebuild

After editing the source runtime:

```bash
cd web
npm ci
cd ..
node web/build_landing.mjs
node --test web/test/*.test.mjs
```

The build writes the published `index.html`.
