## What changed

<!-- Keep this bounded. Separate architecture, content/art, generated-output sync, and unrelated cleanup where possible. -->

## Check before create

For any new room, asset family, product entity, schema, storage key, runtime, or shared UI primitive:

- [ ] I ran `node tools/check-before-create.mjs <kind> <name-or-id>`
- [ ] I searched canonical registries/source for an existing implementation
- [ ] Decision: **REUSE / ADAPT / RESTYLE / COMPOSE / CREATE**
- [ ] If CREATE: I explain below why existing structures were insufficient
- [ ] I name the canonical authority that owns the new object after merge

**Authority / rationale:**

## Validation

- [ ] unit/contracts
- [ ] authority hygiene
- [ ] repository hygiene
- [ ] brand authority
- [ ] deterministic generated outputs
- [ ] visual evidence when UI/3D changed
- [ ] mobile portrait + landscape considered
- [ ] truth / provenance / rights boundaries reviewed

Do not weaken a validator merely to make this PR green.
