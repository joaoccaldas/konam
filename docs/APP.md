# The app layer — profile, quality, sharing, loading, accounts

The museum runs as a website and as an installed app (PWA; Android build in `app/native`). This file
covers what makes it an app rather than a page.

## Profile and settings — `web/src/engine/profile.js`, `web/src/ui/settings.js`

- **On-device profile** (default): name, avatar colour, display quality, sound, motion, favourites.
  One record in `localStorage` (`speedmax.profile.v1`). No server, no tracking.
- Opened from the profile chip in the header (“Sign in” until you have a name) or from the landing
  screen (“Create a profile · choose your quality” / “Welcome back, …”).
- **Your data:** *Export* downloads everything the app stores about you as JSON; *Delete everything*
  removes the profile, passport, finds and hints from the device.
- `normalise()` validates every stored field (unknown fields dropped, bad values reset), so a damaged
  or hand-edited record can never break the app.

## Display quality

| Preset | Geometry | Pixel ratio (still / moving) | Shadows |
|---|---|---|---|
| Auto | chosen for the device (phones/touch → light) | device rule: ≤ 2 / 1.65 (≤ 1.45 / 1.12 light) | on unless light |
| High | full | ≤ 2 / 1.65 | on |
| Balanced | device | ≤ 1.5 / 1.2 | on |
| Low | light | 1 / 0.85 | off |

Pixel ratio and shadows change immediately; geometry detail applies after a reload (the sheet offers
“Reload now”). `renderSettings()` is pure and tested (`web/test/app.test.mjs`, `flow.test.mjs`).

## Sharing — `web/src/engine/share.js`

The **Share** button (header) and **↗** on every card capture the current view straight after a render,
add a caption strip (exhibit · room · Speedmax Museum), and hand the JPEG to the system share sheet
(Web Share Level 2 → Messages, WhatsApp, Mail, Instagram…). If the device cannot share files it
shares the link; otherwise it saves the image. Links carry `?room=<area>`, which walks the recipient
to the same room.

## Progressive loading

1. The landing screen appears immediately; the hall's bikes load first (`Unpacking the collection · n / 6`).
2. *Enter* is available as soon as the first bike is in.
3. Every other room loads in the background, one after another, with a quiet status chip
   (“Opening the Sanctuary · 3 of 6” … “Every room is open”).
4. Cards and walls never wait on models; bikes fade in when ready.

## My Kona Setup V0 — `web/src/studio/race-setup.js`

The Studio can compose the current bike into a small local-first race setup without creating another configurator.

- Storage key: `speedmax.raceSetup.v1`, separate from profile/passport state.
- Event: `kona-2026`.
- **Bike** stores only a catalogue `productId`, the existing validated Studio look payload and scene id.
- **Wheels** are V0's inherited current-bike wheels.
- **Helmet** and **Shoes** are structural empty slots. They accept no external ids yet, so incoming assets cannot silently bypass the future equipment contract.
- The Setup tab is mobile-first and keeps Save/Share reachable in the bottom sheet.
- Sharing uses the existing screenshot/share engine and a validated `?setup=<base64url>` state.
- Shared state rejects unknown product ids, unsupported scenes, oversized/broken payloads and future-slot injection.
- No account, network storage, analytics or location permission is introduced.

The important architectural rule: **RaceSetup references stable product ids; it contains no Canyon/Nike/Trek-specific code.**
New equipment should eventually integrate as catalogue asset + compatibility/capability metadata, not as a new application.

Mobile acceptance is automated in `web/studio-phone-audit.mjs` at 320, 360, 390 and 430 px.

## Accounts (optional, planned)

Decision (29 Sep 2026): **both** — the on-device profile stays the default; an optional
“Sync across devices” sign-in will be added with **Neon Auth** + a Neon Postgres table holding the
same normalised profile record. `createProfile(store)` already takes a store with `load/save/clear`,
so sync is a second store, not a rewrite. The settings sheet shows the section today and switches
to a working *Sign in* when `sync.available` is true.

Before it ships: create the Neon project (needs the owner's go-ahead), add a privacy page, and update
`llms.txt` / the landing copy (“No accounts required” stays true because sign-in is optional).

## Deep links and app shortcuts

- `?room=<map area id>` walks to an area (`wing-kona-light`, `room-bio`, `atlas-kona-light-bay`, …).
- `?map=1` opens the map.
- `manifest.webmanifest` shortcuts: Map, Against the Clock, Kona by Year, Collection.
