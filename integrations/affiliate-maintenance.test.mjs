import assert from "node:assert/strict";
import fs from "node:fs";
const programs=JSON.parse(fs.readFileSync(new URL("./vendor-programs.json", import.meta.url),"utf8"));
const sources=JSON.parse(fs.readFileSync(new URL("./maintenance-sources.json", import.meta.url),"utf8"));
const schema=JSON.parse(fs.readFileSync(new URL("./maintenance-guide.schema.json", import.meta.url),"utf8"));

assert.ok(programs.providers.length>=8);
assert.equal(programs.policy.affiliate_ids_in_repo,false);
assert.equal(programs.policy.disclosure_required,true);
for(const p of programs.providers){
  assert.ok(p.source.startsWith("https://"));
  assert.notEqual(p.status,"approved");
}
assert.ok(sources.items.length>=8);
assert.equal(schema.properties.safety.properties.manufacturer_manual_overrides.type,"boolean");
assert.ok(schema.properties.guide_type.enum.includes("pre-ride-check"));
assert.ok(schema.properties.guide_type.enum.includes("service"));
console.log("Affiliate + maintenance contracts PASS");
