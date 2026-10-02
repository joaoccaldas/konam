import assert from "node:assert/strict";
import fs from "node:fs";
import { invokeReadTool, listReadTools } from "./mcp-read-adapter.mjs";

const spec=JSON.parse(fs.readFileSync(new URL("./mcp-read-tools.json", import.meta.url),"utf8"));
assert.equal(spec.write_enabled,false);
assert.equal(spec.security.remote_writes,false);
assert.equal(spec.security.private_user_state,false);
assert.equal(spec.security.arbitrary_file_access,false);
assert.equal(spec.security.network_fetch,false);

const names=listReadTools();
assert.deepEqual(new Set(names), new Set(spec.tools.map(t=>t.name)));

const canyon=invokeReadTool("list_products",{brand:"Canyon",type:"bike"});
assert.ok(canyon.length >= 1);
assert.ok(canyon.every(x=>x.brand==="Canyon" && x.product_type==="bike"));

const product=invokeReadTool("get_product",{id:"canyon-cfr-2027"});
assert.equal(product.id,"canyon-cfr-2027");
assert.equal(product.object_type,"product");
const experience=invokeReadTool("get_product_experience",{id:"canyon-cfr-2027"});
assert.equal(experience.id,"canyon-cfr-2027");
assert.ok(experience.maintenance.length>=1);
assert.ok(experience.vendors.some(v=>v.provider==="Canyon"));
assert.equal(experience.safety.remote_write,false);
assert.equal(invokeReadTool("get_product_experience",{id:"shimano-cs-r9200-11-30"}),null);

const event=invokeReadTool("get_event",{id:"kona-2026"});
assert.equal(event.id,"kona-2026");

const places=invokeReadTool("list_event_places",{event_id:"kona-2026",category:"culture"});
assert.ok(places.length >= 1);
const currentSources=invokeReadTool("list_event_sources",{event_id:"kona-2026",current_only:true});
assert.ok(currentSources.length >= 2);
assert.ok(currentSources.every(s=>s.status==="current" && s.valid_for_year===2026));
const eventSchedule=invokeReadTool("get_event_schedule",{event_id:"kona-2026"});
assert.equal(eventSchedule.length,4);

assert.throws(()=>invokeReadTool("get_product",{id:"canyon-cfr-2027",path:"../../secret"}),/unknown argument/);
assert.throws(()=>invokeReadTool("delete_product",{id:"canyon-cfr-2027"}),/unknown tool/);
assert.throws(()=>invokeReadTool("get_product","canyon-cfr-2027"),/args must be an object/);

console.log(`MCP read prototype PASS: ${names.length} tools, ${canyon.length} Canyon bikes, ${places.length} Kona culture places`);
