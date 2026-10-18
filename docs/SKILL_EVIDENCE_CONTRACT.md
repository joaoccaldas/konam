# Skill discovery and evidence maturity

Run `node tools/skills-inventory.mjs konam=. sintra-ai=../sintra-ai` against authorized local checkouts.

This generator recursively detects SKILL.md entries under each repository's `skills/` directory and reports name/description, missing metadata, absent validation instructions and duplicate skill names. It **never executes skills, grants permissions, or declares them successful**. It does not sweep unrelated local folders or connected private projects.

## Graduation requirements
1. `documented`: SKILL.md exists, defined trigger and scope.
2. `contract-verified`: inputs, outputs, permissions, failure gates checked.
3. `fixture-tested`: complete and incomplete-input examples produce expected results.
4. `production-observed`: pinned execution receipt, time and quality evidence attached.
5. `reusable-approved`: independently inspected on a second project/client; rights and security accepted.

Do not derive these maturity states from keyword matches. Generated inventory always labels discovered files `documented-not-execution-verified`. Keep execution receipts, customer data, sources and logs in their authorized scopes. No public claims of certification or performance from document counts.

## Platform integration
Use this as a **read-only projection** alongside canonical asset/room catalogs. A skills UI can filter/search entries and display input/output diagrams, evidence and maturity once genuine receipts exist. Avoid adding a parallel skill authority, custom renderer or duplicate navigation system.

Source: KONA `skills/konam-room-studio/SKILL.md`; see `docs/architecture/AUTHORITY_MAP.md` and GitHub issues #137/#138.
