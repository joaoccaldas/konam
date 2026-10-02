import fs from 'node:fs';
import path from 'node:path';

const ROOT=path.resolve(import.meta.dirname,'..');
const id=process.argv[2];
if(!id)throw Error('usage: node tools/validate-room-package.mjs <room-id>');

const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const json=p=>JSON.parse(read(p));
const exists=p=>fs.existsSync(path.join(ROOT,p));
const fail=x=>{throw Error('[room '+id+'] '+x)};
const m=json('world/konam/rooms/'+id+'.room.json');

const states=['concept','candidate','visual-review','technical-review','rights-review','approved-unwired','release-candidate','public','deprecated'];
if(m.id!==id)fail('manifest id mismatch');
if(!states.includes(m.classification?.status))fail('invalid lifecycle');
if(m.classification.status==='public' && m.classification.public!==true)fail('public lifecycle requires public=true');
if(m.classification.status!=='public' && m.classification.public!==false)fail('non-public lifecycle requires public=false');

if(m.brand?.authority!=='docs/BRAND_SYSTEM.md')fail('room must consume canonical docs/BRAND_SYSTEM.md');
if(m.brand?.tokens!=='brand/tokens.css')fail('room must consume canonical brand/tokens.css');
if(m.brand?.ui!=='global' || m.brand?.typography!=='global')fail('room may not own a parallel UI/typography authority');

const impl=m.implementation||{};
const src=impl.kind==='installation'?impl.source:impl.module;
if(!src)fail('implementation source missing from manifest');

const localImplementation=exists(src);
const crossBranch=!!impl.source_branch;
if(!localImplementation){
  if(!(m.classification.status==='concept' && crossBranch)) fail('implementation source missing: '+src);
} else {
  const code=read(src);
  for(const re of [
    /new\s+THREE\.WebGLRenderer\s*\(/,
    /new\s+THREE\.PerspectiveCamera\s*\(/,
    /new\s+OrbitControls\s*\(/,
    /new\s+RoomEnvironment\s*\(/
  ]) if(re.test(code)) fail('forbidden parallel runtime');
}
if(crossBranch && m.classification.status!=='concept') fail('source_branch is concept-only; reconcile implementation locally before candidate');

for(const tier of ['mobile','tablet','desktop']){
  const t=m.performance?.[tier];
  if(!t)fail('missing performance '+tier);
  for(const k of ['target_fps','max_room_draw_calls','max_room_triangles','max_texture_edge','max_dpr','particle_density','transmission','shadow_policy','lod_policy']){
    if(t[k]===undefined)fail('missing '+tier+'.'+k);
  }
}

for(const s of m.subjects||[]){
  for(const k of ['claim_status','likeness_status','image_rights_status','brand_association_status','public_release_status']){
    if(!s[k])fail('subject '+s.subject_id+' missing '+k);
  }
}

for(const key of ['manifest','placements']){
  const p=m.assets?.[key];
  if(p && !exists(p) && m.classification.status!=='concept') fail('asset reference missing: '+p);
}
if(m.assets?.bike_pipeline!=='museum/bike.schema.json')fail('rooms must reuse canonical bike pipeline');

const rooms=json('museum/world/rooms.json');
const publicHit=(rooms.areas||[]).some(x=>x.id===id||x.id==='room-'+id||JSON.stringify(x).includes(id));
if(m.classification.status!=='public' && publicHit)fail('non-public lifecycle conflicts with rooms.json wiring');
if(m.classification.status==='public' && !publicHit)fail('public lifecycle requires canonical rooms.json wiring');

console.log(JSON.stringify({
  ok:true,
  id,
  status:m.classification.status,
  implementation:impl.kind,
  implementationLocal:localImplementation,
  sourceBranch:impl.source_branch||null,
  publicWiring:publicHit,
  brandAuthority:m.brand.authority
},null,2));
