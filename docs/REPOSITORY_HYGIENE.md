# Repository Hygiene

## Problems to eliminate

- committed distributable binaries
- duplicate generated trees without ownership documentation
- stale current-state documents
- legacy namespace spread
- giant runtime modules with mixed responsibilities
- direct string-based DOM rendering without a shared safety contract

## Directory intent

```
app/            generated/runtime deploy bundles
web/src/        source modules
web/test/       source tests
museum/         canonical public content/data
schemas/        canonical schemas
assets/         required runtime/reference assets
blender/        source asset generation
tools/          deterministic builders/validators
docs/           canonical current documentation
docs/archive/   historical audits/handovers
```

## Binary rule

Do not commit new APK/IPA/ZIP release binaries to the source tree. Use Actions/Release artifacts.

## Generated-output rule

Every generated file family must declare:
- source
- build command
- owner script
- whether it is committed
- why it is committed

## Legacy namespace rule

No new direct writes to `speedmax.*`. Use migration/storage adapter.
