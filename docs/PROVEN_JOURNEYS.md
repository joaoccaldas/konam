# Proven Complete Journeys

This is the product maturity dashboard. Contracts, schemas and commits do not count as complete journeys.

| Journey | Current state | Release proof required |
|---|---|---|
| Fresh user → RaceIdentity → Home | PARTIAL | real S25 + iPhone, reload, no 3D before Discover |
| Home → Discover → Artifact | PARTIAL | canonical Artifact visible from Discover |
| Artifact → Add to Garage → reload | FAIL | Garage UI + persisted UserEquipment |
| Enter 3D → proximity → Inspect → return | PARTIAL | one canonical hall-state implementation + real phone |
| Share → friend opens → Build Yours | PARTIAL | shared link on second device + completed RaceIdentity |
| Save/sign in → relaunch | PARTIAL | magic link round-trip + state reconciliation |
| Race candidate → That's me → history | FAIL | current-main Identity Assist adapter |
| EN ↔ pt-BR complete primary journey | FAIL | after English journey is visually locked |

## Rule

A journey becomes PASS only with:
1. runtime implementation
2. automated golden-path test
3. persistence/reload proof where relevant
4. real-device evidence for mobile-facing flows
5. exact deployed SHA
