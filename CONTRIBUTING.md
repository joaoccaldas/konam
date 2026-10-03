# Contributing to Kona.m

Kona.m scales by reducing authorities, not by adding mini-apps.

## Before coding

Run the pre-create inventory check for any new concept:

`node tools/check-before-create.mjs <kind> <name-or-id>`

Then read `docs/architecture/AUTHORITY_MAP.md`.

If an existing product, room, asset, schema, storage key or runtime capability can be reused, prefer that path.

## Pull request requirement

A PR that creates a new room, asset family, product entity, schema, storage key, runtime or shared UI primitive must state:

- what existing implementations were checked
- whether the decision is REUSE / ADAPT / RESTYLE / COMPOSE / CREATE
- why a new object is necessary if the decision is CREATE
- which canonical authority owns it after merge
- what evidence proves it is safe to promote

## Keep PRs bounded

Separate:
- architecture contracts
- content/art direction
- generated-output sync
- unrelated cleanup

Do not hide architecture changes inside a visual/content PR.

## Validation

The required checks include unit tests, authority hygiene, repository hygiene, brand authority, deterministic builds, release security, integration contracts, interaction evidence and visual evidence.

Do not weaken a validator merely to make a PR green. Fix the underlying violation or explicitly change the standard with rationale.
