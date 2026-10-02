# Data Model

## Canonical graph

```
Product
  ↓
UserEquipment
  ↓
RaceIdentity
```

Related domains:
- Athlete
- Event
- RaceHistory
- Place
- RoomConfig
- Challenge
- ProgressionEvent
- Collectible
- AffiliateProgram
- AffiliateLink

## Rules

- Stable IDs are immutable.
- Display names may change; IDs do not.
- Domain records reference IDs, not duplicated free text where a canonical entity exists.
- Product/category truth must not live in parallel registries.
- User-specific ownership/dream/try state never belongs on the canonical Product.
- Public race results are candidate evidence until confirmed by the user.
- Aggregate vendor insight never contains row-level user identifiers.
- External providers are adapters, not canonical truth.

## Persistence

Current local-first storage is a beta compatibility layer.

Long-term normalized persistence should separate:
- profiles
- user_equipment
- race_identities
- race_history
- progression_profiles
- credit_ledger
- challenge_progress
- shares
- external_accounts

## Legacy storage namespace

Existing `speedmax.*` keys are compatibility aliases.

New code should target the `kona.*` namespace through one migration adapter. Do not add new direct `speedmax.*` storage keys.
