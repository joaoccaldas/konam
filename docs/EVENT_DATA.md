# Official Event Data Policy

Official race-organizer sources are valuable, but they contain a mix of durable facts and rapidly expiring operational details.

## Rule

Do not scrape/copy an event page directly into product UI.

Normalize official sources into a versioned source registry with:
- source URL;
- source type;
- valid event year;
- current/reference-only/superseded status;
- verification date;
- categories;
- extracted facts tied back to source IDs.

## Freshness classes

### Current
May drive current event UI when its `valid_for_year` matches the event year.

Examples:
- event date and venue;
- current race-week schedule;
- current expo;
- current athlete guide;
- current course maps;
- current road closures/rules.

### Reference-only
May support historical context, scene design, research and comparisons, but must not be shown as current operational guidance.

Examples:
- previous-year athlete guide;
- previous-year aid stations;
- previous-year wave schedule;
- previous-year cutoffs;
- previous-year transition instructions.

## Kona 2026 initial source registry

Current official evidence currently supports:
- October 10, 2026 event date;
- Kailua Pier venue;
- 2026 race-week expo at Hale Hālāwai Park, Aliʻi Drive;
- expo dates/hours October 6–9.

Indexed official athlete-guide/course-map material is currently 2025, so it remains reference-only until official 2026 equivalents are published and verified.

## Product uses

Event data can feed:
- Race Week surface;
- event/world metadata;
- trip planner;
- spectator tools;
- Story engine;
- MCP/API;
- partner/sponsor experiences.

Time-sensitive values must carry source/freshness metadata all the way to the consuming surface.
