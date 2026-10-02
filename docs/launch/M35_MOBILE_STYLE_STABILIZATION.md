# M3.5 Mobile Styling Stabilization

## Goal

Reduce launch risk from recurring mobile styling regressions without redesigning Kona.m or rewriting the CSS architecture.

Baseline: `main@e40817c76a5f8353eaf1eeb50987bbd5ca6decc7` (merged M3).

## What changes

- Adds an explicit stylesheet ownership / blast-radius contract.
- Prevents world CSS from taking ownership of consumer surfaces and vice versa.
- Freezes current `!important` counts as **maximum launch debt**, so specificity can only stay flat or improve.
- Adds regression tests to the normal unit suite.

## What deliberately does not change

- no CSS declarations;
- no visual design;
- no DOM;
- no JavaScript runtime;
- no routes/state/storage;
- no WebGL;
- no generated bundle;
- no dependencies.

This first stabilization step is intentionally zero-visual-delta. It turns recurring styling risk into an enforceable boundary before deleting legacy rules.

## Before / after

| Dimension | M3 baseline | M3.5 step 1 |
|---|---|---|
| Visual quality | approved M3 evidence | intentionally identical |
| Known UI bugs | M3 gates green | intentionally identical |
| CSS ownership | partly encoded in tests/comments | machine-readable complete launch contract |
| Specificity risk | 108 hall-mobile + 25 hall-web `!important` can silently grow | growth fails tests |
| Cross-surface leakage | selected boundaries tested | explicit forbidden ownership matrix |
| Runtime cost | baseline | unchanged |
| Build/deploy cost | baseline | negligible test-only increase |
| Change risk | known baseline | low; no runtime files changed |

## Next deletion round

Only after this contract is green, classify the 108 `hall-mobile.css` `!important` declarations into:
1. required isolation;
2. duplicate declaration;
3. overridden later;
4. dead selector/DOM;
5. canonical-token/component duplicate;
6. unknown.

Delete only categories 2–5 when equivalence is proven by visual evidence and interaction gates. Unknowns stay.

## Acceptance

- normal unit suite green;
- brand/style authority tests green;
- generated outputs unchanged;
- Visual Evidence V2 green at 320/360/390/430/landscape/desktop;
- screenshots show no unexplained visual delta;
- physical-device gate remains separately required.
