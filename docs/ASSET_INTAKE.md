# Asset Intake Contract

Purpose: let Blender/Higgsfield/other asset-production agents feed the app without duplicate work, ad-hoc loaders, or unverifiable "exact replica" claims.

## Existing inventory rule

Before creating anything, search:
- `museum/catalog/products.json`
- `museum/atlas/bikes.json`
- `museum/world/wings/*.json`
- `assets/atlas/**`
- `assets/heritage/**`
- `assets/museum/**`
- `assets/kona-years/**`
- `assets/art/**`

Do not recreate an existing asset under a new name. Reuse the existing id/path unless the new object is materially different and documented.

## Short-term priorities

### Kona / triathlon bikes
Incoming priorities currently include:
- Cervélo P5 / P5X family
- Specialized Shiv Disc
- Felt IA
- Scott Plasma
- BMC Speedmachine
- Orbea Ordu
- historic Kona-winning / iconic non-Canyon machines where evidence supports the model
- existing Trek assets must be reused rather than regenerated

### Footwear
Nike museum candidates:
- Vaporfly 4%
- Vaporfly NEXT%
- Alphafly NEXT%
- Alphafly 3

These are **equipment assets**, not bikes. They must use the same collection-item contract but a product-type-specific semantic-part contract.

## Required package for every new 3D asset

```
assets/
  brands/<brand>/<product-id>/
    model.glb
    preview.webp
    build-meta.json
museum/
  sources/<provider-or-source>/<product-id>.json
```

Until `assets/brands/` is fully adopted, existing `assets/atlas/<id>/bike.glb` paths may remain for bike studies. New product classes should prefer the brand path.

### build-meta.json

Required fields:
```json
{
  "schema_version": 1,
  "id": "stable-product-id",
  "type": "bike|helmet|wheel|shoe|trisuit",
  "brand": "Brand",
  "model": "Model",
  "representation": "reference-calibrated|geometry-study|concept",
  "source_records": ["museum/sources/...json"],
  "generator": "blender|higgsfield|manual",
  "generated_at": "ISO-8601",
  "tris": 0,
  "bytes": 0,
  "semantic_parts": [],
  "notes": ""
}
```

## Representation honesty

- **reference-calibrated**: geometry can be traced to published dimensions/reference material.
- **geometry-study**: visually representative, but geometry is not claimed to be exact.
- **concept**: speculative/future/original design.

Never promote a geometry study to an exact replica through UI copy.

## Bike semantic parts

Minimum:
`frame`, `rim`, `tyre`, `saddle`

Where present:
`disc`, `aerobar`, `basebar`, `fork`, `crank`, `chainring`, `tape`, `accent`, `bottle`, `storage`

## Shoe semantic parts

Minimum:
`upper`, `midsole`, `outsole`

Where present:
`plate`, `air_pod`, `laces`, `tongue`, `heel`, `logo_surface`

Brand marks should only be included when the source/evidence and intended use support them. The app must preserve its independent/unofficial status.

## Mobile asset budget

New assets do not earn a place in the default mobile load path merely because they exist.

Targets before inclusion:
- GLB preferably < 2 MB, strongly prefer < 1 MB for non-hero objects.
- Meshopt compression where compatible.
- WebP/KTX2 textures when useful.
- 1024 px texture ceiling by default; exceed only with a measured reason.
- No asset may increase the first interactive museum path without progressive/deferred loading.
- Every new category needs an LOD or low-cost representation plan before scaling to dozens of objects.

## Integration gate

An incoming asset becomes app content only after:
1. unique stable id confirmed;
2. provenance/source record exists;
3. representation class set;
4. semantic parts validate;
5. file-size/triangle metrics recorded;
6. catalogue entry added;
7. room/wing or Studio-only placement assigned;
8. mobile load behavior measured;
9. share card/deep-link behavior remains valid;
10. normal CI + browser sanity checks pass.

## Product placement

Every asset must serve a product loop:
- **Explore**: room/wing/history/engineering story.
- **Collect**: collection or unlock.
- **Customize**: Studio/Race Setup slot.
- **Share**: useful shareable state.

If it serves none, store it as research/reference, not runtime content.
