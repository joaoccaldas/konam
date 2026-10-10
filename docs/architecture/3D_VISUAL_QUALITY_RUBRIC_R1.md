# 3D Visual Quality Rubric — R1

## Scoring
Each category is scored 0–5 from canonical cameras.
- 0 broken/absent
- 1 prototype
- 2 functional but visibly synthetic
- 3 good production quality
- 4 excellent
- 5 reference-class for the intended mode

## Categories
1. silhouette and proportion
2. geometry continuity / bevel quality
3. material plausibility
4. texture clarity / microdetail
5. reflection quality
6. glass / transparent-material quality where relevant
7. contact shadows and grounding
8. lighting hierarchy
9. depth / atmosphere
10. composition and camera
11. temporal stability / shimmer control
12. LOD transition invisibility
13. mobile readability
14. product macro legibility
15. scene-specific emotional/narrative coherence

## Benchmark emphasis
### NOR
Efficiency without flattening material/scene quality.

### Beast Cave
Atmosphere, lighting hierarchy, depth, narrative coherence.

### Breitling
Geometry continuity, brushed metal, sapphire/glass, dial detail, reflections, macro camera, product legibility.

### Gaudí
Architectural proportion, structural legibility, materials, daylight, urban/context integration.

### Studio-Kona
Terrain continuity, horizon stability, vegetation, speed/motion readability, weather/light coherence, LOD invisibility.

## Evidence for a visual-improvement claim
- before/after SHA
- identical camera
- identical viewport/DPR/quality tier
- still pair
- motion evidence if temporal behavior changed
- rubric delta
- performance delta
- trade-offs
- confidence

## Governing objective
Maximize perceived fidelity per millisecond and per transferred byte.