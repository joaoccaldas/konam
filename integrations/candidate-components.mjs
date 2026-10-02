import fs from "node:fs";
const data=JSON.parse(fs.readFileSync(new URL("./candidate-components.json", import.meta.url),"utf8"));

const norm=v=>typeof v==="string"?v.trim().toLowerCase():null;

export function listCandidateComponents({category=null,brand=null,readiness=null,reuseTarget=null}={}) {
  const c=norm(category),b=norm(brand),r=norm(readiness),u=norm(reuseTarget);
  return data.items.filter(x =>
    (!c || norm(x.category)===c) &&
    (!b || norm(x.brand)===b) &&
    (!r || norm(x.readiness)===r) &&
    (!u || x.reuse_targets.some(v=>norm(v)===u))
  );
}

export function getCandidateComponent(id) {
  if(typeof id!=="string") return null;
  return data.items.find(x=>x.id===id) ?? null;
}

export function canPromoteComponent(item) {
  return !!item &&
    item.readiness==="public-ready" &&
    Array.isArray(item.source_records) &&
    item.source_records.length>0 &&
    Array.isArray(item.blockers) &&
    item.blockers.length===0;
}

export function componentReuseScore(item) {
  if(!item || !Array.isArray(item.reuse_targets)) return 0;
  return new Set(item.reuse_targets).size;
}

export function candidateComponentMeta() {
  return {
    schema_version:data.schema_version,
    source_branch:data.source_branch,
    source_commit:data.source_commit,
    count:data.items.length
  };
}
