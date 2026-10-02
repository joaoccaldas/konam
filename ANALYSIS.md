# Canyon 3D Museum: Codebase Architecture Map, Audit & Reusable Template Blueprint

## 1. Executive Summary & Live Service Discovery

- **Live Service Location:** Serving on `http://127.0.0.1:8744/`
- **Host Process:** Python 3.9 `http.server` (PID: 57589)
- **Project Root:** `~/Developer/speedmax-cfr-3d`
- **Key Accessible Endpoints:**
  - `http://127.0.0.1:8744/Canyon_Collection.html` — Chronological collection hub featuring all 6 modeled exhibits and historical cards (1999–2027).
  - `http://127.0.0.1:8744/Speedmax_Museum.html` — Flagship Speedmax CFR AXS (MY2027) 3D interactive exhibit (Aero Lab, Paint Studio, Rider Fit, Exploded view).
  - `http://127.0.0.1:8744/Speedmax_SLX_Museum.html` — Speedmax CF SLX 8 Di2 (MY2027) exhibit.
  - `http://127.0.0.1:8744/Speedmax_Three_2005_Museum.html` — Speedmax Three (MY2005) heritage exhibit.
  - `http://127.0.0.1:8744/Speedmax_2007_Museum.html` — Speedmax 3.0 (MY2007) heritage exhibit.
  - `http://127.0.0.1:8744/Speedmax_AL_2011_Museum.html` — Speedmax AL 9.0 (MY2011) heritage exhibit.
  - `http://127.0.0.1:8744/Speedmax_CF_2011_Museum.html` — Speedmax CF 9.0 Pro (MY2011) heritage exhibit.

---

## 2. System Architecture & Codebase Map

The project is structured into two parallel evolutionary pipelines plus a catalog aggregator:

```
speedmax-cfr-3d/
├── museum/                           # Data Schemas & Declarative Manifests
│   ├── bike.schema.json              # JSON Schema for bike manifests
│   ├── catalog.json                  # Collection registry (lineage, metadata, status)
│   ├── bikes/                        # Per-bike manifests (CFR, SLX, 2005, 2007, 2011)
│   ├── specs-*.json                  # Primary source specifications & geometry tables
│   └── viewer-*.json                 # Frontend presentation profiles & UI copy
│
├── blender/                          # Procedural 3D Modeling & Rendering
│   ├── lib.py                        # Common geometry primitives (box, lathe, tube, bvh)
│   ├── frame.py / photo_model.py     # Aero carbon frame/fork voxel remesher
│   ├── components.py / cockpit.py    # Drivetrain, wheels, calipers, bars, hydration
│   ├── decals.py / extract_graphics  # Surface ray-projected geometry decals
│   ├── museum_scene.py / render.py   # Studio lighting rig & Cycles photo rendering
│   ├── export_game.py                # LOD0/LOD1/LOD2 generation & FBX/GLB game export
│   ├── heritage_build.py             # Profile-driven tube/joint builder for heritage bikes
│   ├── heritage_validate.py          # Geometric sanity checks (manifold, watertight)
│   └── data/ & data-slx/ & heritage/ # Traced station points, masks, calibrated offsets
│
├── tools/                            # Build Automation & Verification CLI
│   ├── build_museum.py               # Modern exhibit build pipeline runner
│   ├── build_heritage.py             # Declarative heritage build pipeline runner
│   ├── build_collection.mjs          # Hub compiler (generates Canyon_Collection.html)
│   ├── heritage_calibrate.py         # RANSAC circle fitting for photo scale & axles
│   ├── heritage_trace.py             # Contour & tube centerline extraction
│   └── compare_silhouette.py         # 2D ROI silhouette IoU regression testing
│
├── web/                              # Three.js Interactive Web Viewers
│   ├── package.json                  # Node dependencies (Three.js, esbuild, gltf-transform)
│   ├── build.mjs                     # esbuild bundler for modern viewer (inlines GLB)
│   ├── build_heritage.mjs            # esbuild bundler for heritage viewer (inlines GLB)
│   ├── index.template.html           # Modern exhibit single-file HTML shell
│   ├── heritage.template.html        # Heritage exhibit single-file HTML shell
│   ├── collection.template.html      # Collection hub HTML shell
│   ├── src/
│   │   ├── main.js                   # Modern viewer runtime (Aero, Paint, Tour, Ride)
│   │   ├── heritage.js               # Heritage viewer runtime (Evidence, Specs, Orbit)
│   │   ├── aeroviz.js / lab.js       # Virtual wind tunnel & aerodynamic simulations
│   │   ├── rider.js / fit.mjs        # Inverse kinematics (IK) rider mannequin posing
│   │   ├── paint.js / tex.js         # Procedural shaders, carbon weave, paint studio
│   │   ├── wheels.js / workshop.js   # Wheel configurations & STL 3D-print generator
│   │   └── data.js / specs.js        # Hardcoded and injected bike specs & geometry
│   └── test/                         # Node test runner suite (16 tests, all passing)
│
└── assets/                           # Source references, logs, outputs, and master .blend files
```

---

## 3. End-to-End Asset Creation & Rendering Pipeline

### Pipeline Mechanics:
1. **Calibration:** `tools/heritage_calibrate.py` uses NumPy and SciPy RANSAC to detect wheel rims from the photo. Because bead diameter (622 mm) plus tyre height is known from standards (ISO 5775 / ETRTO), the pixel radius directly computes `mm_per_px` without guessing bike dimensions.
2. **Procedural Assembly:** Instead of manual polygon modeling in a GUI, the bike is constructed programmatically:
   - Modern: 2D side masks are extruded, combined with steer/seat profiles, and remeshed with OpenVDB voxels (`VOX = 0.0011m`).
   - Heritage: Centerline tube joints are lofted with true aerodynamic or round profiles.
3. **Ray-Projected Graphics:** Canyon wordmarks and logos are generated as 3D text in Blender, aligned with the frame vectors, and ray-projected onto the curved frame surface using BVH trees (`DC.bvh_of(frame)`).
4. **Compression:** Raw Blender glTF exports (~8–12 MB) are run through `@gltf-transform/cli` with `meshopt` vertex/index compression, reducing sizes to ~1.5 MB without destroying geometry.
5. **Standalone Monolithic Artifact:** The compressed binary GLB is converted to Base64 and embedded into the HTML alongside minified Three.js code, making the output completely offline, portable, and immune to CORS issues.

---

## 4. Dependencies & Runtime Environment Evaluation

| Ecosystem | Dependency | Version | Role / Criticality | Assessment |
|---|---|---|---|---|
| **Python** | `numpy` | `2.0.2` | Matrix transforms, circle fitting, array ops | Essential, fast, modern |
| **Python** | `scipy` | `1.13.1` | RANSAC least squares, image morphology (`ndi`) | Essential for calibration |
| **Python** | `Pillow` | `11.3.0` | Image loading, masking, thumbnail generation | Lightweight, robust |
| **Python** | `beautifulsoup4`| `4.14.3` | HTML scraping of manufacturer spec archives | Used for ingestion |
| **System** | `Blender` | `5.2.2 LTS` | Procedural modeling, VDB remesh, Cycles | Core engine, headless CLI |
| **System** | `Google Chrome` | Stable | Puppeteer automated screenshots & smoke tests | QA harness |
| **Node.js**| `three` | `^0.186.1`| WebGL 3D rendering, PBR materials, OrbitControls | Excellent standard choice |
| **Node.js**| `esbuild` | `^0.28.2` | Sub-millisecond JS bundling and minification | Extremely fast |
| **Node.js**| `@gltf-transform/cli` | `^4.5.0` | glTF optimization, meshopt compression | Critical for low file size |
| **Node.js**| `meshoptimizer`| `^1.3.0` | Browser-side meshopt decompression WASM | Essential for GLTFLoader |
| **Node.js**| `puppeteer-core` | `^25.12.0` | Headless verification, screenshot regression | Robust browser testing |

---

## 5. Comprehensive Audit: Inefficiencies, Duplication & Technical Debt

### 1. Bifurcated Build Pipelines
- **Issue:** There are two separate build runners: `tools/build_museum.py` (hardcoded for modern bikes) and `tools/build_heritage.py` (manifest-driven for heritage bikes).
- **Impact:** Duplicated logic for checking hashes, running gltf-transform, generating receipts, and handling Blender subprocesses. Maintenance requires patching both scripts.

### 2. Brittle String Replacement in `web/build.mjs`
- **Issue:** In `web/build.mjs`, the SLX model is supported by running 15 chained `.replaceAll()` calls on `index.template.html` (e.g. `template.replaceAll('Speedmax<br>CFR AXS', 'Speedmax<br>CF SLX 8 Di2')`).
- **Impact:** Extremely fragile. Any typographic edit to `index.template.html` silently breaks the replacement, causing mismatched specifications in the SLX exhibit.

### 3. Monolithic Base64 Bundle Bloat
- **Issue:** Output exhibits are 5.4 MB – 6.4 MB because everything (Three.js bundle, compressed GLB, embedded avatar JSON `avatar-data.json` at 1.18 MB) is Base64 encoded into a single string.
- **Impact:**
  - Base64 encoding adds a ~33% size penalty on top of the binary GLB.
  - The browser must parse multi-megabyte HTML before rendering the first frame.
  - Modern exhibits bundle unused features (e.g., full rider IK mesh data and wind tunnel chamber) even if the user is just browsing the bike.

### 4. Code Duplication in Viewers (`main.js` vs `heritage.js`)
- **Issue:** `web/src/main.js` (840 lines) and `web/src/heritage.js` (209 lines) independently implement:
  - Renderer initialization (SRGBColorSpace, AgXToneMapping, PCFSoftShadowMap)
  - Camera & OrbitControls configuration
  - Environment map generation via `PMREMGenerator` and `RoomEnvironment`
  - Exploded view calculations (`B2T` coordinate conversion)
  - Resize handling and view offset calculations
- **Impact:** Inconsistent visual styling (heritage uses dark `#10151b` background with fog, while modern uses light museum floor). Fixes applied to one viewer are missing in the other.

### 5. Hardcoded Environmental Paths & Executables
- **Issue:** Scripts contain hardcoded paths:
  - `/Applications/Blender.app/Contents/MacOS/Blender`
  - `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
  - Port `8744` and `8731` hardcoded across smoke scripts (`_w.mjs`, `_z.mjs`, `workshop-smoke.mjs`)
- **Impact:** Fails in CI/CD containers or on Linux/Windows workstations without manual edits.

---

## 6. Target Template Architecture ("Brand Museum Engine")

To convert this repository into a universally applicable **"Brand Museum Engine"** (usable for Specialized, Trek, Cervélo, Colnago, Porsche, etc.), the architecture should be refactored into modular layers:

```
brand-museum-engine/
├── core/                             # Shared Engine (Framework)
│   ├── python/
│   │   ├── calibrate.py              # Generic RANSAC circle/ellipse scale estimator
│   │   ├── pipeline.py               # Single manifest-driven build orchestrator
│   │   ├── validator.py              # Geometric & silhouette QA engine
│   │   └── blender/
│   │       ├── primitives.py         # Tube lofting, aero foils, remeshing
│   │       ├── materials.py          # Unified PBR material library (metals, carbon, clearcoat)
│   │       ├── decaling.py           # Universal ray-cast UV/geometry projector
│   │       └── studio.py             # Reusable lighting rigs, cameras & Cycles renderer
│   │
│   └── web/
│       ├── core/                     # Shared Three.js viewer kernel
│       │   ├── scene.js              # Lighting, shadows, tone mapping, canvas resize
│       │   ├── controls.js           # Camera transitions, orbit limits, focus target
│       │   ├── loader.js             # GLTF loader, meshopt decode, progress bar
│       │   └── exploded.js           # Semantic part picking, explode vectors, isolation
│       ├── plugins/                  # Optional feature modules
│       │   ├── aero/                 # Wind tunnel, streamlines, CdA calculations
│       │   ├── fit/                  # Rider mannequin, contact points, IK solver
│       │   ├── paint/                # Livery customizer, decal swapper, finish selector
│       │   └── print/                # STL geometry extraction & zip packager
│       └── templates/
│           ├── exhibit.template.html # Clean declarative HTML template
│           └── catalog.template.html # Collection overview timeline template
│
└── exhibits/                         # Project-Specific Data (e.g. Canyon, Specialized)
    ├── brand.config.json             # Brand metadata, global palette, era milestones
    ├── catalog.json                  # Model list, lineage, status
    └── models/
        ├── <model-id>/
        │   ├── manifest.json         # Complete spec, sources, geometry, adapter config
        │   ├── reference.png         # Calibrated high-res photo
        │   ├── stations.json         # Traced profile points
        │   └── profile.json          # Calibrated scales and component selections
```
