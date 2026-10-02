# Fitting research, gaps and execution plan

Research checked 27 September 2026. This covers the major method families and representative systems, not every commercial fitter or proprietary algorithm. Vendor descriptions establish product capabilities, not independent proof of effectiveness. This is an independent Canyon study, not an official Canyon/Retül/Zipp product.

## Methods and useful visuals

| Method | How it works | Useful visual | Current app / missing dependency |
|---|---|---|---|
| Anthropometry / static setup | Measure body segments and bike contact coordinates; use geometry to suggest a starting position. Inseam formulas cannot capture individual limb ratios or mobility. | Dimensioned rider and BB-referenced contact coordinates | Measured segments, radial saddle height, adjustable contacts and limb-length-preserving IK implemented. Default measurements are examples. |
| Static joint-angle fitting | Measure knee/hip/elbow angles at defined crank positions. Static and dynamic reference ranges differ. | Side-on landmark lines and BDC angle arcs | Predicted geometry implemented. Static BDC knee reference 25–35°; no actual rider motion is measured. [Millour et al.](https://pubmed.ncbi.nlm.nih.gov/32022807/) |
| Dynamic 2D video / markerless | Calibrated side video estimates landmarks through repeated strokes; camera angle, occlusion and measurement error matter. | Video with landmark overlay, angle-vs-crank chart, before/after comparison | Not implemented: camera/video ingestion, calibration, landmark confidence, independent accuracy assessment. [MyVeloFit](https://www.myvelofit.com/insights/bike-fitting-from-home/) describes markerless video and mobility assessment. |
| Marker-based 3D motion capture | Track anatomical markers in three axes while pedalling; use a physical assessment and rider goals alongside measurements. | Bilateral traces, knee travel, angular ranges, coordinate report | Not implemented: calibrated cameras/sensors and authorized data adapter. [Retül](https://www.retul.com/retul-fit) uses eight LED landmarks; [bikefitting.com](https://www.bikefitting.com/en/motion-analysis) describes 3D LED tracking. |
| Depth-camera 3D capture | Calibrated time-of-flight camera identifies joint markers and their trajectories. | Frontal knee paths and bilateral motion | Not implemented: depth hardware/calibration. [Velogicfit](https://velogicfit.com/), [calibration requirements](https://docs.velogicfit.com/section-03-calibration-and-measurement/calibration). |
| Inertial motion sensors | Body-mounted IMUs estimate foot, leg and pelvic motion relative to gravity. | Pelvic rocking and angle traces over time | Not implemented: IMU recordings and sensor-specific reference frames. [LEOMO manual](https://manual.leomo.io/web/type-s/en/CWVVSYgjajfoxn.html). |
| Contact-pressure mapping | Sensor mats measure load at saddle, shoes or pads during riding. | Pressure heatmaps and centre-of-pressure trace | No pressure is calculated from the mannequin. Requires sensor data; decorative heatmaps would be misleading. [gebioMized](https://gebiomized.de/EN/products). |
| Pedal-force analysis | Instrumented pedals/fit bikes measure force direction and magnitude through a crank revolution. | Force vectors, left/right balance, torque-vs-angle | Requires force/power sensor recordings. [bikefitting.com services](https://www.bikefitting.com/es/our-services). |
| Field aerodynamic testing | Combine calibrated apparent wind, speed, density, power and resistance assumptions to estimate CdA. | Repeated-run distributions and uncertainty | App imports explicit yaw/CdAx curves and conditions; no live sensor adapter. [Notio calibration](https://notio.ai/pages/quick-start). |
| Physical wind tunnel / CFD | Measure forces on rider+bike or solve flow on a prepared mesh using defined turbulence, rotating-wheel and ground conditions. | Measured force curves or solver-derived flow/pressure | App solves force/power/time from coefficients; streamlines are illustrative. No CFD solver, validated pressure field, side-force or steering-moment model. [NASA drag equation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/drag-equation/). |

## Execution order and acceptance checks

1. Correct contact geometry and controls: feet follow cranks, hands meet grips, elbows remain on pads, saddle reference is radial from BB. Verify limb lengths over a complete revolution and inspect side/front views.
2. Replace capsule-only appearance with an articulated human surface. Preserve exact IK endpoints. Add skin/suit/helmet customization. Use an explicitly licensed source, not an unlicensed web character. A generic human is not a scan or personal likeness.
3. Give the fit studio clear bike / measurements / analysis workspaces. Add sourced method guide, BDC guides and repeatable report export. Verify desktop and phone layouts, keyboard controls and no console errors.
4. Add a distinct Zipp Super-9 B1 disc option using the published external envelope, finish and branding reference. Show 28 mm minimum tubeless tire, 23 mm internal width, 30.4 mm feature-table external width, Center Lock and XDR options. Keep the specification's 30 mm rounded table value documented. Profile reconstruction is approximate; internal layup is unknown. No manufacturer-specific drag advantage without matching data. [Zipp source](https://www.sram.com/en/zipp/models/wh-sp9-tld-b1).
5. Fetch Canyon Sweden component quotes with timestamp, URL, exact/family/upgrade classification and unavailable state. Do not substitute a Paceline price for Paceline X or allocate the complete-bike price to unlisted components.
6. Export individual displayed parts as binary STL in millimetres plus a report. Preserve geometry/instances, exclude decals, state topology defects. These are display replicas; load-bearing manufacturing geometry, tolerances, layup and certification are absent.
7. Rebuild Blender + self-contained viewer, run numerical and actual-browser tests, update receipts, documentation and knowledge-hub outcome.

## Remaining completeness gaps

- True manufacturer CAD, hidden interfaces, tube-wall/layup data and independent multi-view metrology; the current high silhouette match is only a side-photo regression.
- Accurate generation-specific hardware adjustment limits, collision envelopes, clamp engagement and hose/cable travel. Preview bounds are not official allowable travel.
- Bilateral body asymmetry, pelvic rotation, functional mobility, injury/comfort history, muscle recruitment, sustainable power, contact pressure and dynamic motion measurements.
- Individually validated human morphology/scan, facial likeness, hand-grasp/cloth deformation and photoreal skin textures. A generic fitted mesh is an appearance model, not measured anatomy.
- Validated wheel+rider+bike yaw curves, turbulence effects, side force, steering moment, pressure fields, full CFD and uncertainty obtained from repeated measurements. Frontal-area search is a sensitivity model, not a proven fastest or medically appropriate position.
- Exact standalone prices for parts Canyon does not list; selected variant availability and shipping at checkout. Offline quotes are not live pricing.
- Functional 3D-print engineering: wall thickness, tolerances, fits, material strength, loads, fatigue and self-intersection repair. Fine spokes/chain/decals do not survive arbitrary miniature scales.
- Historical Canyon models and size-specific mesh adapters. The catalogue/rebuild contract exists; other generations need their own references and validation.

These gaps are tracked as dependencies, not concealed behind simulated measurements or invented prices. The current execution implements the software and visual improvements; sensor acquisition and manufacturer data remain separate work.
