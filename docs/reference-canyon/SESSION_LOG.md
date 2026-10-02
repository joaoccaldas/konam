# Speedmax reconstruction session log

## 2026-09-27 — photo-aligned museum exhibit

Extended the existing `~/Developer/speedmax-cfr-3d` implementation. Preserved original source and Blend/GLB/HTML assets before edits. Discovery lead `d2b0dc9a2520aecf041c34df87572afebc7e28ff8f40d4ae777d9f70c9c30ded` concerned unrelated katana rendering; current source inspection, not that conversation, established the bike implementation. Project-scoped preflight found no indexed relevant failure, with the hub's coverage limitation retained.

Fixed interrupted photo reconstruction (disconnected stay sampling, incorrect tube width floor, decal-biased edge fits, false motor-shaped hole, head/fork separation). Integrated photo frame/fork generation, original-graphic sampling, corrected seatpost/extension/cockpit profiles, dimensioned split-nose saddle, subtle Blender surface detail, wheel valves and mould seams. Added a reusable exhibition scene and five close-up/hero cameras.

Delivered an offline gallery with a five-stop tour, source/accuracy context, explicit optional bottles, preserved part picking/explode/ride controls, and reduced-motion camera behavior. Added source manifests, schema/catalog, a fail-fast one-command build, fixed-camera silhouette QA, topology/dimension checks, and repeatable offline browser checks. Regenerated a separate game LOD pack without replacing the prior export.

Validation: see `VALIDATION.md`, `assets/museum/build-receipt.json`, `geometry-checks.json`, `silhouette-report.json`, and `browser-checks.json`. Desktop/mobile-sized Chromium checks pass with no console errors. Five Cycles views and image overlays inspected. Browser hardware is the local Mac, not a real phone.

Limitations: source photographs are not factory CAD; hidden geometry and detailed mechanisms remain interpretations. Current adapter is generation-specific, with shared contracts/workflow for later bikes. Procedural material detail is not a completed baked game texture atlas. No historical exhibits, cloud deployment or Zwift integration are claimed.

### Aero lab, rider and artwork extension

Extended the existing disc and flow visualizations into a local physics-based comparison lab, added configurable measured-segment rider/contact points and a bounded frontal-area position search, and implemented local artwork projection plus standalone painted-exhibit export. Added hidden editable Blender disc/mannequin options. Preserved original assets. Equation/kinematic checks and Chromium desktop/phone-size workflows are documented separately from empirical validation. Coefficients, silhouette drag assumptions, adjustment travel and flow remain explicitly limited; measured matching curves can be supplied by the user.
