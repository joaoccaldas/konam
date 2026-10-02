# Prompt: build a reference-backed 3D museum for one bicycle brand

Copy everything below the line into a new agent session. Replace the three
placeholders in the first section. Nothing else needs editing.

---

## Your task

Build a 3D museum for **<BRAND>**, covering its **<CATEGORY, e.g. triathlon / time-trial>** bikes.
Work in **<REPO PATH>**. If that folder is new, copy the pipeline from the reference
implementation at `~/Developer/speedmax-cfr-3d`; don't start from scratch.

The museum has one collection page showing every generation in date order. Each modelled
bike links to its own interactive 3D viewer page. Bikes you can't yet model still appear as
cards clearly marked "not modelled". Deliver the **five oldest generations that can be
modelled from primary sources**, and list every older generation you found.

Work carefully and honestly. A museum that invents a bike is worse than a museum with a gap.

## Reference implementation (read before writing anything)

In `~/Developer/speedmax-cfr-3d`, read these completely:

- `docs/MUSEUM_WORKFLOW.md`: pipeline, contracts, confidence rules, checklist.
- `museum/bike.schema.json`, `museum/catalog.json`, `museum/bikes/*.json`: manifest and catalog formats.
- `tools/build_museum.py`: fail-fast build runner. It checks reference hashes, then runs
  photo → graphics → Blender build → validate → silhouette → GLB optimise → viewer → renders.
- `blender/build.py`, `blender/photo_frame.py`, `blender/photo_model.py`, `blender/slx_adapter.py`,
  `blender/components.py`, `blender/cockpit.py`, `blender/validate_asset.py`, `tools/compare_silhouette.py`.
- `tools/build_collection.mjs`, `web/src/collection.js`: the collection page.

Known limitations of the reference that you must fix, not copy:

1. `tools/build_museum.py` is hard-wired to two bikes (a single `SLX` boolean picks the output
   folder, data folder, reference photo and adapter). Before adding a third bike, make it
   read all of these from the manifest, e.g. a `pipeline` block with `out_dir`, `data_dir`,
   `reference`, `adapter_module`, `calibration`. Adding a bike must never mean adding another `if`.
2. `blender/photo_frame.py` hard-codes pixel windows, expects a transparent PNG and finds the
   frame by bright paint. That only works for one photo. Older bikes (dark frames, dark or white
   studio backgrounds, round tubes) need their own segmentation and calibration per generation.
3. `blender/build.py` hard-codes model name, year, geometry and gear in `root_meta`, and the
   master `.blend` filename. Read them from the manifest and spec record.
4. `web/workshop-smoke.mjs` only loads one viewer HTML. Parameterise it so every viewer is checked.
5. `catalog.json` uses `status: "not-modelled"`, but `bike.schema.json` doesn't allow that value.
   Add it to the schema.

## Phase 1: establish the lineage from primary sources

Goal: a dated, sourced list of every generation, oldest first.

- **Generation, not trim.** A generation is a distinct frame (new tube shapes or geometry).
  Trims (e.g. 1.0/2.0/3.0, 8/9, Di2/AXS) share a frame. A sibling frame sold the same years
  (e.g. an aluminium and a carbon version, or a UCI TT variant) is its own generation.
- **Primary sources first:** the manufacturer's own past websites and catalogues. Use the
  Wayback Machine's CDX API to find them:
  `https://web.archive.org/cdx/search/cdx?url=<domain>&matchType=domain&from=<Y>&to=<Y>&filter=statuscode:200&filter=urlkey:.*(<keywords>).*&collapse=urlkey&fl=timestamp,original,length`.
  Fetch raw captures with `https://web.archive.org/web/<timestamp>id_/<url>`. The CDX API
  often returns 504; retry with backoff and narrower prefixes. Check every regional domain
  (e.g. `.de` as well as `.com`) and the brand's pre-rename company name. Search years well
  before the brand's current marketing history; official "history" pages and press articles
  routinely get the first year wrong.
- **Secondary sources** (magazine reviews, Wikipedia, forums) may only corroborate or give
  leads. When they contradict an archived manufacturer page, the manufacturer page wins, and
  you record the conflict.
- For each generation, record: name(s) used, first and last model year seen, material, trims,
  sponsored riders/teams if the page states them, and the exact geometry table if one is archived.
  If two eras publish identical geometry but the photos show different tube shapes, they're
  different generations. Note it.
- Save each source page and write its URL, capture timestamp and SHA-256 to a sources file.
  Keep the originals unchanged.

## Phase 2: decide what is buildable

A generation is buildable only when you have:

- at least one clean, near-orthogonal **side-on photo** from the manufacturer, ideally ≥1500 px
  wide. 600–800 px is usable at lower confidence; below that, don't model it.
- a **geometry table** or enough published dimensions to set scale and check the result.
- a **component list** (groupset, wheels, cockpit, seatpost, saddle) from the manufacturer.

For each photo, find the biggest version the site ever served. Old sites often kept a large
"wallpaper" or "zoom" image beside the thumbnail, so list every file in that image folder.

The five exhibits are the five oldest buildable generations. Every older unbuildable one gets
a catalog card with `status: "not-modelled"`, its dates, sources, and the reason
(e.g. "no archived photo larger than 150 px").

**Stop and report before building** if you find fewer than five buildable generations, or if
the lineage is ambiguous (e.g. whether a sibling frame counts). Give the user the full list and
your proposed five.

## Phase 3: one manifest and one adapter per generation

For each bike:

1. `museum/bikes/<brand>-<model>-<myYYYY>-<size>.json` follows the schema. Include `model_year`
   and `launch_year` separately, the photographed size (see calibration below), finish, every
   reference with `path`, `url`, `role`, `sha256`, and an honest `uncertainties` list.
2. A spec record (`museum/specs-<key>.json`) holds components and geometry exactly as published,
   including where sources disagree. Never fix a conflict by editing one side. Keep both and
   record which you used and why.
3. A **unique `reconstruction_adapter`** string and module. Never reuse another bike's pixel
   regions, calibration, traced outlines or component builders without an explicit, documented
   decision inside that adapter.

### Calibration

- Scale from the wheels: fit ellipses/circles to both tyre outlines. Tyre outer diameter is
  known from the stated wheel size and tyre width (700c ≈ 622 mm bead + 2 × tyre height).
- Use the axle-to-axle distance at that scale to identify which frame size was photographed,
  by comparing it to each size's wheelbase in the geometry table. Record the match and its
  residual. If no size matches within ~1%, say so. Don't assume the size.
- Place the BB from the published chainstay and BB drop. Then check where the crank spindle
  appears in the photo, and record the pixel residual.
- Write all fitted numbers and residuals to `calibration.json`.

### Frame reconstruction

- Aero carbon frames can be extruded from the photo silhouette, as the reference does.
- Round or simple-profile tube frames (most pre-2010 aluminium) are better rebuilt as tubes
  between traced joints (head-tube top/bottom, seat cluster, BB, dropouts). Give each tube a
  published or measured cross-section, and curve it where the photo shows a bend.
- Anything you can't see from the side (tube widths, stay spread, fork crown width, hub spacing)
  is **inferred**. Use period-standard values (e.g. 130 mm rear spacing for rim-brake road/tri,
  100 mm front) and list them in `uncertainties`.

### Components must match the era

Build what the manufacturer lists for that year, not modern parts: rim-brake calipers instead
of disc rotors, external cables, round seatposts, bullhorn base bars with clip-on extensions and
bar-end shifters, 9/10-speed cassettes, disc or box-section wheels. Add period component builders
to the shared library; don't edit the modern ones.

## Phase 4: validate each bike (all must pass before its card links to a viewer)

1. Reference hashes verify (`build_museum.py` refuses to run otherwise).
2. The full build runs with no errors or Blender tracebacks.
3. `validate_asset.py` reports no issues: finite, manifold meshes; wheelbase, chainstay, BB drop
   and axle alignment within tolerance of the manifest; drivetrain parts centred on their axles.
4. The silhouette comparison runs against that bike's own photo, and the report plus overlay
   image are saved. It's a regression check against the source mask, not proof of 3D accuracy.
   Never call it an accuracy percentage.
5. Node unit tests pass.
6. The browser smoke check passes for that bike's viewer at 390 px and 1512 px wide: no page
   errors, no horizontal overflow, the model is visible.
7. **Look at the renders and a real browser screenshot yourself.** Orbit around the bike. A
   completed export isn't visual validation.

Only then set the catalog entry to `reference-study`, and regenerate the collection page from
the catalog.

## Phase 5: the museum page

- One collection page, generations in date order, each card showing years, material, the
  generation's distinguishing feature, its status, and a link to its own viewer if modelled.
- Each modelled bike's viewer has its own profile (name, years, size, specs, sources, stated
  uncertainties), the same way the reference has `museum/viewer-<key>.json`.
- Card text only uses facts from the sources. Unknowns say "not published", never a guess.

## Documentation and honesty rules

- Update `docs/MUSEUM_WORKFLOW.md` (or the brand's equivalent) in the same session as the code:
  lineage table with sources, per-generation adapter notes, known data conflicts, rebuild commands.
- **Check every sentence of the docs against the code before you finish.** Claims about thresholds,
  flags, file outputs and what a script checks must match the source. Quote real numbers
  (e.g. "16 tests, as of <date>"), not "all green".
- Keep three things separate everywhere: **published dimensions**, **photo-derived shape**,
  **inferred geometry**.
- Never publish, upload or send anything off the machine without asking. Keep original files;
  use `trash`, not `rm`. If the repo has no commits, say so before large edits and offer an
  initial commit.

## Final report to the user

1. The full lineage table: generation, years, material, sources, buildable yes/no and why.
2. The five modelled bikes: validation results per check, silhouette numbers, calibration
   residuals, identified frame size, main uncertainties.
3. What's still missing, and what source would close each gap.
4. Commands to rebuild everything from scratch.
