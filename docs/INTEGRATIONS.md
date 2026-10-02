# Integration Architecture V0

Purpose: make Canyon Museum / Caldas Studio integration-ready from day one without coupling the product to any one transport, vendor, agent framework, or UI.

## Principle

The app is the product. MCP, REST, embeds, partner sites, agents, commerce systems, and future event apps are adapters over the same stable domain contracts.

No integration is allowed to bypass:
- stable product/event/setup IDs;
- provenance/evidence metadata;
- privacy defaults;
- capability checks;
- input validation;
- explicit authorization for writes.

## Domain objects

V0 exposes stable references for:
- `product` — bike, shoe, helmet, wheel, trisuit, artifact, artwork;
- `world` — Kona or future event/place worlds;
- `event` — e.g. `kona-2026`;
- `collection` — curated object sets;
- `race_setup` — a user's locally composed setup;
- `place` — sourced destination/race-week place;
- `experience` — room, wing, challenge, exhibition.

Objects are addressed by stable IDs, never by display names.

## Capability model

Integrations discover what an object can do instead of branching on brand names.

Initial capabilities:
- `inspect`
- `rotate`
- `explode`
- `customize`
- `collect`
- `equip`
- `compare`
- `share`
- `purchase_link`
- `visit`

A Cervélo bike and Canyon bike can therefore occupy the same `bike` slot. A Nike shoe occupies a `shoe` slot. Brand-specific code is not part of the contract.

## V0 integration surfaces

### Read-safe
These may be exposed first through MCP, REST, static JSON, or embeds:
- list products;
- get product by ID;
- list worlds/events;
- get world/event metadata;
- list places for an event;
- get collection;
- resolve a public/share-safe setup;
- list object capabilities.

### User-local
These stay on-device unless the user explicitly exports/shares:
- current RaceSetup;
- Passport/discovery state;
- saved/favourite configurations;
- local profile/preferences.

### Writes
No remote write is enabled by default.

Future remote mutations such as:
- save setup;
- publish collection;
- create merch order;
- partner catalog update;
- brand asset ingestion

must go through authenticated adapters with explicit authorization, schema validation, idempotency, audit logging, and least-privilege scopes.

## MCP mapping

MCP is an adapter, not the domain model.

Suggested V0 MCP resources:
- `caldas://products/{id}`
- `caldas://events/{id}`
- `caldas://worlds/{id}`
- `caldas://collections/{id}`
- `caldas://places/{id}`

Suggested V0 read tools:
- `list_products(type?, brand?, event?)`
- `get_product(id)`
- `list_event_places(event_id, category?)`
- `get_event(id)`
- `get_collection(id)`
- `resolve_share_state(token_or_url)`

Potential future write tools, disabled until authorization exists:
- `save_race_setup`
- `publish_collection`
- `create_partner_product`
- `create_merch_order`

MCP responses should return stable IDs, canonical URLs, evidence/provenance class, capabilities, and schema version.

## Events

The app should emit domain events internally even when no analytics backend exists. Consumers can subscribe later without changing UI code.

Examples:
- `product.inspected`
- `product.customized`
- `product.added_to_setup`
- `setup.saved`
- `setup.shared`
- `collection.item_discovered`
- `experience.completed`

For privacy, V0 events are local/in-memory. No event is transmitted unless an explicit future integration is enabled.

## Partner integration rule

A partner integration must consume the same public object model the app uses.

Bad:
`if (brand === "Nike") { special integration code }`

Good:
`if (product.capabilities.includes("equip") && product.type === "shoe") { ... }`

## Versioning

All public integration payloads carry `schema_version`.

Breaking changes require a new major schema version. Old share links and public IDs should remain resolvable through migrations/aliases.

## Security boundary

Static public content is read-only.

Any future connector capable of mutation must be isolated behind a server/gateway and must never expose:
- private keys;
- partner credentials;
- internal repository write tokens;
- unpublished assets;
- local user storage;
- arbitrary file/system access.

Prompt- or agent-originated input is untrusted input and receives the same validation as any external request.

## Day-1 success criterion

The product is integration-ready when a new adapter can answer:

1. What objects exist?
2. What are their stable IDs?
3. What can each object do?
4. What evidence supports it?
5. What event/world is it related to?
6. What public state is safe to share?

without importing UI code or inspecting brand-specific implementation details.
