# KONA · Caldas Studio

> **Race the version of yourself.**  
> KONA is a mobile-first triathlon race-week, identity, gear, story and challenge platform built on the Canyon Museum 3D production factory.

## What this repository contains

- KONA app shell: Now · Explore · Setup · Plan · Me
- local-first RaceIdentity and progression
- optional Supabase magic-link backup
- 3D museum / product inspection / Studio
- product, athlete, event, challenge and commerce architecture
- Android/PWA build paths
- Blender and procedural asset tooling
- deterministic release/security checks

The historical Canyon Museum remains the strongest reference implementation and 3D factory, but the consumer product is now KONA.

## Start here

Canonical current documentation:

1. [STATUS.md](STATUS.md)
2. [Product](docs/PRODUCT.md)
3. [Architecture](docs/ARCHITECTURE.md)
4. [Data model](docs/DATA_MODEL.md)
5. [Design system](docs/DESIGN_SYSTEM.md)
6. [Security & privacy](docs/SECURITY_PRIVACY.md)
7. [Operations](docs/OPERATIONS.md)
8. [Roadmap](docs/ROADMAP.md)
9. [Decisions](docs/DECISIONS.md)
10. [Repository hygiene](docs/REPOSITORY_HYGIENE.md)

Historical audits and handovers are evidence, not current product truth.

## Local run

```bash
git clone https://github.com/joaoccaldas/canyonmuseum.git
cd canyonmuseum
npm ci --ignore-scripts --prefix web
python3 -m http.server 8744
```

Open:

```
http://127.0.0.1:8744/
```

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
- post-deploy smoke at the exact merged SHA

Android binaries are distributed through GitHub Actions/Release artifacts rather than committed into source control.

## Architecture principle

```
Canonical entity
   ↓
Reusable experience
   ↓
Museum / Studio / RaceIdentity / Challenge / Story / Share / Commerce
```

Do not create brand-specific, athlete-specific or event-specific production forks when data/configuration can express the variation.

## Privacy

KONA is local-first and useful without an account.

Do not commit private user data, personal correspondence, private CRM/contact data, health data, credentials, secret API keys or private race-history matches to this public repository.

## License / rights

Third-party brands, trademarks, public-source media and reference material retain their respective ownership and license requirements. See provenance/source records before commercial reuse.
