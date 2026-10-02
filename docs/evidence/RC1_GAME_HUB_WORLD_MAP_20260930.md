# RC1 Game Hub + World Map — 2026-09-30

This branch consolidates the production-readiness hotfixes after the first public physical-phone check.

Scope:
- game-style personal Race Self hub with large launcher tiles
- authored avatar proportions and closer 3D framing
- generic shell chrome hidden while the Home hub is active
- 48px touch-target invariant for Home/Garage
- complete Pages deployment allowlist for consumer shell dependencies
- verified service-worker shell updates activate automatically outside the 3D world
- every room opens at a full-room overview pose
- scalable map model extracted from the renderer
- future levels represented as explicit locked map data
- mobile map uses a full-screen map-first presentation

This evidence-only commit triggers deterministic generation and visual proof.

Synchronized generated head: `997115d7af2b131e3879bfd49c85876c3973050a`.
This evidence-only follow-up triggers the full pull-request release gates against the synchronized tree.
