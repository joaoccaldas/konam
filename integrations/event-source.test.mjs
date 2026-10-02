import assert from "node:assert/strict";
import fs from "node:fs";

const registry=JSON.parse(fs.readFileSync(new URL("./sources/kona-2026.ironman.json", import.meta.url),"utf8"));
assert.equal(registry.schema_version,1);
assert.equal(registry.event_id,"kona-2026");
assert.equal(registry.event_year,2026);
assert.equal(registry.freshness_policy.operational_requires_event_year,true);
assert.equal(registry.freshness_policy.prior_year_policy,"reference-only");

const current=registry.sources.filter(s=>s.status==="current");
assert.ok(current.length>=2);
assert.ok(current.every(s=>s.valid_for_year===2026));

const prior=registry.sources.filter(s=>s.valid_for_year<2026);
assert.ok(prior.length>=1);
assert.ok(prior.every(s=>s.status==="reference-only"));

for(const item of registry.current_facts.race_week){
  const source=registry.sources.find(s=>s.id===item.source_id);
  assert.ok(source,"schedule item source must exist");
  assert.equal(source.status,"current");
  assert.equal(source.valid_for_year,2026);
}

for(const [key,value] of Object.entries(registry.reference_facts)){
  assert.equal(value.status,"reference-only",`${key} must remain reference-only`);
}

console.log("Event source registry PASS");
