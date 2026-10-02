# Kona.m

> **Race the version of yourself.**

Kona.m is a mobile-first triathlon companion for race identity, gear, race-week context, stories, challenges and optional immersive 3D exploration.

## Product proposition

Kona.m gives athletes one coherent place to:

- build a Race Self
- choose and understand their machine
- prepare for race week
- explore Kona through people, places, artifacts and stories
- collect meaningful discoveries
- enter richer 3D experiences only when they choose

The surface stays simple. The world underneath can be deep.

## What this repository contains

- Kona.m app shell: Home · Discover · Garage · Plan · Me
- local-first RaceIdentity and progression
- optional account backup/sync
- 3D museum and product inspection
- Android/PWA build paths
- Blender and procedural asset tooling
- deterministic release/security checks
- provenance-aware content and asset records

The historical Canyon Museum remains the provenance source and 3D factory. The consumer product is Kona.m.

## Start here

Current engineering/product documentation:

1. [STATUS.md](STATUS.md)
2. [Product](docs/PRODUCT.md)
3. [Architecture](docs/ARCHITECTURE.md)
4. [Data model](docs/DATA_MODEL.md)
5. [Design system](docs/DESIGN_SYSTEM.md)
6. [Security & privacy](docs/SECURITY_PRIVACY.md)
7. [Operations](docs/OPERATIONS.md)
8. [Decisions](docs/DECISIONS.md)
9. [Repository hygiene](docs/REPOSITORY_HYGIENE.md)

Historical audits and handovers are evidence, not current product truth.

## Local run

```bash
git clone https://github.com/joaoccaldas/konam.git
cd konam
npm ci --ignore-scripts --prefix web
python3 -m http.server 8744
```

Open `http://127.0.0.1:8744/`.

## Validation

```bash
npm test --prefix web
node tools/validate-bikes.mjs
node tools/repo-hygiene.mjs
node tools/build_pages.mjs
```

The committed deterministic pages must match a rebuild.

## Release model

A release is not ready because code exists.

Required evidence:

- unit/contract checks
- bike/product asset validation
- deterministic build
- release security gate
- app release seal
- real-browser/mobile evidence where applicable
- post-deploy smoke at the exact release SHA

## Architecture principle

```
Canonical entity
   ↓
Reusable experience
   ↓
Museum / Studio / RaceIdentity / Challenge / Story / Share
```

Do not create brand-specific, athlete-specific or event-specific production forks when data/configuration can express the variation.

## Public-surface boundary

Consumer UI, SEO, machine-readable discovery files and public-facing documentation contain product experience, provenance, privacy and factual capability only. Confidential company strategy is intentionally excluded.

## Privacy

Kona.m is local-first and useful without an account.

Do not commit private user data, personal correspondence, private contact data, health data, credentials, secret API keys or private race-history matches.

## License / rights

Third-party brands, trademarks, public-source media and reference material retain their respective ownership and license requirements. See provenance/source records before reuse.
