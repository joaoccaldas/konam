# Bike and Equipment Maintenance Roadmap

Maintenance should be a first-class reusable knowledge layer attached to canonical bikes/components.

## Why

A user inspecting a bike should eventually be able to move naturally between:
- what is this?
- how does it work?
- how do I set it up?
- how do I maintain it?
- what spare part do I need?
- where can I buy/service it?

That increases utility, return visits and commercial intent without creating a generic blog.

## Product surface

Each bike can eventually expose:

```
OVERVIEW
ENGINEERING
SETUP
MAINTENANCE
SPARES
WHERE TO BUY / SERVICE
```

Component maintenance is inherited where appropriate. A bike with DT Swiss wheels and Shimano drivetrain should link to the exact component guides rather than duplicate their service instructions.

## Safety rules

1. Manufacturer manual/support is authoritative.
2. Do not invent torque values, fluid specifications, service intervals or disassembly steps.
3. Model/year/component identity must match the guide.
4. High-risk or specialized service is marked `professional-service`.
5. Old manuals remain versioned and are never silently applied to a newer platform.
6. Current safety notices/recalls override static guide content.
7. Tips may simplify navigation, but must not contradict the manufacturer manual.

## Initial source-backed examples

### Canyon Speedmax
Canyon publishes dedicated Speedmax support covering setup, hydration, cockpit adjustments, Di2, tyre/brake guidance, packing, manuals, service and spare parts.

### Cervélo P5
Cervélo publishes current P5 manuals/service references plus cockpit and compatibility documentation.

### Trek Speed Concept
Trek exposes a Speed Concept service manual with part numbers, torque values and platform-specific technical instructions.

### DT Swiss wheels
DT Swiss support includes spare/conversion parts, manuals, how-to videos and dealer/service guidance. The manufacturer warns that improper maintenance can affect warranty.

### Shimano drivetrain
Shimano exposes manuals, technical documents, product compatibility and dealer/service tools.

## Architecture

Maintenance lives on canonical entities.

Example:

```
cervelo-p5-disc-mk2-size54
  ├ maintenance/pre-ride
  ├ maintenance/cockpit
  ├ maintenance/hydration
  └ component links
       ├ DT Swiss wheel guide
       └ Shimano drivetrain guide
```

Do not write one giant bike-specific article that duplicates component instructions.

## Future capabilities

- model-specific pre-race checklist;
- "service before Kona" checklist;
- travel/reassembly guide;
- consumables/spares list;
- troubleshooting decision tree;
- nearby authorized service;
- exploded-part click -> maintenance guide;
- exploded-part click -> spare/vendor offer;
- owner-maintenance history, local-first;
- reminders only if explicitly requested.

## Commercial link

A maintenance guide may reference:
- official spare-part source;
- official dealer locator;
- approved affiliate retailer;
- authorized service location.

The guide itself must never prefer a lower-quality part/vendor merely because commission is higher.
