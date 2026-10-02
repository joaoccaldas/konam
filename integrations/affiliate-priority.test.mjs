import assert from "node:assert/strict";
import fs from "node:fs";
const x=JSON.parse(fs.readFileSync(new URL("./affiliate-priority.json",import.meta.url),"utf8"));
const by=Object.fromEntries(x.programmes.map(p=>[p.provider,p]));
assert.ok(by.Zwift.commission.includes("5%"));
assert.ok(by.Nike.commission.includes("11%"));
assert.ok(by.Specialized.commission.includes("3%-12%"));
assert.ok(by.Canyon.commission.includes("2%"));
assert.ok(by.Viator.commission.includes("8%"));
assert.equal(by.Wahoo.certainty,"closed-to-new-applications");
for(const p of x.programmes){
  assert.ok(p.source.startsWith("https://"));
  assert.notEqual(p.certainty,"approved");
}
console.log("Affiliate revenue priority PASS");
