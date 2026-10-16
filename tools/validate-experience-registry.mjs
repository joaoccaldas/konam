import fs from 'node:fs';
import path from 'node:path';

const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const p=path.join(ROOT,'world/experience-registry-v1.json');
const reg=JSON.parse(fs.readFileSync(p,'utf8'));
const active=new Map();
const errors=[];
const all=[...(reg.worlds||[]),...(reg.experiences||[])];

for(const rec of all){
  if(!rec.semantic_id) errors.push('missing semantic_id: '+JSON.stringify(rec));
  if(!rec.source_repo) errors.push('missing source_repo: '+rec.semantic_id);
  if(!rec.lifecycle) errors.push('missing lifecycle: '+rec.semantic_id);
  if(!reg.lifecycle_values.includes(rec.lifecycle)) errors.push('invalid lifecycle '+rec.lifecycle+' on '+rec.semantic_id);

  if(rec.lifecycle==='CANONICAL'){
    const prev=active.get(rec.semantic_id);
    if(prev) errors.push('duplicate CANONICAL semantic_id '+rec.semantic_id+' in '+prev.source_repo+' and '+rec.source_repo);
    active.set(rec.semantic_id,rec);
  }

  if(rec.lifecycle==='SUPERSEDED' && !rec.superseded_by) errors.push('SUPERSEDED without superseded_by: '+rec.semantic_id);
  if(rec.lifecycle==='FINAL_CANDIDATE' && (!rec.source_ref || rec.source_ref==='main')) errors.push('FINAL_CANDIDATE must pin a reviewed non-main ref: '+rec.semantic_id);

  if(rec.semantic_id.startsWith('world:') && rec.host_type!=='world') errors.push('world semantic_id must use host_type=world: '+rec.semantic_id);
  if(rec.host_type==='world' && !rec.semantic_id.startsWith('world:')) errors.push('host_type=world requires world semantic_id: '+rec.semantic_id);
}

for(const rec of all){
  if(rec.superseded_by && !all.some(x=>x.semantic_id===rec.superseded_by)) errors.push('unknown superseded_by '+rec.superseded_by+' on '+rec.semantic_id);
}

const finalTriplet=['room:konam:beast-cave','room:konam:nor3-winter','room:konam:breitling-kona'];
for(const id of finalTriplet){
  const rec=all.find(x=>x.semantic_id===id);
  if(!rec) errors.push('missing final-room candidate '+id);
  else if(rec.lifecycle!=='FINAL_CANDIDATE') errors.push(id+' must remain FINAL_CANDIDATE until recovered and verified on current main');
}

if(errors.length){
  console.error(JSON.stringify({ok:false,errors},null,2));
  process.exit(1);
}
console.log(JSON.stringify({
  ok:true,
  worlds:(reg.worlds||[]).length,
  experiences:(reg.experiences||[]).length,
  canonical:[...active.keys()].length,
  final_candidates:all.filter(x=>x.lifecycle==='FINAL_CANDIDATE').map(x=>x.semantic_id),
  superseded:all.filter(x=>x.lifecycle==='SUPERSEDED').map(x=>x.semantic_id)
},null,2));
