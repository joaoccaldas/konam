# Adaptive frame-budget experiment R0
2026-10-23. Contract and tests only. NO production integration and NO claim of lag-free performance.

## Existing authority
`web/src/render/renderer.js` is the canonical renderer constructor and lifecycle. `config/renderer-authority-v1.json` controls migrations. This module exports only a pure policy object, cannot create another WebGLRenderer, and is opt-in.

## Why
Three.js explicitly warns against unrestricted devicePixelRatio on expensive scenes: https://threejs.org/manual/pages/responsive.html
Khronos glTF asset creation guidance: https://www.khronos.org/blog/introducing-asset-creation-guidelines-2.0-siggraph-2025
GPU instancing/culling tradeoffs: https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Vendor/EXT_mesh_gpu_instancing/README.md

## Hypothesis
Adaptive internal resolution with p95-based hysteresis and a framebuffer pixel-count cap can lower render-time pressure on constrained devices while preserving sharp UI overlays (which stay CSS/native). Policy alone cannot solve draw calls, shader bottlenecks, upload stalls or thermal throttling. Frame intervals are NOT GPU timestamps and may include scheduling/CPU effects.

## Design
- Observe bounded active-frame durations; ignore invalid >1000ms or nonpositive values.
- Nearest-rank p95 over a fixed sample window: sort ascending and take rank `ceil(0.95 * N)` (one-based). Slower frames reduce resolution in 0.10 increments; sufficiently fast frames recover in 0.05 increments.
- For 20 frames, rank 19 means one slow frame is excluded, but two slow frames affect p95. This is a percentile policy, not a maximum-stall detector; report severe stalls separately in device benchmarks.
- Cooldown prevents rapid oscillation; floor and ceiling prevent runaway degradation.
- Hard cap framebuffer pixel count to protect high-DPR screens. Caller must use `setSize` appropriately for its scene.
- Never apply to production automatically. No analytics/collection, no background service, no new renderer.

## Acceptance before enabling
1. Run `node --test web/test/frame-budget.test.mjs` and repo full `npm test`.
2. Record pinned SHAs and devices: physical low/midrange Android, iOS Safari, desktop integrated and discrete GPUs. Include portrait and landscape, battery/thermal state.
3. A/B a control scene at matched camera paths, content and timings; record CPU/GPU frame time where supported, FPS distribution, p95, dropped frames, device memory, battery, initial render bytes and visual similarity.
4. Compare readability of labels, thin geometry, temporal flicker, interactions and accessible 2D fallback. Reject if user task completion/visual quality degrades.
5. Simulate 4x assets, large instance counts, WebGL context lost/restored, resize, background/foreground, slow network and missing textures.
6. If supported, experiment separately with instance-batching, KTX2+meshopt, LOD/HLOD and spatial streaming; do not conflate network/CPU/GPU bottlenecks.

## Cross-project learning
If benchmarks succeed, adapt the policy through each application's *existing* rendering lifecycle only; avoid copying a new renderer. Record accepted/rejected hypothesis under the existing company learning system. Greatlinq T.2 compatibility remains unknown and unrelated to this experiment.

## Known risks
Dynamic DPR adjustments may resize buffers and trigger expensive reallocation; avoid switching on every frame. Fast frames after a transient stall can lead to premature upscaling; tune thresholds with device measurements. Pixel-count caps cannot constrain GPU memory from large textures/models. Visual tests required.
