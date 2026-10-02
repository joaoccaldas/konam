#!/usr/bin/env node
// Generated admin-safe asset projection. Sources remain canonical museum registries.
import {contentVisible} from '../web/src/engine/event-visibility.js';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const J=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const exists=f=>fs.existsSync(path.join(root,f));
const catalog=J('museum/catalog/products.json');
const rooms=J('museum/world/rooms.json');
const brandRooms=J('museum/world/brand_rooms.json');
const decorations=J('museum/world/decorations.json');
const paintings=J('museum/art/paintings.json').paintings;
const sculptures=exists('museum/art/sculptures.json')?J('museum/art/sculptures.json').sculptures:[];
const wingIndex=J('museum/world/wings/index.json');
const wings=wingIndex.wings.map(file=>J('museum/world/wings/'+file));
const floors=Object.fromEntries((rooms.floors||[]).map(f=>[f.id,f.name]));

const roomMap=new Map();
const roomSource=new Map();
const order=[];
const addRoom=r=>{
  if(!r?.id||!contentVisible(r))return null;
  const row={id:r.id,name:r.name||r.short||r.id,floor:r.floor||'unassigned',floor_name:floors[r.floor]||r.floor||'Unassigned',kind:r.kind||'room'};
  if(!roomMap.has(row.id)){roomMap.set(row.id,row);order.push(row.id);}
  else Object.assign(roomMap.get(row.id),row);
  roomSource.set(row.id,{...(roomSource.get(row.id)||{}),...r});
  return roomMap.get(row.id);
};
for(const r of rooms.areas||[])addRoom(r);
for(const w of wings){
  for(const r of w.rooms||[])addRoom({...r,floor:w.floor||'unassigned',kind:'wing-room'});
}
for(const r of brandRooms.rooms||[])addRoom({...r,floor:r.floor||'ground',kind:r.kind||'brand-room'});

const placements=new Map();
const addPlacement=(id,room)=>{
  if(!id||!room)return;
  if(!placements.has(id))placements.set(id,new Map());
  placements.get(id).set(room.id,room);
};
for(const r of rooms.areas||[]){
  const room=roomMap.get(r.id);
  for(const id of r.exhibits?.products||[])addPlacement(id,room);
}
for(const p of catalog.products||[])for(const w of p.where||[])addPlacement(p.id,roomMap.get(w.id)||addRoom({id:w.id,name:w.name||w.id}));
for(const r of brandRooms.rooms||[])for(const p of r.products||[])addPlacement(p.id,roomMap.get(r.id));
for(const w of wings){
  for(const r of w.rooms||[]){
    const room=roomMap.get(r.id);
    for(const id of r.paintings||[])addPlacement('painting:'+id,room);
    for(const id of r.sculptures||[])addPlacement('sculpture:'+id,room);
  }
}
const artImage=p=>'assets/art/paintings/'+p.file;
const productImage=p=>{
  const candidates=[
    p.thumbnail,p.image,p.poster,p.preview,
    'assets/reference/paintings/'+p.id+'.png',
    'assets/reference/paintings/'+String(p.id||'').replace(/^canyon-/,'')+'.png'
  ].filter(Boolean);
  return candidates.find(exists)||'';
};
const rows=[];
for(const p of catalog.products||[]){
  rows.push({
    id:p.id,kind:'product',type:p.type||'asset',brand:p.brand||'Independent',name:p.name||p.model||p.id,
    family:p.family||'',year:p.year??p.years??p.era??'',category:p.category||'',material:p.material||'',
    glb:p.glb||p.asset_path||'',image:productImage(p),facts:(p.facts||[]).slice(0,3),stats:p.stats||[],
    locations:[...(placements.get(p.id)?.values()||[])]
  });
}
for(const r of brandRooms.rooms||[])for(const p of r.products||[]){
  if(rows.some(x=>x.id===p.id))continue;
  rows.push({id:p.id,kind:'product',type:p.type||'asset',brand:p.brand||'Independent',name:p.model||p.name||p.id,year:p.year||'',category:p.sub||'',material:'',glb:p.glb||'',image:productImage(p),facts:p.text?[{text:p.text}]:[],stats:p.stats||[],locations:[...(placements.get(p.id)?.values()||[])]});
}
for(const p of paintings)rows.push({
  id:'painting:'+p.id,kind:'art',type:'painting',brand:'KONA Studio',name:p.title||p.id,year:p.provenance?.created?.slice?.(0,4)||'',category:p.medium||'Painting',material:p.medium||'',glb:'',image:artImage(p),facts:p.text?[{text:p.text}]:[],stats:[],locations:[...(placements.get('painting:'+p.id)?.values()||[])]
});
for(const p of sculptures)rows.push({
  id:'sculpture:'+p.id,kind:'art',type:'sculpture',brand:'KONA Studio',name:p.title||p.id,year:p.provenance?.created?.slice?.(0,4)||'',category:'Sculpture',material:p.material||'',glb:'assets/art/sculptures/'+p.file,image:'',facts:p.text?[{text:p.text}]:[],stats:[p.height?[(p.height+' m'),'height']:null,p.tris?[(String(p.tris)),'triangles']:null].filter(Boolean),locations:[...(placements.get('sculpture:'+p.id)?.values()||[])]
});
const decorPlacements=new Map();
const addDecor=(id,room)=>{if(!id||!room)return;if(!decorPlacements.has(id))decorPlacements.set(id,new Map());decorPlacements.get(id).set(room.id,room);};
for(const r of rooms.areas||[])for(const p of r.decorations||[])addDecor(p.prop,roomMap.get(r.id));
for(const r of brandRooms.rooms||[])for(const p of r.decorations||[])addDecor(p.prop,roomMap.get(r.id));
for(const p of decorations.props||[])rows.push({
  id:'decor:'+p.id,kind:'decoration',type:'decoration',brand:'KONA World',name:p.name||p.id,year:'',category:'Room decoration',material:'',glb:p.glb||'',image:p.image||'',facts:[],stats:[[p.builder,'builder'],[String((decorPlacements.get(p.id)?.size)||0),'placements']].filter(x=>x[0]),locations:[...(decorPlacements.get(p.id)?.values()||[])]
});
for(const p of decorations.installations||[])rows.push({
  id:'installation:'+p.id,kind:'installation',type:'installation',brand:'KONA World',name:p.name||p.id,year:'',category:'Room installation',material:'',glb:'',image:p.image||'',facts:[],stats:[[p.builder,'builder'],[p.min_width?String(p.min_width)+' m':'','min width'],[p.min_depth?String(p.min_depth)+' m':'','min depth']].filter(x=>x[0]),locations:[]
});
for(const room of roomMap.values()){
  const src=roomSource.get(room.id)||{};
  const presentation=src.presentation||src.theme||{};
  rows.push({
    id:'room:'+room.id,kind:'world',type:'room',brand:'KONA World',name:room.name,year:'',category:src.kind||room.kind||'room',material:'',
    glb:'',image:src.image||src.thumbnail||'',facts:[src.sub?{text:src.sub}:null,src.text?{text:src.text}:null].filter(Boolean),stats:[],
    preview:{kind:'room',floor:presentation.floor||presentation.wall||'#12181d',accent:presentation.vein||presentation.accent||'#ff6a00',fog:presentation.fog||'#0b1116'},
    locations:[room]
  });
}
const proceduralPalettes={
  'decor:kona-palm':['#173827','#7d5f43'],
  'decor:race-marker':['#111820','#ff6a00'],
  'installation:bio':['#10281a','#3dba55'],
  'installation:horror':['#10080c','#ff2a3c'],
  'installation:alien':['#070b12','#3dffe0'],
  'installation:zombie':['#16180c','#d2e06a']
};
for(const row of rows)if(!row.image&&!row.glb&&!row.preview){
  const [floor,accent]=proceduralPalettes[row.id]||['#12181d','#20b8d5'];
  row.preview={kind:row.type||'asset',floor,accent,fog:'#0b1116'};
}
const out={schema_version:2,generated_by:'tools/build_admin_assets.mjs',count:rows.length,rooms:[...roomMap.values()],assets:rows};
fs.mkdirSync(path.join(root,'app'),{recursive:true});
fs.writeFileSync(path.join(root,'app/admin-assets.json'),JSON.stringify(out,null,1)+'\n');
console.log('admin assets',rows.length,'across',roomMap.size,'rooms');
