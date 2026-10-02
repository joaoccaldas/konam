# Product and Engineering Decisions

## D-001 Person-first entry

The landing experience is KONA / Race the version of yourself.
The 3D museum loads only after explicit Explore intent.

## D-002 Local-first

Anonymous/local use remains useful. Registration preserves value; it is not a prerequisite to explore.

## D-003 One graph

Products, athletes, events, places, challenges and rooms must reference canonical IDs. Avoid bespoke per-brand or per-athlete runtime branching.

## D-004 Progression separation

Keep separate:
- access
- XP
- level
- credits
- badges
- collections
- unlocks
- mastery

UI emits events. Reward rules decide outcomes.

## D-005 Confirmation before race-history truth

Public result matches remain candidates until the user explicitly confirms them.

## D-006 Commercial integrity

Compatibility, popularity, sponsorship and affiliate economics are distinct concepts and must remain visibly separate.

## D-007 No second Kona product

Other Kona/game repositories are module donors. Reusable challenges/assets may be extracted, but KONA remains the canonical consumer platform.

## D-008 Evidence over claims

Do not call a capability READY because code exists. Require test/runtime/release evidence.
