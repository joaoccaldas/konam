# Visual Evidence Standard V1

Every material UI PR produces runtime screenshots and a scorecard.

## Automated facts
- horizontal overflow
- JS errors
- heavy 3D on landing
- touch-target violations
- multiple primary CTAs

These are objective and must score 100.

## Visual review dimensions
Each screenshot is then reviewed 0–100 for:
- hierarchy
- typography
- image treatment
- grid/alignment
- whitespace
- CTA clarity
- brand consistency
- ergonomics
- progressive disclosure
- reference fidelity

Do not fabricate visual scores from source code. Unreviewed fields remain null.

## Release target for a golden screen
- overall visual fidelity >= 88
- CTA clarity >= 95
- mobile ergonomics >= 95
- technical score = 100

The reference boards are art direction, not pixel-perfect Figma specifications. Review fidelity, not fake pixel-diff precision.
