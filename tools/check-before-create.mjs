#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

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
  runtime:['web/src/landing.js','web/src/entry.js','web/src/ui/kona-shell.js','web/src/engine/machine-inspection.js'],
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
if(!matches.length){
  console.log('No likely existing match found in canonical search locations.');
  console.log('CREATE is not automatically approved: inspect the authority files above before adding a new object.');
}else{
  console.log('Likely existing matches:');
  for(const m of matches.slice(0,30))console.log(String(m.score).padStart(2,' ')+'  '+m.path);
  console.log('');
  console.log('Inspect these before creating a new object.');
}
