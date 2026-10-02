# Production go-live gate

> Legacy filename retained for links. KONA's verified production path is GitHub Pages, not Vercel.

## Verified web production baseline

The first guarded KONA production release was deployed from main commit `91e3b6a99427726e638d28623d8f5b7f9cd183da`.

- Production URL: https://joaoccaldas.github.io/canyonmuseum/
- Guarded deployment run: https://github.com/joaoccaldas/canyonmuseum/actions/runs/36910359282
- Pages artifact digest: `sha256:bd613b3c860b4760498bd41dff62dc5102e9381e2a4380e68ef6960391275def`
- The deployment gate required successful certification of the exact source SHA before publication.
- The live release receipt and sealed-file verification were checked against that deployed SHA.

Main has since advanced to `8b229b4980ef7c7848b5f6a69df2152eab5539a6` via #149, which repairs Android/native packaging. Do not infer that the live web deployment moved merely because main moved. A later Pages deployment needs its own exact-SHA receipt.

## Verified source contracts

- User Studio has one persistent escape control and routes through the canonical `enterApp('me')` path.
- Standalone Bike Studio returns through `index.html?view=me`.
- Static delivery keeps `index.html`, `manifest.webmanifest`, and `sw.js` revalidating.
- No catch-all rewrite shadows public static assets.
- Generated app/pages are rebuilt in CI and committed deterministic outputs must remain unchanged.
- WYLD remains hidden by the disabled special-event policy until separately authorised.

## Release rule

Do not call a web release production-ready unless all required checks are green on the same final source SHA:

- Museum / P0 / unit / asset / brand checks
- release security gate
- integration contract
- app release seal
- deterministic generated-output verification
- Visual Evidence V2 across the required viewport matrix
- UI interaction evidence across phone, landscape and desktop

After CI, verify the deployed production receipt and sealed file hashes against that exact SHA.

## Native Android boundary

Android packaging and emulator smoke are repaired by #149. Stable APK publication remains blocked until the repository has a persistent release signing identity configured through GitHub Actions secrets. See issue #150.

A debug-signed smoke APK is test evidence only. It must not be presented as the public Android release.

Physical Android/iPhone install, keyboard, safe-area, reopen/persistence and real-device 3D performance remain device gates and must not be inferred from browser/emulator evidence.

## Product truth boundary

Vision documents, screenshots, generated mockups, schemas and roadmap prose are not runtime proof. Claims become current-product claims only through:

`source → deterministic build → automated evidence → exact-SHA deployment receipt → observed device acceptance when applicable`.

Canonical runtime schemas outrank older concept names. For example, avatar character types are currently defined in `web/src/engine/avatar.js` as Minecraft, Badass, Aero and Islander.
