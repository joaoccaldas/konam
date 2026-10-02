# Product Representation Contract V1

A Product is one canonical object. Rendering representations are replaceable views of it.

Product
- stable product_id
- facts / provenance / compatibility / commerce

Representations
- proxy: silhouette / distant object
- museum: low-cost walkable-world asset
- hero: close inspection asset
- engineering: customization/exploded/detail asset

Rules:
1. Do not create separate Product records for low/high detail.
2. Preserve silhouette, proportions, recognizable paint and major components in museum representation.
3. Hidden/internal geometry may be removed from museum assets.
4. Engineering representation loads only on explicit inspect/customize intent.
5. A representation swap must preserve product identity, camera intent and user state.
6. Dispose replaced/distant GPU resources according to World Streaming V1.
7. Fidelity is judged at intended viewing distance, not by raw polygon count.

Suggested starting budgets are hypotheses:
- museum: ~0.6–1.5 MB compressed depending on device
- hero: ~1.5–4 MB
- engineering: up to ~4–12 MB only on explicit intent

Measure transfer, decode time, GPU memory, draw calls and perceptual fidelity before locking budgets.
