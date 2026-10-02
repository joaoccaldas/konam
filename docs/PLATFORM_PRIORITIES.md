# Platform Priorities — 2026-09-30

This roadmap defines execution order across the parallel lanes. It deliberately prioritizes reusable platform capability before room-specific polish.

## P0 — protect and prove the platform

### 1. Product Intake Proof V0
Owner: product-intake lane

Goal:
- make the real-browser proof reliable;
- produce mobile screenshots/metrics for Cervélo + Alphafly;
- prove no RaceSetup or brand-specific runtime changes.

Why:
This is the quality gate products #3–#100 will depend on.

### 2. Integration Platform V1
Owner: integration lane

Goal:
- keep integration contracts green against current main;
- normalize catalog/graph/MCP/story/event/commerce/maintenance;
- keep writes disabled by default.

Why:
Every future brand/event/room consumes these contracts.

### 3. Component Reuse / Compatibility
Owner: integration + asset lanes

Goal:
- model fitment/interfaces for wheels, drivetrain, cockpit, pedals, saddles and other reusable parts;
- return compatible / incompatible / unknown based on evidence.

Why:
Reusable components reduce duplicate modelling and unlock true setup composition.

### 4. Event OS / Kona Companion
Owner: product/platform

Goal:
- official current event sources;
- race-week schedule;
- places/logistics;
- spectator/athlete utility;
- commerce/referral hooks;
- source freshness.

Why:
This is the recurring-use and organizer-value center of the product.

### 5. Zwift Lab / Marketplace — P0 Showcase
Owner: future showcase lane consuming shared contracts

Goal:
- one highly themed, partner-ready technology showroom;
- trainers, Ride hardware, Cog/Click, software features, support/setup, comparisons and commerce;
- unofficial concept until Zwift approval.

Why:
Zwift combines hardware, software, compatibility, setup guidance and a documented affiliate programme. It is an ideal demonstration of the full platform and a high-priority commercial prototype.

Constraint:
Do not build a Zwift-specific renderer. Use Product, Story, TechRoom, Maintenance and Commerce contracts.

### 6. IRONMAN Museum / Event Organizer Demo
Owner: future showcase lane

Goal:
- deployable event museum + race-week companion concept using source-controlled/open media and official event data.

Why:
This is the clearest organizer licensing/acquisition demo.

## P1 — expand only after P0 gates are trustworthy

### Batch 03 Rider Interface Intake
Candidates:
- Specialized S-Works TT 5 helmet
- Giro Aerohead Mips II helmet
- POC Procen Air helmet
- ISM PN 3.1 saddle
- Garmin Edge 1050 bike computer
- Shimano Dura-Ace PD-R9100 pedals

Promotion only after Batch 03 CI and visual QA pass.

### Engineering Room V0
Generic:
inspect -> explode -> explain -> compatibility -> maintenance -> vendor -> reassemble

Use Batch 02 components first.

### Maintenance / Tips V0
Manufacturer-sourced guides attached to canonical entities.

### Affiliate / Vendor V0
Approved programmes only; ordinary official/vendor links otherwise.

## P2 — scale the factory

- remaining candidate bikes;
- historical Nike shoes after archive provenance;
- helmets after intake proof;
- smart trainers / power meters / wearables;
- partner embeds;
- real MCP transport;
- event templates beyond Kona.

## Platform KPIs

- Time-to-World
- Reuse Multiplier
- Bespoke-Code Ratio
- Integration Surface Count
- Evidence Coverage
- Conversion funnel where approved
- Mobile bytes / draw calls / triangles
