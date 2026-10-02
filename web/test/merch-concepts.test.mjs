import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const spec=JSON.parse(fs.readFileSync(new URL('../../integrations/merch/concepts.json',import.meta.url),'utf8'));
const projection=JSON.parse(fs.readFileSync(new URL('../../app/admin-merch-concepts.json',import.meta.url),'utf8'));
const build=fs.readFileSync(new URL('../../tools/build_merch_concepts.mjs',import.meta.url),'utf8');

test('merch projection is deterministic and follows the canonical brief registry',()=>{
  assert.equal(projection.catalog_version,spec.catalog_version);
  assert.deepEqual(projection.concepts.map(x=>x.id),spec.concepts.map(x=>x.id));
  assert.doesNotMatch(build,/new Date|generated_at/);
});
test('generated concepts are explicitly non-sellable until later gates',()=>{
  for(const c of projection.concepts){assert.equal(c.sellable,false);assert.equal(c.provider,null);assert.match(c.rights,/original-kona-m-brand-only/);assert.ok(fs.existsSync(new URL('../../'+c.visual,import.meta.url)),c.visual);}
});
