# Aero lab + rider fit (standalone)

Extracted from the Speedmax museum (`speedmax-cfr-3d`) into self-contained modules.
**Not wired into the Kona world**: `web/src/main.js` does not import anything from here.

| Module | What it does |
|---|---|
| `aero.mjs` | Pure physics: humid-air density, axial drag at apparent-wind yaw, power balance (aero + rolling + climbing / drivetrain efficiency), steady-speed solve, baseline comparison, user CdAx yaw-curve CSV import |
| `fit.mjs` | Pure fit geometry: contact-constrained pose from measured segment lengths, static BDC knee angle, hip opening, projected frontal area over the pedal cycle, saddle solver (~30° static knee), bounded cockpit search |
| `streamlines.js` | `createStreamlines()` — illustrative smoke lines deflected around bike/rider obstacle proxies (not CFD); `setYaw`, `rebuild`, `update(dt, airSpeed)` |
| `chamber.js` | `makeChamber()` — tunnel set dressing |
| `labPanel.js` | `makeLab({getCfg, setCfg, onResult, bikeMassKg, ...})` — lab UI + live HUD |
| `rider/` | `makeRider({scene, parts, onChange, flyTo, download})` — MakeHuman (CC0) skinned avatar posed from `fit.mjs`, fit studio UI; deforms saddle/cockpit parts of a bike exposing glTF `extras.part` ids |
| `aerolab.css` | Panel styles. Defines `:root` tokens and generic `.drawer`/`.check` classes: **scope them under a wrapper before embedding in another app** |

## Try it

```bash
node web/labs/build.mjs          # -> web/public/labs/aerolab.html
python3 web/serve.py             # then open http://127.0.0.1:8791/labs/aerolab.html
node tools/test_aerolab.mjs      # 11 unit tests for aero.mjs + fit.mjs
```

The harness (`web/labs/demo.js`) loads `assets/bikes/speedmax_2027_cfr.glb`, which exposes every part id the rider needs.

## Honesty limits (carried over, shown in the UI)
- Forces are calculated from supplied/assumed CdAx; the default 0.23 m² and the −0.004 m² disc delta are illustrative assumptions, not measurements. Unsupported yaw returns no result.
- Airflow lines are illustrative, not CFD.
- Fit angles are predicted static geometry, not measured motion; not a medical or professional fit.
- Avatar: MakeHuman CC0 generic anatomy, not a body scan.

## Before wiring into Kona
Scope `aerolab.css`, give `makeLab`/`makeRider` a container instead of `document.body`, and pause the world render loop while the lab is open (the audit's shared-GPU concern).
