# Offline texture bake experiment (Greatlinq-3D-BENCHMARK-001)

**Candidate only. Not approved for production.** Uses Node built-ins and does not modify existing KONA material functions or loading paths.

## Existing authorities

- `web/src/engine/textures.js`: existing procedural canvas basalt, travertine, marble and gallery overlays.
- `docs/ASSET_INTAKE.md`: existing rights, representation and mobile asset budgets.
- `docs/CALDAS_EVIDENCE_METRICS.md`: canonical performance evidence/claims.
- `skills/konam-room-studio/SKILL.md`: reuse-first workflow.

Before promotion run `node tools/check-before-create.mjs asset basalt`, inspect original materials, and get visual, rights, performance and device gates. This is an **offline bake option**, not a claim of better visual quality.

## Usage

```sh
node tools/texture-bake.mjs basalt 256 7 /tmp/basalt.png
node tools/texture-bake.mjs travertine 512 7 /tmp/travertine.png
node tools/texture-bake.mjs brushed-metal 256 7 /tmp/metal.png
node --test web/test/texture-bake.test.mjs
```

Formats: RGBA PNG, power-of-two dimensions 32-1024. Seed is uint32. Textures are reproducibly generated from periodic noise. **Seamlessness is a mathematical periodic-noise design property, not yet an independently rendered tile-seam visual pass**. PNG color channels are sRGB-ready albedo studies; these are *not* full PBR maps (normal/roughness/metalness have not been validated). Brushed-metal is a stylized color study, not a physically calibrated metal material.

## Recorded local execution (2026-10-23, standalone prototype)

Node test run: **3 test groups passed**, 0 failed; total reported 119.14ms in the isolated container. Tested input validation, deterministic bytes, non-flat output, opaque alpha, PNG DEFLATE decoding, and seed variance. This reflects the local prototype prior to GitHub transfer, **not GitHub CI**.

Sample `basalt 256 7`: **68,104 PNG bytes**, SHA256 `1bf348a2590fd204161a65f94935e025e30da77ea0054167bc546f96e92ce0de`, mean RGB 65.0933. These are single-run sample facts, not comparative savings or visual quality scores.

**Not measured:** build-to-render pipeline, texture GPU allocation, draw calls, FPS, comparative output against the current canvas textures, token usage, subjective appearance, material correctness, device thermal behavior, production acceptance.

## Promotion gates

1. Validate code with exact branch SHA and `node --test`.
2. Generate pinned 128/256/512 samples for each material; inspect visual tiling in real renderer.
3. Compare equivalent source/target materials under identical lighting, camera and hardware.
4. Capture PNG/web-ready output bytes, GPU texture estimate, upload time, FPS/frame timings with `docs/CALDAS_EVIDENCE_METRICS.md` receipts.
5. Confirm color-space correctness and format/rights policy.
6. Approve material quality independently; only then integrate into a renderer with a small rollback-capable PR.

No quality, latency or token improvement is claimed without matched runs.
