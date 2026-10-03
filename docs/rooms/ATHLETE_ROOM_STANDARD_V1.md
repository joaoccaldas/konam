# KONA.m Athlete Room Standard v1 — NOR // 3 application

NOR // 3 is a production-grade candidate experience, not a prototype and not a public room.

## Architecture boundary
The host owns renderer, camera, controls, navigation, responsive lifecycle, loading, culling, generic UI and typography. The experience owns geometry, materials, lighting, atmosphere, environmental story, local animation and mapped objects. No experience may create a parallel renderer, camera, design system or generic CSS layer.

## Reusable asset contract
Every reusable physical object receives a stable asset id, semantic type, source/generator, output path, provenance/rights state and reuse flag. Athlete-specific equipment remains an empty canonical host slot until evidence verifies the association. Room placement is separate from asset identity so one GLB can appear in another room, Garage, Studio, editorial scene or future Kona world.

## Spatial contract
The room is divided into Three Rails, Protocol Table, Environment Bay, Heat/Cool, Podium Vault, Fjord Relief and Kona Line. Lane identity is data, not duplicated geometry. The three lanes share a system but retain separate athlete ids, specimen slots and accessory sets.

## Visual contract
Target: cinematic documentary space, not glossy sci-fi. Wet/dark stone, smoked timber, powder-coated and brushed metal, matte rubber, low-iron glass, condensation, restrained practical light and one distant warm Kona cue. Micro-bevels, roughness variation, contact shadows, imperfect placement and signs of handling should carry realism. Avoid broad mirror-polished surfaces, saturated neon, excessive emissive materials and sterile symmetry.

## Content and pitch
Final evidence must be captured from the actual explorable branch. Generated imagery can guide art direction or act as clearly separated pitch transition material, never as proof of implementation. Athlete likeness, quotes, exact equipment, sponsor marks and protocols require source/rights review.

The pitch includes an optional invitation to review the work face-to-face in Kona and, if mutually interesting, create playful 3D/content material there. This is an invitation only and must never imply agreement, access or sponsorship.

## Release gates
1. Candidate manifests validate.
2. Blender generators produce optimized GLBs with deterministic names.
3. Assets are registered with provenance and reuse metadata.
4. Desktop and phone portrait/landscape visual evidence passes.
5. Walkability, culling, reduced-motion and WebGL recovery pass.
6. Athlete/equipment factual claims are sourced.
7. Rights review is complete.
8. Only then may a separate release PR register the room in public navigation.
