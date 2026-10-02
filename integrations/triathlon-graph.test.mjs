import assert from "node:assert/strict";
import fs from "node:fs";
import {getNode,getRelations,getNeighbors,getGraphMeta} from "./triathlon-graph.mjs";

const graph=JSON.parse(fs.readFileSync(new URL("./triathlon-graph.json", import.meta.url),"utf8"));
const ids=new Set(graph.nodes.map(n=>n.id));
assert.equal(ids.size,graph.nodes.length,"node IDs must be unique");
for(const e of graph.edges){
  assert.ok(ids.has(e.from),`dangling from: ${e.from}`);
  assert.ok(ids.has(e.to),`dangling to: ${e.to}`);
}
assert.equal(getGraphMeta().privacy.contains_user_state,false);
assert.equal(getGraphMeta().privacy.remote_writes,false);
const cfr=getNode("canyon-cfr-2027");
assert.equal(cfr.kind,"product");
const rel=getRelations("canyon-cfr-2027",{relationship:"manufactured_by"});
assert.equal(rel.length,1);
assert.equal(getNode(rel[0].to)?.label,"Canyon");
const brandProducts=getNeighbors("brand-canyon",{relationship:"manufactured_by",direction:"in"});
assert.ok(brandProducts.length >= 1);
assert.ok(getRelations("kailua-pier",{relationship:"related_to"}).some(e=>e.to==="kona-2026"));
console.log(`Triathlon graph adapter PASS: ${graph.nodes.length} nodes, ${graph.edges.length} edges`);
