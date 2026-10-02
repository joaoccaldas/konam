# Golden Visual Contract V1

The supplied concept boards are art-direction references, not literal screenshots or Canyon parent-brand specifications.

## Golden surfaces
1. Landing
2. Onboarding
3. Reveal
4. Home
5. Discover
6. Artifact
7. Garage
8. Plan
9. Me / Passport
10. 3D WALK
11. 3D INSPECT

## Viewports
- 320 x 568
- 360 x 800
- 390 x 844
- 430 x 932
- desktop 1440 x 900
- light and dark where the surface supports both

## Automated invariants
- horizontal overflow = 0
- global mobile nav destinations = 5
- primary CTA count <= 1 per state
- touch target >= 44px for primary controls
- safe-area padding respected
- no hall.js / Three.js / GLB before explicit 3D entry
- room theme cannot redefine global navigation/button/type semantics
- Artifact hero facts <= 4
- affiliate/commission signal cannot alter ordering
- landing hero has meaningful image/content, not an empty gradient
- text contrast target WCAG AA for normal UI text

## Human design review
Automation cannot judge:
- photographic crop quality
- emotional hierarchy
- editorial rhythm
- whether the product feels premium
- whether a transition feels continuous

Every golden-surface PR therefore includes:
1. target concept crop
2. actual screenshot
3. side-by-side review
4. explicit accept/reject notes

## Visual principles
- Calm shell, alive world.
- One dominant action.
- Lava = action/selection/progress.
- Reef = information.
- Room identity comes from atmosphere/content, not global chrome.
- Photography creates place and emotion.
- Product imagery remains accurate and legible.
- Complexity appears progressively.
