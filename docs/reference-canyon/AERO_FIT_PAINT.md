# Aero lab, rider fit and image painting

The offline museum viewer includes **Aero lab**, **Rider fit**, and **Configure → Upload artwork**. All calculations and file processing happen locally. No uploads, services, accounts or credentials are required.

## What is real, and what is assumed

`web/src/aero.mjs` evaluates a steady cycling force balance in SI units. Humid-air density uses ideal-gas mixing with a saturation-vapour approximation. Apparent air velocity includes longitudinal wind and crosswind. The axial coefficient is defined as bicycle-axis drag divided by dynamic pressure based on apparent air speed:

- `U = hypot(v + headwind, crosswind)`; `yaw = atan2(crosswind, v + headwind)`.
- `Fx = 0.5 * density * U² * CdAx`; aerodynamic wheel power is `Fx * v`.
- Rolling power is `Crr * mass * g * cos(atan(grade)) * v`.
- Gravity power is `mass * g * sin(atan(grade)) * v`.
- Pedal power is the sum divided by drivetrain efficiency.
- A bracketed solver finds steady ground speed at the requested pedal power; constant-course time is distance / speed. Positive differences mean savings; negative differences are losses.

These are real force calculations **given a coefficient**. They do not calculate the drag coefficient from the rendered mesh. There is no CFD solver, pressure field, turbulence solution, lift/steering prediction or factory Canyon aero dataset. Flow paths are deliberately labelled illustrative; their direction and animation speed follow the calculated apparent wind. Wheels rotate at the specified ground speed. Reduced-motion mode and Pause stop this animation.

The initial rider + bike `CdAx = 0.230 m²`, bike-only `0.055 m²`, generic rear-disc delta `−0.004 m²`, rider silhouette coefficient `0.65`, and all other accessory deltas are **sensitivity assumptions, not product measurements**. A zero accessory delta means uncharacterized. Paint has no assigned drag effect. Both configurations use the entered total mass and Crr; accessory mass, wheel rotational drag and tyre-pressure changes are not inferred. Coefficients are assumed speed-independent. The editable ±ΔCdAx range is a sensitivity bound, not statistical confidence.

The default model is bounded to ±25° apparent yaw. Imported curves are never extrapolated; unsupported yaw, nonpositive resulting CdA, impossible rider reach or a mismatched imported configuration returns no result. A rider + bike baseline cannot be compared with bike-only as though removing the rider were an equipment gain. Pin a baseline in the same system first. Speed solving is bounded to 0.25–120 km/h; an unavailable root is reported as unavailable.

Sources for equations and context:

- [NASA Glenn, drag equation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/drag-equation/).
- [Steve Gribble, cycling power/speed force model](https://www.gribble.org/cycling/power_v_speed.html).
- [DT Swiss ARC DISC construction and wind-tunnel comparison](https://www.dtswiss.com/en/arc-disc). Its published 80/80 versus 80/disc comparison is not the current 85 mm wheelset. Its quoted watts are **not** used as the coefficient for this build.

## Measured curves and comparison workflow

1. Set the visible bike options and rider measurements/posture. Set air, course and power inputs.
2. Open **Use your wind-tunnel measurements**, describe the test source and conditions, and load a CSV of at most 64 KB. Required header: `yaw_deg,cda_m2`. Supply 2–181 distinct yaw values in −45…45 degrees, with positive whole-system axial drag areas no greater than 1.5 m².
3. The curve is linearly interpolated only within its supplied yaw interval. It is bound to the effective accessory configuration and rider dimensions/posture. Changing paint does not invalidate it; changing an aerodynamic option or fit does.
4. Pin the current configuration as baseline. Change the setup and load a corresponding curve, or explicitly switch to editable assumptions. Unverified user-supplied curves are labelled as such.
5. Export results as `museum-aero-study-v1` JSON. It contains environmental inputs, baseline/current configurations, coefficients/curves and provenance, sensitivities, computed forces/speeds/time differences and limitations. The example CSV is synthetic, clearly named `EXAMPLE-NOT-MEASURED.csv`.

No curve or rider data is sent to a server. Lab inputs and imports are session-only. This version has one researched bike exhibit; future generations need separate geometric adapters and separately sourced aerodynamic data.

## Rider fit and position search

The optional rider is a deliberately stylized dimensional mannequin, not a scanned human or production character rig. Enter hip–shoulder, shoulder–elbow, elbow–wrist, hip–knee, knee–ankle and shoulder-width measurements. Defaults for leg lengths are estimates. Height scales helmet/feet; inseam informs the optional contact-point starting estimate. It does not silently override measured limb lengths.

The kinematic model solves segment reach with lateral spacing included. Saddle height is vertical above the BB; setback is behind the BB; pad reach/stack are horizontal/vertical from the BB. The bike's saddle/post and upper cockpit groups follow these contact points. A valid render requires segment reach; the search additionally checks an illustrative knee range of 55–165°, hip opening ≥35° and torso angle 0–60° across 36 crank phases. Pedalling follows the model's 165 mm crank and original −12° phase.

**Explore aero positions** evaluates 15 combinations of pad stack offsets −6/−3/0/+3/+6 cm and reach offsets −3/0/+3 cm. It picks the smallest rasterized projected frontal silhouette among feasible combinations. `0.65 × change in projected area` supplies a clearly assumed CdAx change. This is a front-view, single-phase capsule/ellipse silhouette surrogate, not airflow optimization. No claim is made that its candidate maximizes actual speed, comfort, sustainable power or physiological efficiency. Hardware adjustment travel, minimum seatpost insertion and detailed collision clearance are not validated; do not treat the virtual movements as a claim that the physical size-M hardware supports every input.

Native Blender files contain hidden **OPTIONS • rear disc and fit mannequin** meshes. Unhide the representative disc cover and hide `spokes_rear` to view it; retain the original rim, tyre, hub, cassette and rotor. The Blender mannequin is a static editable pose generated from the same fit equations. It is excluded from the stock GLB and game LODs. Interactive fit belongs to the browser module.

## Image painting

Upload PNG, JPEG or WebP up to 12 MB and 60 megapixels. Decoded artwork is resized to a maximum 2048-pixel edge, converted into an sRGB GPU texture, and projected in the bike side plane onto painted frame/fork materials. Adjust size, horizontal/vertical placement, angle, opacity and repetition. Existing brand geometry remains visible above the image. The same projection passes through both sides; this is a preview projection rather than a manufacturing UV wrap.

The file stays in memory. Replacing/removing it disposes the prior texture and revokes temporary object URLs. The **Save painted exhibit** action embeds the image, placement settings and paint/configuration values in a new standalone HTML file; reopening it reconstructs the texture. The original HTML is preserved. Copy-link does not embed the image; the stock GLB download does not include this shader artwork or a fitted rider. Use the saved exhibit or screenshot for sharing the painted preview. No persistence is promised after closing an unsaved tab.

## Source/workflow catalog

| Source | Responsibility |
|---|---|
| `web/src/aero.mjs` | Pure force model, curve parsing/interpolation, validity checks, signed comparisons and steady-speed solve |
| `web/src/lab.js` | Local controls, chart, result export/import, baseline state and test chamber |
| `web/src/fit.mjs` | Measured-segment inverse kinematics, posture bounds, projected silhouette and bounded search |
| `web/src/rider.js` | Mannequin, bike contact-point transforms and fit controls |
| `web/src/paint.js` | Local decoding, projection shader, disposal and self-contained painted HTML |
| `tools/export_fit.mjs` | Shared default pose JSON for Blender |
| `blender/museum_options.py` | Optional editable Blender meshes |
| `web/test/*.test.mjs` | Independent equations, solver residual, import and kinematic checks |
| `web/lab-smoke.mjs` | Offline Chromium desktop/mobile interaction and painted-file reopen |

Rebuild with `python3 tools/build_museum.py --lods`. Run `node --test web/test/*.test.mjs`, `node web/smoke.mjs`, `node web/lab-smoke.mjs`, then `python3 tools/check_receipt.py`. The build fails on missing references, unsupported adapters, missing dependencies or Blender exceptions. To recover from an invalid curve, restore its setup or choose Use these assumptions. To recover from a failed image decode, upload a supported smaller image; the prior successful texture is retained.

## Reuse discovery

Knowledge-hub evidence `3ce64b58aefb11a3b4eb123d10dde76ac4b8762f3bfa824725c93f3d535f8c77` led to `~/Projects/performance-os/runtime/domain/aerodynamics.js`. Current source and its tests were inspected. The existing core uses the same road-force components but has no crosswind/curve contract and clamps losses to zero, so this exhibit extends its own viewer with a separate pure module and signed comparisons. No Performance OS source was copied or changed. Project preflight returned no relevant indexed failures; that is a coverage limitation, not proof of exhaustive absence.
