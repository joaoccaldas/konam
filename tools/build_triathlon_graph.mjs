import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));
const catalog=read("integrations/public-catalog.json");

const slug=s=>String(s).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
const nodes=[];
const edges=[];
const seen=new Set();

function addNode(node){
  if(seen.has(node.id)) return;
  seen.add(node.id);
  nodes.push(node);
}
function addEdge(edge){ edges.push(edge); }

for(const p of catalog.products){
  const brandId=`brand-${slug(p.brand || "unknown")}`;
  addNode({id:brandId,kind:"brand",public:true,label:p.brand || "Unknown"});
  addNode({
    id:p.id,kind:"product",public:true,label:p.label,
    source_records:p.source_records || [],product_type:p.product_type,
    representation:p.representation
  });
  addEdge({
    from:p.id,relationship:"manufactured_by",to:brandId,
    evidence:p.representation === "provisional" ? "provisional" : "published",
    source_records:p.source_records || []
  });
}

for(const e of catalog.events){
  addNode({id:e.id,kind:"event",public:true,label:e.label,source_records:e.source_records || []});
}

for(const p of catalog.places){
  addNode({id:p.id,kind:"place",public:true,label:p.label,source_records:p.source_records || []});
  if(p.categories?.includes("race-week") && seen.has("kona-2026")){
    addEdge({
      from:p.id,relationship:"related_to",to:"kona-2026",
      evidence:"published",source_records:p.source_records || []
    });
  }
}

const graph={
  schema_version:1,
  generated_by:"tools/build_triathlon_graph.mjs",
  generated_from:["integrations/public-catalog.json"],
  privacy:{contains_user_state:false,remote_writes:false},
  counts:{nodes:nodes.length,edges:edges.length},
  nodes,edges
};

const outPath=path.join(root,"integrations/triathlon-graph.json");
const text=JSON.stringify(graph,null,2)+"\n";
if(process.argv.includes("--check")){
  if(!fs.existsSync(outPath)){ console.error("triathlon graph missing"); process.exit(1); }
  if(fs.readFileSync(outPath,"utf8")!==text){ console.error("triathlon graph stale"); process.exit(1); }
  console.log(`Triathlon graph PASS: ${nodes.length} nodes, ${edges.length} edges`);
}else{
  fs.writeFileSync(outPath,text);
  console.log(`Wrote triathlon graph: ${nodes.length} nodes, ${edges.length} edges`);
}
