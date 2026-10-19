# Three-hour evidence → experiment → verified outcome loop

## Current scheduling blocker (19 October 2026)
Attempt to create a new ChatGPT three-hour automation returned the **15 active-task limit**. It is NOT scheduled. No pre-existing unrelated task was disabled. Owner must free a slot or explicitly authorize another scheduler before this cadence can execute unattended.

## Proposed recurrence
`BEGIN:VEVENT\nRRULE:FREQ=HOURLY;INTERVAL=3\nEND:VEVENT` using an exact schedule in Europe/Stockholm per platform semantics.

## Each iteration
1. Read latest Rotaverk roadmap and exact previous checkpoint; inspect current KONA main and PR refs.
2. Compare current source SHA, changes, tests and production/deployed state, source rights and data drift.
3. Validate previous action's expected vs observed outcome and actual downstream consumer.
4. Inventory KONA/Canyon/Studio KONA and reusable 3D pipeline before creating artifacts.
5. Reprioritize top TEN actions by task value, reusable leverage, evidence risk, dependency and engineering cost, with **WHY/HOW** and acceptance criterion.
6. Pick the smallest unblocked high-value increment and select REUSE/ADAPT/RESTYLE/COMPOSE/CREATE; create is last.
7. Implement only scoped safe changes on isolated branch; no duplicated product, renderer, progression or storage authority.
8. Add tests and perform actual verification, source provenance, privacy and license checks; browser/mobile evidence where necessary.
9. Persist run manifest: `run_id, previous_run, timestamp, repo/head/main SHA, changed files, tests, metrics, blockers, confidence, completed, next_ten, outcome` in durable project-owned storage.
10. Report meaningful deltas, next decisions and blockers. No merge/deploy, paid action, external contacts, publish, user personal data transfer or marketplace writes without explicit approval.

Stop repeating identical reports: three no-progress runs should surface one real blocker and defer expensive scans until evidence changes.
