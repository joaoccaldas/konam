# Visual Sovereignty

Kona.m already has a design system. This document governs how that system becomes the only normal way to style the product without flattening immersive or editorial character.

## Invariants

1. **One responsive product.** Mobile and desktop share components and semantics.
2. **One runtime stylesheet order.** `tools/design-system-manifest.mjs` is the executable authority. Templates and generated pages must match it exactly.
3. **Every CSS authority is classified.** `config/style-governance.json` classifies canonical, immersive, editorial, legacy-compatibility and proof-only CSS. A new CSS file fails CI until it is classified.
4. **Debt is a ratchet.** Existing `!important`, raw-color and JavaScript-style-injection debt may fall but may not silently increase.
5. **Feature CSS owns feature presentation, not global semantics.** Features may compose layout, imagery, state and motion. They may not invent a second global palette, font family, button system or navigation grammar.
6. **Legacy is explicit.** Hall/heritage compatibility CSS is allowed to exist while it is strangled region by region. Compatibility status is not permission to spread.
7. **Editorial and immersive character remains legal.** Rich art direction is not a lint failure merely because it uses visual colors. UI chrome and semantic controls still converge on shared primitives.

## Current grandfathered debt

- `web/src/passport.js` is the only approved JavaScript stylesheet injector. It is a migration target, not a precedent.
- Hall web/mobile and heritage CSS are legacy compatibility scopes.
- Promo/About are editorial scopes.
- Studio/Collection/Experiences are immersive scopes that still obey brand typography and palette-authority boundaries.

## Ratchet metrics

The brand gate reports:

- total `!important` declarations;
- total raw hexadecimal colors;
- consumer `!important` declarations;
- distinct media breakpoint values;
- numeric z-index declarations;
- raw `font-family` declarations;
- JavaScript stylesheet injectors.

Only the first three and JS injector count are blocking baselines today. The observability-only metrics become blocking after their semantic replacements are defined.

## Migration order

1. Governance with zero intended visual change.
2. Passport CSS extraction and canonical controls.
3. Studio primitive convergence and overlay/stacking semantics.
4. Responsive/container-query cleanup where parent width, not viewport width, is the real variable.
5. Hall strangler migration with visual-equivalence evidence.
6. Promo/About UI-vs-art decomposition without reducing expressive range.

A metric is not the product. Reducing a number is useful only when behavior, accessibility and brand character stay intact.
