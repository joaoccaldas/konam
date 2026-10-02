import fs from 'node:fs';import path from 'node:path';
const ROOT=path.resolve(import.meta.dirname,'..');const id=process.argv[2];if(!id)throw Error('usage: node tools/validate-room-package.mjs <room-id>');
const m=JSON.parse(fs.readFileSync(path.join(ROOT,'world/konam/rooms',id+'.room.json'),'utf8'));const fail=x=>{throw Error('[room '+id+'] '+x)};
const states=['concept','candidate','visual-review','technical-review','rights-review','approved-unwired','release-candidate','public','deprecated'];
if(m.id!==id)fail('manifest id mismatch');if(!states.includes(m.classification?.status))fail('invalid lifecycle');
const impl=m.implementation||{};const src=impl.kind==='installation'?impl.source:impl.module;if(!src||!fs.existsSync(path.join(ROOT,src)))fail('implementation source missing: '+src);
const code=fs.readFileSync(path.join(ROOT,src),'utf8');for(const re of [/new\s+THREE\.WebGLRenderer\s*\(/,/new\s+THREE\.PerspectiveCamera\s*\(/,/new\s+OrbitControls\s*\(/,/new\s+RoomEnvironment\s*\(/])if(re.test(code))fail('forbidden parallel runtime');
for(const tier of ['mobile','tablet','desktop']){const t=m.performance?.[tier];if(!t)fail('missing performance '+tier);for(const k of ['target_fps','max_room_draw_calls','max_room_triangles','max_texture_edge','max_dpr','particle_density','transmission','shadow_policy','lod_policy'])if(t[k]===undefined)fail('missing '+tier+'.'+k)}
for(const s of m.subjects||[])for(const k of ['claim_status','likeness_status','image_rights_status','brand_association_status','public_release_status'])if(!s[k])fail('subject '+s.subject_id+' missing '+k);
const rooms=JSON.parse(fs.readFileSync(path.join(ROOT,'museum/world/rooms.json'),'utf8'));const publicHit=(rooms.areas||[]).some(x=>x.id===id||x.id==='room-'+id||JSON.stringify(x).includes(id));
if(m.classification.status!=='public'&&publicHit)fail('non-public lifecycle conflicts with rooms.json wiring');if(m.classification.status==='public'&&!m.classification.public)fail('public state requires public=true');
console.log(JSON.stringify({ok:true,id,status:m.classification.status,implementation:impl.kind,publicWiring:publicHit},null,2));
