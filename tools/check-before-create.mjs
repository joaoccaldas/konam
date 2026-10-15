#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {loadKnowledge, resolveKnowledgePaths, validateKnowledge, searchKnowledge, findModelOccurrences} from './3d-knowledge.mjs';

const ROOT=path.resolve(import.meta.dirname,'..');
const kind=(process.argv[2]||'').toLowerCase();
const query=(process.argv.slice(3).join(' ')||'').trim().toLowerCase();
if(!kind||!query){
  console.error('usage: node tools/check-before-create.mjs <room|asset|product|storage|runtime|schema> <name-or-id>');
  process.exit(2);
}
const authority={
  room:['world/konam/rooms-v1.json','world/konam/rooms','museum/schemas/room-manifest.schema.json','skills/konam-room-studio/SKILL.md'],
  asset:['assets','museum/catalog','app/admin-assets.json','museum/schemas/asset-manifest.schema.json','skills/konam-room-studio/SKILL.md'],
  product:['museum/catalog/products.json','museum/bikes','integrations/public-catalog.json','web/src/engine/identity.js'],
  storage:['web/src/engine/storage.js','web/src/engine/game-state.js','web/src/engine/app-state.js'],
  runtime:['web/src/landing.js','web/src/entry.js','web/src/ui/kona-shell.js','web/src/engine/machine-inspection.js','config/renderer-authority-v1.json','docs/architecture/RENDERER_AUTHORITY_R0.md'],
  schema:['museum/schemas','schemas','integrations','museum/bike.schema.json']
};
if(!authority[kind]){
  console.error('unknown kind: '+kind);
  process.exit(2);
}
function walk(p){
  const abs=path.join(ROOT,p);
  if(!fs.existsSync(abs))return[];
  const st=fs.statSync(abs);
  if(st.isFile())return[p];
  return fs.readdirSync(abs,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(p,e.name)):[path.join(p,e.name)]);
}
const candidates=[...new Set(authority[kind].flatMap(walk))];
const terms=query.split(/\s+/).filter(Boolean);
const matches=[];
for(const rel of candidates){
  let text='';
  try{
    if(fs.statSync(path.join(ROOT,rel)).size>2_500_000)continue;
    text=fs.readFileSync(path.join(ROOT,rel),'utf8').toLowerCase();
  }catch{continue;}
  const name=path.basename(rel).toLowerCase();
  const score=terms.reduce((n,t)=>n+(name.includes(t)?3:0)+(text.includes(t)?1:0),0);
  if(score)matches.push({path:rel,score});
}
matches.sort((a,b)=>b.score-a.score||a.path.localeCompare(b.path));
console.log('Kona.m pre-create inventory');
console.log('kind:',kind);
console.log('query:',query);
console.log('authority: docs/architecture/AUTHORITY_MAP.md');
console.log('decision order: REUSE -> ADAPT -> RESTYLE -> COMPOSE -> CREATE');
console.log('');
// Curated cross-project pointers supplement existing product authorities.
// A broken map fails visibly instead of silently discarding accumulated lessons.
let knowledge,knowledgePaths;
try{
  knowledgePaths=resolveKnowledgePaths(ROOT);
  knowledge=loadKnowledge(ROOT,knowledgePaths.mapPath);
}catch{
  console.error('Configured 3D knowledge could not be loaded. No fallback was used; check the explicit local input.');
  process.exit(1);
}
if(knowledgePaths.configured)console.log('Configured local knowledge is active. Keep its results in the authorized local context.');
const knowledgeErrors=validateKnowledge(knowledge,{root:ROOT});
if(knowledgeErrors.length){
  console.error('3D knowledge map invalid: '+knowledgeErrors.join('; '));
  process.exit(1);
}
const knowledgeHits=searchKnowledge(knowledge,query,{limit:5});
const sourceHits=['asset','product','room'].includes(kind)?findModelOccurrences(knowledge,query,{limit:5}):[];
if(knowledgeHits.length||sourceHits.length){
  console.log('Related cross-project knowledge (pointers, not promotion approval):');
  for(const hit of knowledgeHits){
    console.log(' - '+hit.id+' ['+hit.status+'; '+hit.evidence+']: '+hit.title);
    console.log('   gate: '+hit.adoption_gate);
    console.log('   source: '+hit.sources[0].url);
  }
  for(const hit of sourceHits)console.log(' - source-location: '+hit.repository+'@'+hit.ref+':'+hit.path+' [rights/acceptance not established]');
  console.log('');
}
if(!matches.length){
  console.log('No likely existing match found in canonical search locations.');
  console.log('CREATE is not automatically approved: inspect the authority files above before adding a new object.');
}else{
  console.log('Likely existing matches:');
  for(const m of matches.slice(0,30))console.log(String(m.score).padStart(2,' ')+'  '+m.path);
  console.log('');
  console.log('Inspect these before creating a new object.');
}
