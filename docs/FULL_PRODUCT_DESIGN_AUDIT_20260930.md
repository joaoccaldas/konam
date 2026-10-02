# Full Product / Codebase / Design Audit — 2026-09-30

## Stable checkpoints

**Before platform expansion**
- `9954d709` — Kona discovery foundation

**After platform expansion**
- `3a5768ae` — Product Experience aggregation
- Integration contract: PASS
- Museum checks: PASS

**Current production main**
- `869b5535` — Setup Slot Compatibility V0

## Executive assessment

The app has moved from an unusually strong immersive Canyon museum into the beginnings of a reusable triathlon Event OS + product platform.

The strongest progress is architectural:
- versioned RaceSetup;
- canonical product IDs;
- public catalog;
- triathlon graph;
- event-source freshness;
- candidate intake;
- component reuse;
- maintenance;
- commerce;
- affiliate prioritization;
- MCP read surface;
- Story/TechRoom contracts.

The biggest remaining weakness is product presentation and focus:
the underlying platform is now more mature than the consumer-facing information architecture.

## Before / after codebase

| Metric | Before | After |
| --- | ---: | ---: |
| Repository files | 553 | 619 |
| Integration files | 0 | 46 |
| Docs | 27 | 39 |
| JSON | 68 | 93 |
| MJS | 54 | 81 |
| Commits ahead of before checkpoint | — | 54 |
| Additions | — | 8,322 |
| Deletions | — | 201 |

This growth is mostly additive contracts/data/tests rather than replacement of production rendering.

## Current internal product score

**3.8 / 5 today**

This is an internal quality estimate, not an App Store prediction.

### Why it is already strong

- differentiated spatial 3D experience;
- highly unusual product/engineering depth;
- strong provenance discipline;
- real mobile optimization work;
- progressive loading;
- installable PWA + Android shell;
- local-first privacy;
- no mandatory account;
- shareable state;
- RaceSetup composition;
- deterministic builds/sealed releases;
- race-week/event-source architecture;
- credible B2B showcase potential.

### Why it is not 5-star-ready

- too many possible entry points and mental models;
- home/navigation hierarchy is not yet as obvious as best-in-class consumer apps;
- some 3D scenes/assets are more impressive technically than polished emotionally;
- realism is inconsistent across old/new product assets;
- consumer utility is spread across Museum / Studio / Kona / trip / collection rather than one crystal-clear race-week shell;
- retention loop is still weaker than Strava/Zwift;
- social/viral loop is promising but not yet inevitable;
- product-intake browser QA is still being hardened;
- commercial/maintenance layers exist architecturally but not yet as polished surfaces;
- current experience still feels partly like several excellent prototypes sharing a repo.

# Design benchmark

## IRONMAN Tracker

What users reward:
- immediate purpose;
- race selection;
- athlete search;
- live splits;
- live map;
- notifications;
- low cognitive load.

Official iOS listing currently shows 4.9/5 with thousands of ratings.

What to borrow:
- "What do I need now?" clarity;
- race-centric home;
- spectator-first shortcuts.

What we should surpass:
- pre-race utility;
- 3D course storytelling;
- gear discovery;
- race history;
- setup;
- destinations;
- sponsor/product experience;
- post-race memory.

## Strava

What users reward:
- one obvious core object: the activity;
- immediate feed;
- habit loop;
- identity/community;
- routes/maps;
- shareability.

What to borrow:
- persistent athlete identity;
- one-tap return loop;
- cards that always answer "why do I care?";
- social object that is easy to share.

What we should not copy:
- another generic activity feed.

Our canonical social object should be:
- race setup;
- discovery;
- race-week moment;
- product/story;
- event memory.

## Zwift

What users reward:
- immersion;
- progression;
- worlds/routes;
- achievements;
- events;
- hardware/software integration.

What to borrow:
- strong world identity;
- meaningful rewards;
- technology as experience;
- fresh event content.

What we should surpass:
- real-world race context;
- destination usefulness;
- equipment marketplace;
- history/storytelling;
- race-week utility.

## Nike

What users reward:
- product photography/visual hierarchy;
- story + product in one surface;
- personalization;
- clear commerce path;
- polished mobile interaction.

What to borrow:
- every product page feels intentional;
- fewer controls, better hierarchy;
- high-quality imagery/material presentation;
- content leads naturally to purchase without looking like an ad page.

# Visual/UI audit

## Current strengths

### 3D graphics
- spatial museum is genuinely distinctive;
- procedural/Blender pipeline is real;
- engineering states create depth;
- current flagship Canyon work can look premium;
- progressive loading and quality presets are thoughtful.

### Art direction
- Kona / museum / archive themes provide emotional identity;
- real story/world potential beyond "3D viewer";
- spatial storytelling is stronger than normal catalog apps.

### Mobile engineering
- tested phone widths;
- quality presets;
- safe-area work;
- setup action-footer hardening;
- deferred asset loading.

## Current weaknesses

### Visual consistency
Old Atlas/history assets, recent measured bikes, component studies and polished Canyon bikes do not yet share a single fidelity bar.

**Fix:** every public asset must pass:
1. silhouette overlay;
2. scale validation;
3. material/roughness review;
4. lighting review;
5. mobile close-up screenshot;
6. source/representation badge.

### UI density
Too many controls/cards can compete with the 3D world.

**Fix:** adopt one primary action per state.

Examples:
- Explore object -> **Inspect**
- Product -> **Add to Setup**
- Part -> **Understand**
- Setup -> **Share**
- Place -> **Save / Go**
- Offer -> **Buy / Book**

Secondary actions live behind a sheet.

### Navigation
Museum-first IA is no longer enough.

Recommended mobile IA:

```
KONA
├ NOW
├ EXPLORE
├ MY SETUP
├ PLAN
└ ME
```

**NOW**
- next race-week action;
- official schedule;
- saved places;
- important update;
- race countdown.

**EXPLORE**
- 3D world;
- museum/history;
- bikes/equipment;
- Tech Rooms;
- stories.

**MY SETUP**
- bike;
- wheels;
- helmet;
- shoes;
- later components.

**PLAN**
- course;
- places;
- expo;
- itineraries;
- book/buy.

**ME**
- Passport;
- saved objects;
- local settings;
- optional future sync.

The 3D world remains the hero, but ordinary tasks should never require walking through the museum.

# Graphics / realism bar

## Public asset quality classes

### Tier A — Hero
Suitable for close-up marketing and brand outreach.
Requires:
- accurate silhouette;
- calibrated dimensions;
- PBR materials;
- close-up QA;
- believable junctions/details;
- mobile LOD.

### Tier B — Museum
Clearly recognizable and evidence-grounded.
May simplify tiny mechanisms.

### Tier C — Engineering study
Useful for exploded explanation / prototype rooms.
Must be labelled study/provisional.

### Tier D — Internal
Never shown publicly.

Do not allow Tier C to drift into Hero simply because the object exists.

# Rendering strategy

## P0
- individual GLBs, deferred;
- mobile byte budgets;
- dynamic pixel ratio;
- freeze unnecessary shadows;
- distance/room culling;
- one lighting system per room template;
- automated camera framing for QA;
- screen-size golden snapshots.

## P1
- Meshopt consistently;
- KTX2 for large textures;
- instancing for repeated hardware;
- semantic LODs;
- worker/preload where justified;
- render budgets per room:
  - initial bytes;
  - total deferred bytes;
  - draw calls;
  - triangles;
  - memory;
  - FPS floor.

# Storytelling system

The strongest viral content is not "look at our 3D model."

It is a small story users can understand/share in seconds.

## P0 story formats

### "How this machine works"
inspect -> explode -> one surprising fact -> reassemble.

### "How this bike won / changed Kona"
bike -> athlete -> course moment -> engineering choice.

### "My Kona Setup"
compose -> personalize -> share card.

### "What happens here?"
Kona place -> history -> race context -> save/visit.

### "Why does this matter?"
science/gear visual explanation.

Every story should resolve into:
- discovery;
- ownership;
- share;
- useful action.

# Viral loop

Target loop:

```
WOW
 ↓
DISCOVER
 ↓
PERSONALIZE
 ↓
CREATE
 ↓
SHARE
 ↓
recipient lands in same object/state
 ↓
recipient creates their own
```

## Viral triggers

- shareable My Kona Setup;
- "this bike won Kona in…";
- exploded engineering animations;
- hidden objects / rare finds;
- race-week "I'm here" moments;
- personalized race poster;
- setup vs setup comparison;
- athlete/brand rooms;
- visually surprising tech rooms.

Avoid generic "share this page" prompts.

# Retention loop

The app should earn return visits for:
- race-week changes;
- setup completion;
- new compatible product;
- new story/room;
- new hidden find;
- event countdown;
- saved itinerary;
- maintenance/checklist;
- official update.

Avoid arbitrary streak mechanics until utility loops work.

# Commerce / affiliate strategy

Revenue must attach to high-intent objects.

## Tier A verified programme opportunities

### Zwift hardware
- official affiliate programme;
- 5% of basket value excluding tax on most hardware/accessories;
- US/UK/EU;
- Impact;
- subscriptions not currently commissionable.

### Nike EU
- official affiliate programme;
- up to 11% on valid sales;
- 30-day cookie.

### Specialized
- official Rakuten affiliate programme;
- 3%-12% on bikes/equipment;
- 30-day cookie.

### Canyon
- official affiliate programme;
- 2% base commission on bikes;
- 30-day cookie.

### Viator
- 8% on completed experiences;
- 30-day attribution window.

These products/experiences should be prioritized when they are also strong user/product fits.

## Secondary

### Booking.com
Useful race-travel monetization. Official programme confirms commission on qualified bookings, but public material does not expose one universal rate.

### Garmin
Affiliate/creator programmes exist, but public universal commission terms are not clear enough to model a fixed rate before acceptance.

### Wahoo
Programme exists but new applications are currently closed on the EU page. Use normal product/partner links and prioritize Zwift's hardware affiliate path where relevant.

# 5-star bridge

## P0 — before public push

### 1. One mobile home
Make Kona/event context obvious in <5 seconds.

### 2. One first-session flow
```
Enter Kona
→ inspect one stunning object
→ change/save something
→ discover one surprise
→ share/save
```

### 3. Golden visuals
Public hero objects must be Tier A/B only.

### 4. Product-intake browser harness green
No new product scale-up until it is reliable.

### 5. My Kona Setup share experience
Share output must look premium, not like a debug screenshot.

### 6. Race Week NOW surface
Official schedule + places + relevant action.

### 7. Product Experience panel
One unified object sheet:
- story;
- inspect/explode;
- specs/evidence;
- compatible setup;
- maintenance;
- vendor/buy.

### 8. Performance budget visible in CI
No silent regressions.

## P1 — immediately after

### 9. Zwift Lab / Marketplace
Best-in-class themed Tech Room.

### 10. IRONMAN Museum / Event OS demo
Organizer-ready proof.

### 11. Engineering Room
Wheel/crank/cassette/cockpit:
inspect -> explode -> explain -> maintain -> buy.

### 12. Helmets
New RaceSetup category after the intake harness is proven.

### 13. Race destination commerce
Viator + Booking after programme approval.

# Why we can win

We should not compete on:
- activity recording;
- generic training plans;
- live timing alone;
- generic ecommerce.

We can win on the combination:

```
EVENT WORLD
+
PRODUCT GRAPH
+
REAL 3D
+
RACE SETUP
+
STORY
+
UTILITY
+
COMMERCE
```

Incumbents are strong verticals.

Our thesis is a composable layer where:
- the event contextualizes the product;
- the product becomes interactive;
- the user makes it personal;
- the story explains why it matters;
- the setup creates identity;
- the event utility creates retention;
- vendor links convert intent;
- the same object powers app, MCP, embed and partner rooms.

# Release scorecard

A 5-star-worthy V1 should meet:

| Dimension | Target |
| --- | --- |
| Purpose clarity | obvious in first 5 sec |
| First meaningful interaction | <30 sec |
| First personalized state | <60 sec |
| Mobile action reachability | 100% golden widths |
| Hero asset realism | Tier A/B only |
| Default load | measured/budgeted |
| Critical task failure | zero known |
| Share output | premium/social-ready |
| Race-week utility | current/source-dated |
| Product evidence | visible/sourceable |
| Affiliate disclosure | explicit |
| Privacy | local-first / no hidden tracking |
| Accessibility | touch sizes, contrast, keyboard/screen semantics |
| Cross-brand integration | no brand runtime branches |
| New-product marginal code | trending toward zero |

## Internal target score

- Current checkpoint: **3.8/5**
- After P0 list above: **4.5+/5 internal quality**
- True 5-star ambition requires real user evidence, crash/performance data, and successful first-session usability tests. It cannot be guaranteed from code review alone.
