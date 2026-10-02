# Visual Evidence Standard V2

Every primary release is reviewed from generated screenshots and measured DOM/network evidence.

## Golden surfaces
Landing · Home · Discover · Plan · Me · Artifact · Garage · 3D WALK · 3D INSPECT.

## Viewports
320×720 · 360×780 · 390×844 · 430×932 · 1440×900.
Light and dark where supported.

## Automated blockers
- horizontal overflow
- JavaScript errors
- Three.js/hall/GLB/HDR requested on landing
- broken page language/title
- later: multiple primary actions
- later: touch target violations once legacy controls are migrated

## Human visual review
Each screenshot is evaluated for:
1. 3-second hierarchy: what is this / what matters / what next?
2. typography hierarchy and line length
3. whitespace and grouping
4. alignment/grid
5. contrast and legibility
6. one dominant action
7. image crop/focal subject
8. visual continuity with prior/next state
9. global versus room color discipline
10. content density/progressive disclosure
11. mobile safe-area/keyboard resilience
12. perceived quality and memorability

## Design benchmark principles
- familiar global navigation, distinctive content
- progressive disclosure rather than simultaneous controls
- content dominates chrome
- 44px minimum interactive target
- WCAG AA text contrast
- no hover-only critical action
- reduced-motion path
- 3D world loads only by explicit intent

## Evidence status
A visual state is not PASS because CSS exists. PASS requires the exact deployed SHA plus screenshot/runtime evidence. Physical-device states additionally require real-device evidence.
