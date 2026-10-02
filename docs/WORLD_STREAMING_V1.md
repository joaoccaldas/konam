# World Streaming Contract V1

Invariant:

> Nothing expensive loads because the catalog knows it exists. It loads because the user is likely to see or interact with it next.

Priority combines:
- distance
- frustum/visibility
- facing direction
- current room
- explicit inspect/navigation intent
- asset transfer/decode cost
- device budget

Distance thresholds are defaults, not product truth.

LOD states:
none → proxy → museum → hero → engineering

Engineering is explicit-intent only.

Release:
leaving a room starts a cooldown. Distant unused resources are explicitly disposed and references released so mobile browsers can reclaim GPU memory.

Compression:
Do not mandate Draco globally. Benchmark meshopt/Draco/KTX2 per asset family against transfer bytes, decode time, GPU memory and visual fidelity.

Initial performance budgets are hypotheses to measure, not guarantees.
