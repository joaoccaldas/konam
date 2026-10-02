# KONA RC8 launch candidate — 1 October 2026

RC8 is the convergence release for one responsive KONA application: one brand authority, one navigation model, one first-run flow, and isolated immersive runtimes.

## Current product contract

### First visit
Landing → **Meet your Race Self** → choose presentation, avatar and trisuit → Home → one-time contextual tour.

The first visit intentionally avoids a long questionnaire. Race history, bike, shoes, goals and deeper identity remain available from User Studio / Garage / Plan after entry. Account creation is optional.

### Returning visit
Landing → **Continue your Kona** → Home.

The first-run tour does not repeat automatically, but can be replayed from User Studio.

### Navigation
- Home = contextual return surface
- Discover = places, stories, machines and entry to immersive worlds
- Garage = equipment
- Plan = race-week utility
- Me = User Studio / Race Self / Passport

Feed and Travel are exploration destinations inside User Studio and support direct `?view=feed` / `?view=travel` routes. They are not a sixth public tab.

## Brand / responsive convergence

- `brand/tokens.css` owns the named KONA palette, spacing, radii and typography families.
- `brand/typography.css` owns editorial / UI / data / handwritten roles.
- `web/styles/components.css` owns canonical controls and layout primitives.
- Feature CSS may own feature geometry, not a second design system.
- Mobile uses 20px canonical gutters (16px only on very narrow screens).
- Race cards, avatar registration and customization drawers have explicit width/overflow containment.
- User Studio mobile exploration destinations scroll horizontally so adding Feed / Travel / future destinations does not collapse the Race Self stage.
- Museum styles are lazy **and lifecycle-isolated**: hall styles are enabled only while the museum is the active surface, preventing path-dependent CSS leakage back into Home/User Studio/Feed.

## Race Self / customization

- Four avatar archetypes share one schema and renderer.
- Presentation choice: Male / Female / Prefer not to answer. This does not limit hair, tattoos, colors, clothing, trisuit or archetype.
- Trisuit is a first-class slot with multiple layouts, custom base/accent colors and PNG/JPEG/WebP overlay upload.
- Avatar choices remain local-first and can be edited later in User Studio.

## Discovery / return loop

Home includes an **Over the Horizon** projection: partially obscured future bikes, gear, trisuits, rooms and rewards. Locked content is teased rather than fully revealed. This is a projection over progression, not a second inventory.

## Feed + Travel

- Live bounded Supabase companion service.
- Customizable RSS/Atom and YouTube subscriptions.
- Personalized RSS URL.
- Last successful feed can be retained for offline/delayed sources.
- Travel uses the canonical Kona place registry plus clearly labeled external live flight/traffic providers.
- Neither Feed nor Travel loads the 3D world.
- PR #128 is superseded by RC8 and must not be merged separately.

## Admin

The authenticated admin role is read from Supabase app metadata.

Admin-only **Asset Portfolio** is available from User Studio and is generated from canonical registries for:
- products / bikes / shoes / gear
- room and floor placement
- brand rooms
- paintings and sculptures
- decorations and installations

GLB-backed assets can render lazy admin previews from the canonical model. Asset Portfolio does not create a second asset database.

## Verification required before merge

1. Museum checks green at the exact PR head.
2. Integration contract green.
3. Release security gate green.
4. App release seal green.
5. Visual Evidence V2 green.
6. Deterministic generated outputs synchronized.
7. P0 browser journey:
   - fresh Landing
   - avatar/trisuit registration
   - Home
   - one-time tour
   - User Studio persistence
   - museum → Feed/Home CSS isolation
   - auth request
   - install sheet
8. Visual review of phone and desktop captures against the approved KONA brand boards, especially:
   - Landing
   - avatar registration
   - Home / discovery horizon
   - User Studio
   - avatar editor
   - race cards
   - Feed
   - Travel
   - Discover
   - Garage
   - Plan
   - Passport
   - Asset Portfolio
9. Physical iPhone Add to Home Screen.
10. Physical Android installation / standalone launch.
11. Production email callback and public SMTP capacity confirmed.

## Known launch boundaries

- Flights and traffic open named live providers; KONA does not claim an embedded live flight/traffic feed.
- Athlete channel inclusion does not assert Kona race participation or physical presence.
- Physical installation and low-end thermal performance cannot be certified by desktop emulation.
- Additional multibrand content from older branches must be re-integrated through current canonical schemas, not merged wholesale.

## Go-live rule

READY = implementation + automated gates + visual evidence + physical-device proof + exact deployed SHA.

A green unit suite alone is not sufficient.
