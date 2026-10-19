// Compatibility must fail closed when evidence is missing or conflicting.
export function resolveCompatibility({bikeId,componentId,rules=[]}){
 const r=rules.filter(x=>x.bike_id===bikeId&&x.component_id===componentId&&x.review_status==='verified'&&x.source_ref&&['compatible','incompatible'].includes(x.result));
 if(!r.length)return {result:'unknown',source_ref:null,reason:'no exact verified applicability'};
 if(new Set(r.map(x=>x.result)).size!==1)return {result:'unknown',source_ref:null,reason:'conflicting verified rules'};
 return {result:r[0].result,source_ref:r[0].source_ref,rule_id:r[0].id,reason:'review size/platform/trim applicability before relying on this rule'};
}
