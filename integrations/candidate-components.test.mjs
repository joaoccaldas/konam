import assert from "node:assert/strict";
import {
  listCandidateComponents,
  getCandidateComponent,
  canPromoteComponent,
  componentReuseScore,
  candidateComponentMeta
} from "./candidate-components.mjs";

const meta=candidateComponentMeta();
assert.equal(meta.count,6);
assert.equal(meta.source_commit,"88fa0c9c");

assert.equal(listCandidateComponents({category:"wheel"}).length,3);
assert.equal(listCandidateComponents({brand:"Shimano"}).length,2);
assert.equal(listCandidateComponents({reuseTarget:"engineering_story"}).length,6);
assert.equal(listCandidateComponents({reuseTarget:"race_setup"}).length,3);

for(const item of listCandidateComponents()){
  assert.ok(item.states.includes("assembled"));
  assert.ok(item.states.includes("exploded"));
  assert.ok(item.semantic_parts.length>=3);
  assert.ok(item.source_records.length>=1);
  assert.ok(componentReuseScore(item)>=7);
  assert.equal(canPromoteComponent(item),false);
}

const front=getCandidateComponent("dt-swiss-arc1100-db80-front");
assert.equal(front.setup_slot,"wheel");
assert.equal(front.fitment.axle_mm,"12x100");

const crank=getCandidateComponent("shimano-fc-r9200-54-40-170");
assert.equal(crank.setup_slot,null);
assert.equal(crank.fitment.crank_length_mm,170);

console.log("Candidate component intake PASS: 6 reusable modules, promotion gated");
