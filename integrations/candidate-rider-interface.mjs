import fs from "node:fs";
const data=JSON.parse(fs.readFileSync(new URL("./candidate-rider-interface.json", import.meta.url),"utf8"));
const norm=v=>typeof v==="string"?v.trim().toLowerCase():null;
export function listRiderInterfaceCandidates({type=null,brand=null,readiness=null,reuseTarget=null}={}){
  const t=norm(type),b=norm(brand),r=norm(readiness),u=norm(reuseTarget);
  return data.items.filter(x=>
    (!t||norm(x.type)===t)&&(!b||norm(x.brand)===b)&&(!r||norm(x.readiness)===r)&&
    (!u||x.reuse_targets.some(v=>norm(v)===u))
  );
}
export function getRiderInterfaceCandidate(id){
  if(typeof id!=="string") return null;
  return data.items.find(x=>x.id===id)??null;
}
export function canPromoteRiderInterface(item){
  return !!item && item.readiness==="public-ready" &&
    Array.isArray(item.source_records)&&item.source_records.length>0 &&
    Array.isArray(item.blockers)&&item.blockers.length===0;
}
export function riderInterfaceMeta(){
  return {schema_version:data.schema_version,source_branch:data.source_branch,source_commit:data.source_commit,count:data.items.length};
}
