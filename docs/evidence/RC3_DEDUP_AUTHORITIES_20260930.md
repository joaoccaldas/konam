# RC3 authority deduplication — 2026-09-30

Synchronized generated head before this verification trigger:
`cb289432fdd19328ced02b0dc81fa7b7f373e8d3`.

Scope:
- consumer index no longer preloads world CSS
- world DOM is wrapped by one `#konaWorld` boundary
- world CSS loads only with 3D World
- Profile, Progression and RaceSetup persist through canonical `storage.js`
- consumer core is sole constructor/owner for Profile, Settings and KONA shell
- world runtime consumes those authorities and only registers renderer/sound effects
- install/update styling is consumer-owned
- Race Self hub styling has one source owner
- world interaction styling remains world-owned
- PWA core now seals consumer CSS; world CSS remains lazy

Deterministic sync before verification:
- canonical build: PASS
- PWA seal: PASS
- unit + asset contracts: PASS
- mobile visual matrix: PASS
- generated output sync: PASS

This evidence-only commit changes no runtime behavior. It triggers browser/release verification against the synchronized tree.

Synchronized generated head: `b18a596c71865b0eebfa1999e4d0ff72f007365b`.
This evidence-only commit triggers the full PR release gates against the synchronized RC3 tree.

Synchronized generated head: `15aa2fba5f3e7eaf9e8b4dde8033c4313ae3287f`.
Shared hidden-state ownership fixed in consumer CSS. This evidence-only commit triggers final RC3 release verification.

Final synchronized generated head: `aac95940ce34ac1697299f998164f9c04845f590`.
Shared layout reset now lives in consumer system CSS. Triggering final release gates on synchronized RC3.
