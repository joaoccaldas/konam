import fs from "node:fs";

const intake = JSON.parse(fs.readFileSync(new URL("./candidate-products.json", import.meta.url),"utf8"));

export function listCandidateProducts({type=null,brand=null,readiness=null}={}) {
  const norm=v=>typeof v==="string"?v.toLowerCase():null;
  const t=norm(type),b=norm(brand),r=norm(readiness);
  return intake.items.filter(x =>
    (!t || norm(x.type)===t) &&
    (!b || norm(x.brand)===b) &&
    (!r || norm(x.readiness)===r)
  );
}

export function getCandidateProduct(id) {
  if(typeof id!=="string") return null;
  return intake.items.find(x=>x.id===id) ?? null;
}

export function canPromoteCandidate(item) {
  if(!item || typeof item!=="object") return false;
  if(item.readiness!=="public-ready") return false;
  if(!Array.isArray(item.source_records) || item.source_records.length===0) return false;
  if(Array.isArray(item.blockers) && item.blockers.length>0) return false;
  return true;
}

export function candidateIntakeMeta() {
  return {
    schema_version:intake.schema_version,
    source_branch:intake.source_branch,
    source_commit:intake.source_commit,
    count:intake.items.length
  };
}
