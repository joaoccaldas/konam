import fs from "node:fs";
const graph=JSON.parse(fs.readFileSync(new URL("./triathlon-graph.json", import.meta.url),"utf8"));

export function getNode(id){
  if(typeof id!=="string") return null;
  return graph.nodes.find(n=>n.id===id) ?? null;
}

export function getRelations(id,{relationship=null,direction="out"}={}){
  if(typeof id!=="string") return [];
  const rel=typeof relationship==="string" ? relationship : null;
  return graph.edges.filter(e=>{
    const endpoint=direction==="in" ? e.to===id : e.from===id;
    return endpoint && (!rel || e.relationship===rel);
  });
}

export function getNeighbors(id,options={}){
  const direction=options.direction==="in" ? "in" : "out";
  return getRelations(id,{...options,direction}).map(e=>{
    const other=direction==="in" ? e.from : e.to;
    return {edge:e,node:getNode(other)};
  }).filter(x=>x.node);
}

export function getGraphMeta(){
  return {schema_version:graph.schema_version,counts:graph.counts,privacy:graph.privacy};
}
