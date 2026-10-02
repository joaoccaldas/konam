# IRONMAN Museum Concept Roadmap

Status: concept / partner-demo track
Owner lane: integration / platform
Production dependency: none
Target: ready-to-deploy proof of concept for event organizers, starting with Kona

## Why

The existing Canyon Museum proves product/brand storytelling. An IRONMAN Museum proves the same engine can represent an entire event ecosystem:

- race history;
- iconic courses and locations;
- champions and eras;
- memorable equipment;
- race-week logistics;
- athlete/spectator utility;
- sponsor activations;
- commerce/referrals;
- post-race memory and replay.

The strategic goal is not to copy the IRONMAN website. It is to demonstrate a richer Event OS that an organizer could license or acquire.

## Day-1 concept

### Entrance
A cinematic Kona entry with:
- event identity;
- countdown/current event context;
- Kailua Pier;
- course overview;
- "Explore the history" and "Race Week" paths.

### Core rooms

1. **Origins**
   - early Hawaii races;
   - timeline;
   - archival imagery where licensing permits.

2. **Champions**
   - year-by-year winners;
   - athlete stories;
   - iconic finishes;
   - equipment relationships.

3. **The Course**
   - swim;
   - Queen K;
   - Hawi;
   - Energy Lab;
   - Aliʻi Drive;
   - finish line.
   - 3D course/story integration, not copied map art.

4. **Machines of Kona**
   - historically important bikes;
   - shoes;
   - helmets;
   - aero equipment;
   - links into existing product objects and Race Setup.

5. **Race Week**
   - official current-year schedule;
   - venues;
   - expo;
   - logistics;
   - places;
   - spectator utility.

6. **Culture & Place**
   - Hawaiʻi Island context;
   - Native Hawaiian history/culture sourced respectfully;
   - local places and visitor guidance.

7. **Finish Line / Memory**
   - iconic finishes;
   - results;
   - athlete stories;
   - post-race replay/memory concepts.

## Data policy

### Official IRONMAN sources
Use for:
- event identity;
- current-year race-week schedule;
- course structure;
- results where legally/technically available;
- rules/athlete-guide references;
- sponsor/expo information.

Official IRONMAN material remains source-authoritative and is not represented as ours.

### Open/public imagery
Preferred prototype image sources:
- Wikimedia Commons;
- U.S. federal public-domain photography;
- other clearly licensed open media.

Every image requires:
- canonical source URL;
- author/creator;
- license/public-domain status;
- event/year context;
- local derivative status if transformed.

No image enters runtime without provenance metadata.

## Initial open-source visual pool

Wikimedia Commons currently exposes reusable Kona/IRONMAN material, including:
- World Championship start imagery;
- finish-line imagery;
- race preparation/practice-swim imagery;
- athlete/race-action imagery;
- champion/event galleries.

Some U.S. military-produced images are public domain in the United States. License status must be validated per file before use.

## Prototype stages

### V0 — data museum
Goal: prove the information architecture without new heavy geometry.

- event timeline;
- champion/result objects;
- course/place objects;
- open-image gallery;
- links to existing bike/equipment objects;
- current-year event-source registry;
- Race Week cards.

### V0.5 — immersive museum
Goal: prove Event OS + museum convergence.

- Kona environment modules;
- Pier;
- Queen K;
- Hawi;
- Energy Lab;
- finish line;
- spatial timeline;
- product exhibits;
- story-engine beats.

### V1 — partner-ready demo
Goal: show what IRONMAN or another organizer could buy.

- athlete mode;
- spectator mode;
- race-week planner;
- sponsor/vendor spaces;
- commerce/referral offers;
- current official schedule;
- course exploration;
- results/history;
- post-race memory layer;
- partner-branding configuration.

### V2 — licensed live event layer
Only with official data rights/integrations:
- timing;
- tracker positions;
- live splits;
- official alerts;
- closures;
- live course state;
- sponsor conversion reporting.

## Commercial demonstration

The IRONMAN Museum should prove four revenue surfaces:

1. **Organizer licensing**
   - Event OS / museum / race-week companion.

2. **Sponsor activations**
   - immersive product rooms and challenges.

3. **Referral commerce**
   - gear, hotels, transport, attractions, local retail, expo vendors.

4. **Brand/product conversion**
   - equipment discovery -> Race Setup -> merchant/brand destination.

## Success criteria

The concept is successful when:
- it can be deployed without copying IRONMAN proprietary app code/UI;
- all content is source/provenance tracked;
- current vs historical data is explicit;
- event-specific content is primarily data, not bespoke application code;
- the same schemas can instantiate another race;
- the same product objects appear in Museum, Setup, Story, MCP and commerce surfaces;
- mobile performance stays within existing budgets.

## Reuse target

The same Event Museum template should be reusable for:
- Kona;
- Nice;
- IRONMAN 70.3 World Championship;
- Roth;
- T100;
- Norseman;
- independent races.

An event becomes configuration + content + assets, not another application.
