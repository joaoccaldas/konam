# KONA release backlog — 1–14 October 2026

Launch is a focused free beta: discover Kona, build a race self, keep progress, explore equipment, and share a clean invitation. Paid athlete/brand pilots belong to the commercial roadmap. The business model's $31,000 revenue, $32,000 cash costs and $1,500 incremental budget are estimates, not measured results or release evidence.

## Current release status — 2 October 2026

- **Web launch:** deployed and verified from main `91e3b6a99427726e638d28623d8f5b7f9cd183da` via guarded GitHub Pages workflow.
- **Current main:** `8b229b4980ef7c7848b5f6a69df2152eab5539a6`, adding the merged Android packaging repair from #149 without intentionally changing the web product runtime.
- **Android packaging:** build + emulator smoke proven; stable public APK signing still blocked by issue #150.
- **Physical devices:** real Android/iPhone acceptance remains pending.
- **Post-launch architecture:** #139 remains spec/contracts only and must not leak Totems, Doors, rankings, automated Intern or related future systems into launch claims.

## Launch baseline: PR #135 — launch and continuity

| Priority | Deliverable | Acceptance and evidence |
|---|---|---|
| P0 | Hold WYLD until separately authorised | Single disabled special-event policy; no landing preview, public bike, room/map/door, Studio finish, progression teaser or legacy collection projection at levels 1–10 or admin. Preserve underlying event files and saved history. |
| P0 | Freeze a reproducible candidate | Commit sources and generated pages/bundles/manifest/worker. All workflows check the PR head, never a synthetic merge. Rebuild must leave generated outputs unchanged. |
| P0 | Safe persistence and navigation | Legacy/new passport union; identity/equipment rollback on failed saves; no writes on Studio preview; latest requested tab wins delayed loads; scene disposal; return Home. |
| P0 | Publish only certified content | Unit, Museum/browser, security, integration, seal, visual and four UI interaction jobs succeed at the same immutable SHA. Verify production receipt and sealed file hashes. Physical phone installation remains explicitly unverified until observed. |
| P1 | Landing and first visit | Full eligible bike catalogue, independent of progression; no immediate repeat; anonymous secret previews; usable sign-in, five optional onboarding questions, avatar, install/rotate handoff. |
| P1 | What matters most | Useful sourced weather, airport arrivals and transport, HST bearings, official websites/social, local thumbnails, manually authored Intern notes. Reject stale observations; show a useful forecast fallback. |
| P1 | Countdown | Seconds default; normal display and timezone preference; fixed HST event instant. Label race-day midnight separately from an unverified race start. |
| P1 | Finds and sharing | 100 slots, honest locked identities, first Find once, real Item Studio model, admin inspection without invented ownership; real PNG sharing, cancellation, clean links. |
| P1 | UI fit | Canonical tokens/components; 320, 390, short landscape, desktop, plus 360/430; no horizontal overflow; meaningful touch targets; light/dark/random screenshots and explicit visual review. |

## Daily release decisions

Every day ends with one observed acceptance result. A daily release is optional: do not deploy merely to fill the calendar. No new feature enters a frozen candidate without rerunning affected gates and recertifying the final SHA.

| Date | Focus | Exit criterion |
|---|---|---|
| Oct 1 | Promise, entry, persistence, discovery, sharing; exact-SHA status board | Launch blockers fixed, candidate and evidence committed; WYLD absent. |
| Oct 2 | iPhone/Android install, reopen, persistence | User-provided physical evidence recorded. Live account restoration is currently skipped at user request. NFC sticker/QR prototype remains separate deferred work. |
| Oct 3 | Shared invitation and recipient journey | Anonymous recipient can enter; cancellation has no reward; old links do not expose account data. |
| Oct 4 | Collection comprehension | One meaningful find and idempotent reward; ten visitors can explain discovery vs collection. No invented trading service. |
| Oct 5 | Source review and race guide | Verified 2026 sources and HST; mark older guides as reference-only. Never publish mock weather or invented airport figures. |
| Oct 6 | Useful product/place details | Actual cards open meaningful content; source links/representation clear. Prepare partner offers only in a separately authorised commercial task. |
| Oct 7 | Slow/offline/a11y, freeze | Ten core journeys with zero P0 defects; latest seal verified; documented rollback candidate. |
| Oct 8 | Approved content and demonstrations | Publish only checked assets; local partner activation conditional on real confirmation. |
| Oct 9 | Stable arrival guide and support | Saved state survives reopen; official links checked; support owns clear issue triage. |
| Oct 10 | Race-day editorial/support | Official tracking handoff; no invented results, automatic imports or late noncritical code. |
| Oct 11–14 | Reflection and retention | Separate observed usage/revenue from estimates; retire race banners; use learning to choose the next release. |

## Vision-to-release truth boundary

The visual storytelling catalogue is a brand/product north star, not release evidence.

**Current only when runtime-proved:** local-first Race Self, Garage/race setup, the eligible bike catalogue, KONA Finds, sourced Feed/Travel surfaces, countdown, private sharing, responsive navigation, and museum/runtime surfaces covered by release evidence.

**Future or separately authorised until proved:** WYLD event exposure, Totem/door entitlements, seasonal/global rankings, NFC passports or member keys, verified athlete tiers, Strava-driven access, live wind telemetry, automated Intern operations, trading, affiliate/buy flows, and partner-specific commercial experiences.

Canonical implementation names beat older concept copy. Avatar character types currently come from `web/src/engine/avatar.js`: Minecraft, Badass, Aero and Islander. Do not reintroduce Koa/Pele/Lono/Hina from older visual concepts without an explicit schema/product migration.

Do not use a vision document, mockup, schema, generated image or product narrative as proof that a runtime capability exists. The authoritative chain is source → deterministic build → evidence → exact-SHA deployment receipt.

## Later: PR #139 — product/spec/contracts

Totems as real themed keys, visible/hinted/secret doors, three-day guessing challenges, bounded early access, 100-Find seasons, Global Firsts, anti-farming, commercial ranking exclusions, brand/athlete propositions and automated Intern contracts remain architecture. Validate schemas/examples and reject unsafe payloads; do not ship runtime implementations in this PR.

Before those features are built, resolve server-owned challenge answers, deterministic scoring/ties, verified clocks, reward authority, data migration, moderation, sponsorship disclosures and real pilot demand. This preserves a coherent launch and avoids rewarding local-state manipulation.

## Assessment of the external critiques

**Use now:** full catalogue entry previews, honest state persistence, useful Discover cards, useful travel brief, responsive navigation, canonical styling and immutable release evidence. They address observable launch failures or explicit product requests.

**Use later:** challenge automation, Totem entitlements, commercial rooms, automated editorial voice, trading, server rankings and NFC/pilot delivery. They require authority, operations and acceptance work beyond the launch fixes.

**Reject as evidence:** another branch's green checks as certification for this branch; a seal digest presented as a Git SHA; mocked weather/wind/arrival statistics as current conditions; missing-button claims unsupported by inspecting the actual screen; “100% confidence” without a defined test denominator. External scores are opinions, not measured coverage. Keep the joy through clear, surprising copy and optional exploration; keep operational facts precise.
