# Canyon 3D Museum: Operations & Handover Guide

This document provides developer handover notes, operational instructions, and procedures for maintaining and extending the Canyon 3D Museum.

---

## 1. Local Serving & Inspection

The museum is configured as self-contained offline HTML artifacts served via Python's built-in HTTP server.

```bash
# Start local development server on port 8744
cd ~/Developer/speedmax-cfr-3d
python3 -m http.server 8744
```

### Key Exhibit URLs:
- **Collection Hub:** `http://127.0.0.1:8744/Canyon_Collection.html`
- **Speedmax CFR AXS (MY2027):** `http://127.0.0.1:8744/Speedmax_Museum.html`
- **Speedmax CF SLX 8 Di2 (MY2027):** `http://127.0.0.1:8744/Speedmax_SLX_Museum.html`
- **Speedmax Three (MY2005):** `http://127.0.0.1:8744/Speedmax_Three_2005_Museum.html`
- **Speedmax 3.0 (MY2007):** `http://127.0.0.1:8744/Speedmax_2007_Museum.html`
- **Speedmax AL 9.0 (MY2011):** `http://127.0.0.1:8744/Speedmax_AL_2011_Museum.html`
- **Speedmax CF 9.0 Pro (MY2011):** `http://127.0.0.1:8744/Speedmax_CF_2011_Museum.html`

---

## 2. Environment Prerequisites

- **macOS** (tested on Darwin ARM64 / Apple Silicon)
- **Blender:** 4.x or 5.2.2+ LTS installed in `/Applications/Blender.app` or accessible via `PATH`
- **Python:** 3.9+ with virtual environment
- **Node.js:** v20+ with npm

### Setup Dependencies:
```bash
# Python dependencies
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-museum.txt

# Node dependencies
cd web
npm ci
cd ..
```

---

## 3. Rebuilding Exhibits from Scratch

### Modern Exhibits (CFR & SLX):
```bash
# Build flagship CFR AXS
python3 tools/build_museum.py --manifest museum/bikes/canyon-speedmax-cfr-axs-my2027-m.json --lods

# Build SLX 8 Di2
python3 tools/build_museum.py --manifest museum/bikes/canyon-speedmax-slx-8-di2-my2027-m.json --lods
```

### Heritage Exhibits (Profile-Driven):
```bash
# Build any heritage exhibit by manifest
python3 tools/build_heritage.py museum/bikes/canyon-speedmax-three-my2005.json
python3 tools/build_heritage.py museum/bikes/canyon-speedmax-3-0-my2007.json
python3 tools/build_heritage.py museum/bikes/canyon-speedmax-al-9-my2011.json
python3 tools/build_heritage.py museum/bikes/canyon-speedmax-cf-9-pro-my2011.json
```

### Recompile the Museum Collection Hub:
```bash
node tools/build_collection.mjs
```

---

## 4. Verification & QA Commands

Before pushing or shipping any changes, execute the full test and smoke check matrix:

```bash
# 1. Run Web unit tests (physics, aero solver, IK math, STL export)
node --test web/test/*.test.mjs

# 2. Run Smoke test for flagship museum viewer
node web/smoke.mjs

# 3. Run Heritage exhibits smoke test
node web/heritage-smoke.mjs
```

---

## 5. Adding a New Bike Generation

Follow the strict evidentiary protocol outlined in `docs/MUSEUM_WORKFLOW.md`:
1. Find primary manufacturer references (Wayback Machine catalogue or launch photos ≥ 1200 px).
2. Create manifest in `museum/bikes/<brand>-<model>-<year>.json` following `museum/bike.schema.json`.
3. Run `python tools/heritage_calibrate.py <profile.json>` to compute pixel scale and wheel centers.
4. Define profile tube coordinates and component specs in `blender/heritage/<model>/profile.json`.
5. Run `python tools/build_heritage.py <manifest.json>`.
6. Inspect generated `assets/heritage/<model>/overlay_revised.png` to confirm silhouette IoU regression passes.
7. Update `museum/catalog.json` from `not-modelled` to `reference-study`.
8. Recompile collection with `node tools/build_collection.mjs`.
