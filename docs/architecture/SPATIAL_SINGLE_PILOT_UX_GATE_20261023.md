# Spatial pilot: UX decision and release-quality gate
Observed 2026-10-23. Source-reviewed, NOT a visual/device audit or completed commercial pilot.

## Decision
Do not create a second consumer shell, designer, or commercial homepage. Kona.m already owns its shell at `web/src/ui/kona-shell.js`; it has Now, Discover, Garage, Plan, Me and an existing User Studio action. Bellagio already owns the worlds portal and `worlds/registry.json`. Build a SINGLE bounded commerce-style spatial reuse experiment, based on a rights-approved existing product and the current platform. No UI implementation until baseline browser/device evidence.

## Proposed single pilot flow
1. Visitor enters an existing product-focused scene from an approved link.
2. Progress and failure state show clearly with retry and a 2D fallback.
3. Visible contextual controls explain rotate/move/inspect and keyboard/touch affordances.
4. Visitor selects and inspects a licensed product component or variant.
5. User can access truthful specifications and provenance; no fake functionality or product claims.
6. Complete one measurable optional CTA (inquiry, export, share) with explicit consent. Track only necessary privacy-safe events.
7. Exit/return preserves navigation and focus.

## Existing UI authority / changes to consider
| UI | Evidence | Decision | Required verification |
| --- | --- | --- | --- |
| Kona.m consumer shell | `web/src/ui/kona-shell.js`, existing Now/Discover/Garage/Plan/Me, User Studio | REUSE; no second navigation shell | real mobile portrait/landscape, new-user journey, keyboard |
| Museum renderer | `web/src/landing.js`, renderer authority map | ADAPT through approved host hooks only | loss/recovery, memory, FPS, loading |
| Bellagio portal | `bellagio/index.html` and `worlds/registry.json` | REUSE; improve location/lifecycle/status labels if observed confusion | data accuracy, 2D/no-WebGL, return path |
| Spatial Studio | existing app/location to verify | DEFER redesign; test existing workflow against pilot | nondeveloper task success, sources and licensing |
| Company Profile | private company app | REUSE as enterprise delivery record, do not replicate admin approval/portfolio UI | owner confirmation and secure data boundary |
| Finance application | existing finance domain | NO UI CHANGE | distinct financial correctness and access gates |

## Baseline task and UX acceptance
- On physical Android and iOS, new user can identify primary action, inspect a supported product, and return without coaching.
- Capture screen video, screenshots and tap/keyboard path at pinned release SHA.
- Verify loading progress, unavailable WebGL, denied permissions, missing model, slow connection, context loss, back/forward and focus restoration.
- Record time to first meaningful interaction, task completion, error/retry rate, user-rated clarity and support prompts. Do not claim user data without conducting a test.
- Accessibility: semantic accessible controls around WebGL, reduced motion, keyboard focus, captions/alt content; WCAG review on regular UI.
- Business measurement: record effort to configure second scene and accepted asset provenance; one qualified buyer pilot before broader authoring UI.

## One shared delivery and learning process
Observe -> retrieve prior experiments -> propose bounded hypothesis -> test independent baseline -> evaluate security/rights/a11y/perf + actual task -> existing release gate -> measure business outcome -> update owning method.
Financial and spatial-specific evaluators remain distinct. Never create a second approval system, persistent agent memory, renderer or customer data store without established demand.
Pre-existing assets and IP retain original ownership; ownership may change only via explicit agreements.

## Stop/Go
GO for an additive UI refinement only if evidence shows an actual task failure, baseline records it, target component is canonical and risk is bounded.
STOP if CI/rights/privacy/security gates fail, if Greatlinq vendor interfaces are assumed, or if it requires a new independent frontend/backend without customer acceptance.
Do not touch production based on this document alone.

## Current evidence
Spatial scanner PR #144 has corrections for dirty HEAD and symlink ancestry but its revised tests, full CI and multi-repo execution are not yet independently certified. Browser UX, commercial outcomes and cross-engine interoperability remain unverified.
