# Kona.m World Foundation V1

Status: pre-migration product/data foundation only. No production room wiring, no UI replacement, no release behavior change.

## Why this exists

Before moving Canyon Museum into the future `konam` repository, define the world from the inventory we already possess. The migration should carry a coherent product model, not merely copy a growing set of pages and assets.

The current repository already contains a large reusable inventory:
- 47 canonical products in `museum/catalog/products.json`;
- 104 admin-indexed assets and 35 indexed room/area entries in `app/admin-assets.json`;
- bikes, decorations, installations, paintings, rooms, sculptures and shoes on current main;
- a separate Next100 candidate lane with 100 generated, unwired studies: 20 bikes, 20 shoes, 12 helmets, 12 trisuits, 12 medals, 12 artifacts and 12 gear objects.

The Next100 lane is inventory, not automatic public canon. Promotion still requires provenance, representation honesty and visual QA.

## Product decisions frozen in this branch

### 28-room world
- 14 founding rooms: visible/open at launch.
- 14 progressive rooms: canonically defined, but manifested by progression, time or entitlement.
- Stable room IDs are separate from display names and from legacy room IDs.

### Founding 141
- exactly 141 canonical collectibles;
- 14 founding rooms × 10 collectibles = 140;
- one roomless final collectible: **The Point Six**;
- the Founding 141 is a closed collection and never expands;
- no Founding 141 item is purchasable;
- The Point Six is neither purchasable nor tradable.

### Acquisition model
Founding items can be acquired through:
- exploration;
- hidden finds;
- questions/riddles;
- quests;
- challenges;
- onboarding participation;
- timed/event state;
- source/provenance interaction;
- story completion.

Optional personal disclosure must never be required for a reward. Choosing skip/prefer-not-to-answer can still count as completing an onboarding step.

### Progression
Progressive rooms do not use a simple level ladder. Conditions can combine:
- number of finds;
- room collection completion;
- quest completion;
- mastery;
- event windows;
- explicit entitlements.

Commercial status must never make a room easier, rarer or more important to utility/safety.

## Canonical planning files

- `world/konam/inventory-baseline-v1.json`
- `world/konam/rooms-v1.json`
- `collections/kona-141-v1.json`
- `quests/founding-v1.json`
- `world/konam/progression-v1.json`
- `tools/validate_konam_world.mjs`
- `web/test/konam-world-contract.test.mjs`

## Founding rooms

1. The Queen K
2. The Bay
3. The Pier
4. Aliʻi
5. Champions
6. Against the Clock
7. Canyon Museum
8. The Aero Lab
9. The Kit Room
10. Transition
11. Race Week
12. Island Stories
13. The Archive
14. Lost & Found

## Progressive rooms

15. The Wind Room
16. Heat
17. Fuel
18. Swim Lab
19. Run Lab
20. Age Group
21. Women of Kona
22. The Volunteers
23. Before Saturday
24. The Makers
25. Prototype Vault
26. Athlete Rooms
27. Makers' Row
28. Elsewhere

Existing Sanctuary, WYLD, Horror, Alien, Zombie, Bio and destination work is not deleted by this taxonomy. It becomes reusable special-exhibition, seasonal, secret or portal inventory.

## Validation contract

The validator asserts:
- exactly 28 rooms;
- exactly 14 founding and 14 progressive rooms;
- exactly 141 Founding collectibles;
- exactly 10 Founding collectibles in every founding room;
- exactly one roomless collectible, The Point Six;
- all IDs are unique;
- every founding room has a founding quest;
- every quest reward points to a valid item;
- 14 unique anchor items exist;
- The Point Six cannot depend on itself;
- every progressive room has an unlock rule;
- no Founding 141 item is purchasable.

## What this branch deliberately does not do

- no rename from KONA to Kona.m in runtime;
- no repository migration;
- no room geometry remapping;
- no new public feature;
- no service-worker changes;
- no generated app bundle changes;
- no Supabase schema migration;
- no assumption that a candidate branded asset is safe for public/commercial use.

## Next mapping pass

Before migration, join every current and candidate asset against the Founding 141 and classify each item:

1. READY EXISTING
2. EXISTING / NEEDS QA
3. EXISTING / NEEDS RESTYLE
4. 2D STORY ONLY
5. NEXT100 CANDIDATE
6. NO CANDIDATE FOUND (human review decides whether a new asset is actually needed)

This should produce the real build list for launch. The objective is not 141 new models. The objective is 141 coherent collectible records with the best truthful representation we already possess.

## Migration use

These files are intentionally product-neutral enough to copy directly into `joaoccaldas/konam` after the repository migration. Stable IDs should survive the move even if room names, art direction and assets continue to improve.
