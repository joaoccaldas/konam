# Rotaverk staged product roadmap and next-ten execution queue

The order reflects dependency/value, not invented delivery dates. Phase status is planned unless a PR and validated evidence prove otherwise.

## S0 Discover, reconcile, baseline
Inspect current KONA Product, assembly, GLB, catalog, renderer, identity and rights inventories; compare all other project assets/learning with no duplicate creation. Baseline catalogue counts, verified fields, tests, real device evidence and release SHA. Document ownership/aliases and versioned read projections.
**Exit:** no dual author, no lost ID, source/license owner for all pilot artifacts.

## S1 Source-backed comparison MVP
10 reviewed triathlon/TT variants spanning at least 3 manufacturers with size-specific geometry, model year/trim and 100% visible source/unknown classification. Search, responsive comparison, source attribution and graceful no-3D mode.
**Exit:** repeatable intake of bike #11 with only data changes and no brand-specific runtime branch; independent review finds zero false claims in critical fitment set.

## S2 Mechanical intelligence
One genuinely validated exploded-view demonstrator per 3 initial different model families, semantic pick, subsystem isolation, assembly relationships, official part/manual linkage, mobile/progressive LOD.
**Exit:** >=95% correct part picks in curated acceptance set; provenance + technical/visual review on physical phones; no invented service specs.

## S3 Private Garage and maintenance
Local-first ownership, part swaps, service history, owner-controlled exports, exact manufacturer document and optional explicit Strava/provider overlay. No health data in public corpus.
**Exit:** task cycle search → identify → inspect → maintenance → service record works offline and with account-free guest mode.

## S4 Moderated community
Entity-specific questions, expert flags, review queue, correction provenance, abuse management and safety triage. Never promote user speculation to facts.
**Exit:** first 50 moderated threads with measured resolution, moderation workload and abuse/safety thresholds.

## S5 Transaction readiness and marketplace
Start manufacturer/dealer outbound links and affiliate offers with transparency and freshness. Then seller listings, authenticated provenance, privacy-preserving ownership proofs, recall/stolen-device checks where legal, buyer protection, payments, compliance and disputes. No payments enabled without explicit approval.
**Exit:** legal/security/ops gates, transaction simulator and verified test seller/buyer experiences.

## S6 Industry SDK
Curated ingestion partner pipeline, licensed catalog feeds, configurable branded rooms and models, B2B analytics with aggregation/privacy rules. Expand gravel/road/MTB/e-bikes using contracts rather than forks.
**Exit:** 2 paid pilots and measured onboarding cost, user outcomes and maintenance costs.

## Priority next ten
| # | Action | Why | How / measurable acceptance |
|---|---|---|---|
| 01 | Current-state inventory & SHA | Prevent stale baseline | Confirm authorities, complete contracts, current 3D inventory |
| 02 | Distinguish variants, editions and GLBs | Counts are misleading | Run read-only catalog audit, flag duplicates and source gaps |
| 03 | ID crosswalk ADR | Preserve consumers | Design old ↔ new versioned ID map, no dual product writes |
| 04 | Source/rights registry | Reduces legal block | Source URL, date, retention permission, license and review state |
| 05 | Compare model | Immediate utility | Normalize fields, units, size, dates and missingness; tests |
| 06 | KONA assembly adapter | Reuses differentiated engine | Part graph conversion, picking and explosion parity fixture |
| 07 | 2D-first bike detail | Reduce 3D penalty | Mobile page, source/unknowns, optional lazy viewer |
| 08 | Model-specific maintenance cards | Useful ongoing reason | One exact manual + warning + part ref, no invented steps |
| 09 | Task-based user test | Validate product wedge | >=15 cyclists and 5 mechanics vs incumbents, scored correctness |
| 10 | Before/after evaluation and next queue | Prevent vanity output | Record deltas, tests, stop/defer decisions and next ten |

For every item: preserve state `PLANNED|IMPLEMENTED|TESTED|LIVE|BLOCKED` with evidence ref, owner, SHA and next action. **A PR is not a deployment.**
