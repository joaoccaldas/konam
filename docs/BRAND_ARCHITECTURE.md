# KONA Brand & Responsive UI Authority

The approved KONA brand boards are the visual authority for every consumer-facing surface.

## One responsive product

Mobile and desktop are two layouts of one component system. Do not create separate mobile/web design systems.

## Authority chain

1. `brand/tokens.css` — palette, font families, spacing, radii, touch sizes.
2. `brand/themes.css` — light/dark/random/seasonal semantic mappings.
3. `brand/typography.css` — editorial, UI, data and handwritten roles.
4. `brand/artifacts.css` — hero/photo/label/spec/bib/map/sticker/note grammar.
5. `web/styles/components.css` — controls, fields, sheets and responsive layout primitives.
6. Feature CSS — layout and geometry unique to that feature only.

Feature CSS must not invent a second palette, font system, button system or navigation grammar.

## Product navigation

- Home = contextual Home.
- Discover = people, places, machines, stories and entry into immersive worlds.
- Garage = owned / dream / try equipment.
- Plan = race-week preparation and practical context.
- Me = Race Self, Passport, account and personal progression.
- Admin-only tools live inside Me/User Studio and never become a sixth public tab.

## Brand character

Structure is premium and precise. Personality is human.

- Editorial serif: big ideas and emotional headlines.
- Modern sans: navigation and functional UI.
- Mono: technical/race/spec data.
- Handwritten accent: small human notes, rewards and surprises.
- Sand/basalt foundations with restrained sunrise/ocean/hibiscus/lilac/lime accents.
- Image-led composition and generous negative space.
- Playful language only where clarity and trust are not reduced.

## Responsive rule

Phone is the base layout. Enhance at wider containers. `phone-fit` is compatibility fallback only, never the primary layout strategy.

## Admin Asset Portfolio

The Asset Portfolio is a read-only projection over canonical registries:

- `museum/catalog/products.json`
- `museum/world/rooms.json`
- `museum/world/brand_rooms.json`
- `museum/world/decorations.json`

It must never create a second asset database.
