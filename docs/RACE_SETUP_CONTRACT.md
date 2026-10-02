# RaceSetup Contract V1

Status: Setup Slot Compatibility V0  
Owner: Studio / Setup lane  
Consumer: integration/catalog/graph lane through this contract only

## Ownership

**OWNS**
- `web/src/studio/race-setup.js`
- Studio setup composition behavior
- Setup mobile tests/audits

**READS**
- canonical product ids
- `product.type` / `product.product_type`
- optional product `capabilities`

**DOES NOT TOUCH**
- `integrations/*`
- Blender / asset generation
- public catalog generation
- knowledge graph / MCP
- world-growth implementation

## Canonical JSON

```json
{
  "schema_version": 1,
  "event_id": "kona-2026",
  "slots": {
    "bike": {
      "product_id": "canyon-cfr-2027",
      "configuration": {
        "look": "<validated Studio look payload>",
        "scene": "kona"
      }
    },
    "wheel": {
      "source": "bike",
      "product_id": "canyon-cfr-2027"
    },
    "helmet": null,
    "shoe": null
  },
  "updated_at": 0
}
```

The contract contains stable ids and configuration state, never brand-specific behavior.

## Pure domain API

`race-setup.js` exports:

- `createRaceSetup(eventId)`
- `validateRaceSetup(value, products)`
- `normaliseRaceSetup(value, products)`
- `encodeRaceSetup(setup, products)`
- `decodeRaceSetup(encoded, products)`
- `setSetupSlot(setup, slot, product, configuration, products)`
- `clearSetupSlot(setup, slot, products)`
- `canEquip(product, slot)`
- `completedSlots(setup)`
- `createRaceSetupStore(storage)`

Persistence is behind `createRaceSetupStore()`; domain callers do not need direct localStorage access.

## Compatibility V0

Compatibility is product-type driven:

| setup slot | product type |
|---|---|
| `bike` | `bike` |
| `wheel` | `wheel` |
| `helmet` | `helmet` |
| `shoe` | `shoe` |

If a product provides a `capabilities` array, `equip` is also required. Brand is never considered.

V0 automatically inherits `wheel` from the selected bike. A standalone wheel product can replace that relationship once a validated wheel catalogue item exists.

## Safety

- Event is restricted to the supported `kona-2026` id in V1.
- Product ids must exist in the supplied catalogue.
- Unsupported scenes fall back to `kona`.
- Look payloads are length bounded and are independently validated by Studio before application.
- Unknown future equipment ids are dropped.
- Shared setup strings are length bounded and fail closed.
- No account, network persistence, analytics, tracking or location permission.

## Migration

The validator accepts the branch's earlier pre-contract V0 flat record and converts it to this canonical shape. Writes use the canonical shape only.

## Handoff to integration lane

The integration layer may map, without importing Studio UI:

```
RaceSetup.event_id          -> Event.id
RaceSetup.slots.*.product_id -> Product.id
```

Suggested graph relations:

```
race_setup configured_for -> event
race_setup contains       -> product
```

The integration layer should not read `localStorage` directly. A future adapter receives a validated RaceSetup value or its serialized representation.

## Merge gate

- unit tests green
- bike asset contract green
- generated pages current
- PWA release sealed
- 320 / 360 / 390 / 430 portrait audits green
- 844×390 landscape audit green
- long-label stress green
- setup persists across store reload
- existing profile state remains untouched
- PR release seal green
