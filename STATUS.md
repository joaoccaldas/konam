# Kona.m Repository Status

Working status baseline for launch hardening.

## Canonical production truth

- Default branch: `main`
- Repository visibility: private during launch hardening
- Product: Kona.m, built on the Canyon Museum production factory
- Consumer proposition: **Race the version of yourself**
- Product principle: **Simple surface. Deep world underneath.**
- Runtime state remains local-first; account sync is optional
- The museum/3D world is an Explore destination, not the required landing experience

## Canonical documentation

Read these first:

1. `README.md`
2. `docs/PRODUCT.md`
3. `docs/ARCHITECTURE.md`
4. `docs/DATA_MODEL.md`
5. `docs/DESIGN_SYSTEM.md`
6. `docs/SECURITY_PRIVACY.md`
7. `docs/OPERATIONS.md`
8. `docs/DECISIONS.md`

Historical audits and superseded handovers are evidence, not current product truth.

## Release rule

A capability is READY only when:

- implementation exists
- automated or locally reproduced checks pass
- runtime/visual evidence exists where relevant
- no known P0/P1 blocker remains
- exact build state is known
- privacy/security boundaries are documented
- consumer surfaces expose no private personal identity or confidential company strategy

## Privacy rule

Do not commit or publish:

- private user information
- personal addresses, email conversations or contact lists
- health information
- credentials, private tokens or secret API keys
- private race-history matches or user profiles

Public-facing product surfaces should identify **Kona.m**, not an individual person.
