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

## M3.6 deletion batch 1

Removed consumer-entry/install selectors from `hall-mobile.css`. These selectors cannot affect first-session entry because Hall styles are lazy-loaded only by `ensureWorldShell()` when the immersive world is opened. Keeping them there created a second, delayed owner that could restyle entry DOM after world loading.

Measured source delta:
- hall-mobile.css: 16,402 → 14,233 bytes (-2,169; -13.2%)
- !important: 108 → 105 (-3)
- runtime JS/WebGL/state: unchanged
- consumer entry ownership in world CSS: removed

The visual target remains zero unexplained delta. World/mobile interaction evidence must remain green before merge.

## M3.6 cascade-fossil batches 2–3

After removing cross-surface entry ownership, the next audit traced the final mobile cascade for card, actions, rail, chips and joystick.

Only declarations superseded by the later RC5 mobile grammar under the same/broader phone/coarse-pointer conditions were removed. State transitions, landscape-only geometry, phone-fit compatibility, overflow safety and selectors without static equivalence proof were retained.

### Cumulative measured delta from M3

| Metric | M3 baseline | Current | Delta |
|---|---:|---:|---:|
| hall-mobile.css bytes | 16,402 | 12,761 | -3,641 (-22.2%) |
| lines | 254 | 204 | -50 (-19.7%) |
| !important | 108 | 98 | -10 (-9.3%) |
| media blocks | 15 | 15 | unchanged |
| runtime JS/state/WebGL | baseline | baseline | unchanged |

The unchanged media-block count is intentional: this round simplifies declarations inside the existing responsive architecture rather than changing breakpoints.

### Remaining conflict concentration

- `#card`: 23 references; highest remaining risk.
- `.chip`: 10 references.
- `#nearby` / `#tourPill`: 8 each, but no local !important debt; lower priority.
- `#rail`: 7 references.
- `#joy`: 4 references.
- map card: low conflict.

Next work should therefore stay on `#card` and its typography/state modifiers, then stop when remaining rules are breakpoint/state-distinct rather than historical duplicates.
