// rooms/norwegian-engine.js
// NOR // 3 · The Norwegian Engine.
// Production candidate only. Deliberately UNWIRED from hall.js, entry.js and rooms-v1.json.

import * as THREE from 'three';

export const NOR_ENGINE_BOUNDS=Object.freeze({x0:-15,x1:15,z0:12,z1:-12,h:6.2});
export const NOR_ENGINE_ENTRY=Object.freeze({wall:'west',z0:2.3,z1:-2.3,h:3.8});
export const NOR_ENGINE_ZONES=Object.freeze([
  {id:'rain-lock',label:'Rain Lock',x:-12.4,z:0,r:3.2},
  {id:'three-rails',label:'Three Rails',x:-4,z:0,r:6},
  {id:'protocol-table',label:'Protocol Table',x:2,z:0,r:4.3},
  {id:'altitude-glasshouse',label:'Altitude Glasshouse',x:9.5,z:-5,r:4},
  {id:'heat-cool',label:'Heat / Cool',x:10.2,z:4.3,r:3.6},
  {id:'podium-vault',label:'Podium Vault',x:3,z:10.3,r:5},
  {id:'fjord-wall',label:'Fjord Wall',x:-8,z:9.5,r:4.4},
  {id:'kona-line',label:'Kona Line',x:-8,z:-10.8,r:4}
]);

const C={bg:'#071116',basalt:'#282F36',sand:'#F4EFE7',mist:'#E6E9ED',ocean:'#00A7C7',sunrise:'#FF6A00',glacier:'#9CCBD6',rubber:'#111619',steel:'#434d53',oak:'#3a2418',gold:'#a67f2d',silver:'#9da5aa',bronze:'#8b4a28'};
const mat=(color,rough=.75,metal=0)=>new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal});
const phys=o=>new THREE.MeshPhysicalMaterial(o);

function box(g,n,s,p,m,r=[0,0,0]){const x=new THREE.Mesh(new THREE.BoxGeometry(...s),m);x.name=n;x.position.set(...p);x.rotation.set(...r);x.castShadow=x.receiveShadow=true;g.add(x);return x}
function cyl(g,n,rad,depth,p,m,r=[0,0,0],seg=28){const x=new THREE.Mesh(new THREE.CylinderGeometry(rad,rad,depth,seg),m);x.name=n;x.position.set(...p);x.rotation.set(...r);x.castShadow=x.receiveShadow=true;g.add(x);return x}
function tube(g,n,a,b,r,m){const d=b.clone().sub(a),x=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),12),m);x.name=n;x.position.copy(a).add(b).multiplyScalar(.5);x.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());x.castShadow=true;g.add(x);return x}
function obstacle(list,x,z,r){list?.push?.({c:new THREE.Vector3(x,0,z),r})}
function pick(list,obj,id,label){obj.traverse(o=>{if(o.isMesh){o.userData.norEngine={hotspot:id,label};list?.push?.(o)}})}
function texture(paint,w=1400,h=760){const c=document.createElement('canvas');c.width=w;c.height=h;paint(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t}
function panel(lines,kicker,footer,accent=C.sunrise,w=4.4,h=2){
  const t=texture((g,W,H)=>{g.fillStyle='#091015';g.fillRect(0,0,W,H);g.fillStyle=accent;g.fillRect(75,70,90,7);g.fillStyle='#aeb8be';g.font='700 28px Manrope, Arial';g.fillText((kicker||'').toUpperCase(),75,130);g.fillStyle=C.sand;g.font='400 76px Georgia, serif';let y=245;for(const l of lines){g.fillText(l,75,y);y+=88}g.fillStyle='#aeb8be';g.font='500 29px Manrope, Arial';g.fillText(footer||'',75,H-70)});
  return new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t,toneMapped:false}));
}
function badge(text,w=1.8,h=.42,color=C.mist){
  const t=texture((g,W,H)=>{g.fillStyle='#0b1115';g.fillRect(0,0,W,H);g.strokeStyle='rgba(230,233,237,.22)';g.lineWidth=3;g.strokeRect(8,8,W-16,H-16);g.fillStyle=color;g.textAlign='center';g.textBaseline='middle';g.font='700 42px Manrope, Arial';g.fillText(text,W/2,H/2)},1000,240);
  return new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t,toneMapped:false}));
}

function shell(g,lite){
  const B=NOR_ENGINE_BOUNDS,w=B.x1-B.x0,d=B.z0-B.z1;
  const wet=phys({color:'#0c151a',roughness:.34,metalness:.03,clearcoat:.32,clearcoatRoughness:.35});
  const stone=mat('#20292e',.93,.02),ceiling=mat('#10161a',.9,.03),oak=mat(C.oak,.68,.02);
  const floor=box(g,'NOR_WET_BASALT_FLOOR',[w,.18,d],[0,-.09,0],wet);floor.userData.floor=true;
  box(g,'NOR_WALL_N',[w,B.h,.3],[0,B.h/2,B.z0+.15],stone);box(g,'NOR_WALL_S',[w,B.h,.3],[0,B.h/2,B.z1-.15],stone);box(g,'NOR_WALL_E',[.3,B.h,d],[B.x1+.15,B.h/2,0],stone);
  const e=NOR_ENGINE_ENTRY;box(g,'NOR_WALL_W_N',[.34,B.h,B.z0-e.z0],[B.x0-.17,B.h/2,(B.z0+e.z0)/2],stone);box(g,'NOR_WALL_W_S',[.34,B.h,e.z1-B.z1],[B.x0-.17,B.h/2,(e.z1+B.z1)/2],stone);box(g,'NOR_ENTRY_LINTEL',[.34,B.h-e.h,e.z0-e.z1],[B.x0-.17,e.h+(B.h-e.h)/2,0],stone);
  box(g,'NOR_CEILING',[w,.18,d],[0,B.h+.09,0],ceiling);
  for(let x=-12;x<=12;x+=3)box(g,'NOR_CEILING_BAFFLE',[.18,.18,21.4],[x,B.h-.12,0],oak);
  const cold=new THREE.MeshBasicMaterial({color:C.glacier,transparent:true,opacity:lite?.15:.28,toneMapped:false});
  for(const z of [-7.4,0,7.4]){const q=new THREE.Mesh(new THREE.PlaneGeometry(11.8,.045),cold);q.rotation.x=Math.PI/2;q.position.set(0,B.h-.23,z);g.add(q)}
  const warm=new THREE.MeshBasicMaterial({color:C.sunrise,transparent:true,opacity:lite?.4:.75,toneMapped:false});
  const horizon=new THREE.Mesh(new THREE.PlaneGeometry(10.8,.05),warm);horizon.position.set(-7.8,2.8,B.z1+.17);g.add(horizon);
  g.add(new THREE.HemisphereLight('#b9d6df','#081015',lite?.48:.58));
  const key=new THREE.DirectionalLight('#c7e8f1',lite?.7:1.05);key.position.set(-4,7,-2);key.castShadow=!lite;g.add(key);
  const fill=new THREE.DirectionalLight('#8db2bd',lite?.25:.42);fill.position.set(8,4,9);g.add(fill);
}

function rainLock(g,pickables,lite){
  const steel=mat('#364149',.33,.72),stone=mat('#1b252a',.9,.02);
  const title=panel(['THE NORWEGIAN','ENGINE'],'NOR // 3','Three lanes. One system. Measure. Adapt. Repeat.');title.position.set(-14.72,3,-4.7);title.rotation.y=Math.PI/2;g.add(title);
  for(let i=0;i<9;i++)box(g,'RAIN_LOCK_RIB',[.12,.2,4.8],[-14.68,.45+i*.58,0],i%2?steel:stone);
  const rain=new THREE.MeshBasicMaterial({color:C.glacier,transparent:true,opacity:lite?.08:.18,toneMapped:false});
  for(let i=0;i<28;i++)box(g,'RAIN_STREAK',[.018,2.6,.014],[-14.38,2.3,-2.1+i*.155],rain,[0,0,.02*Math.sin(i)]);
  const drain=box(g,'RAIN_DRAIN',[2.4,.035,1],[-13,.025,0],mat('#10171b',.75,.5));pick(pickables,drain,'rain-lock','Rain Lock');
}

function bikeLane(g,idx,z,pickables,obstacles){
  const carbon=mat('#101416',.24,.56),metal=mat('#414b50',.3,.78),rubber=mat(C.rubber,.97);
  box(g,'LANE_'+idx+'_MAT',[6.4,.04,2.15],[-4,.02,z],rubber);
  const bike=new THREE.Group();bike.name='NOR_BIKE_'+idx;bike.position.set(-3.7,.72,z);bike.rotation.y=Math.PI/2;g.add(bike);
  const wheel=new THREE.TorusGeometry(.66,.043,12,48);for(const zz of [-1.03,1.03]){const q=new THREE.Mesh(wheel,carbon);q.rotation.y=Math.PI/2;q.position.z=zz;q.castShadow=true;bike.add(q)}
  const A=new THREE.Vector3(0,.05,-1),B=new THREE.Vector3(0,.05,1),BB=new THREE.Vector3(0,.08,.02),S=new THREE.Vector3(0,1.05,.4),H=new THREE.Vector3(0,.82,-.58);
  [[A,BB,.06],[BB,B,.06],[BB,S,.072],[S,H,.052],[H,BB,.06],[H,A,.045],[S,B,.045]].forEach((v,i)=>tube(bike,'FRAME_'+i,v[0],v[1],v[2],carbon));
  box(bike,'SADDLE',[.12,.08,.36],[0,1.15,.54],carbon,[0,0,-.12]);tube(bike,'AERO_BAR',new THREE.Vector3(0,.88,-.62),new THREE.Vector3(0,.92,-1.28),.032,metal);
  const trainer=new THREE.Group();trainer.name='NOR_TRAINER_'+idx;trainer.position.set(-3.7,.24,z);g.add(trainer);box(trainer,'BASE',[1.48,.12,.52],[0,0,.92],metal);cyl(trainer,'FLYWHEEL',.46,.2,[0,.35,.92],carbon,[Math.PI/2,0,0],40);
  box(g,'TREAD_'+idx,[2.8,.13,1.1],[-9,.1,z],rubber);box(g,'TREAD_CONSOLE_'+idx,[.38,.32,.82],[-7.85,1.55,z],metal,[0,0,-.1]);
  pick(pickables,bike,'three-lanes','Training lane '+idx);pick(pickables,trainer,'three-lanes','Training lane '+idx);obstacle(obstacles,-4,z,1.7);obstacle(obstacles,-9,z,1.5);
}
function rails(g,pickables,obstacles){[-4.2,0,4.2].forEach((z,i)=>bikeLane(g,i+1,z,pickables,obstacles))}

function protocol(g,pickables,obstacles){
  const steel=mat(C.steel,.29,.76),oak=mat(C.oak,.68),paper=mat('#c9c4b9',.94),glass=phys({color:'#bfe6ed',roughness:.13,transmission:.7,transparent:true,opacity:.55,ior:1.45});
  box(g,'PROTOCOL_TOP',[4.5,.18,2.8],[2.1,1.12,0],oak);box(g,'PROTOCOL_LEG',[.16,1.06,2.4],[.3,.53,0],steel);box(g,'PROTOCOL_LEG',[.16,1.06,2.4],[3.9,.53,0],steel);
  const analyzer=box(g,'LACTATE_ANALYZER',[.68,.32,.52],[1,1.4,-.38],mat('#1a2328',.42,.35));
  const screen=box(g,'ANALYZER_SCREEN',[.48,.025,.25],[1,1.58,-.22],new THREE.MeshStandardMaterial({color:'#153642',emissive:new THREE.Color(C.ocean),emissiveIntensity:.55,roughness:.35}),[Math.PI/2-.18,0,0]);
  const rack=box(g,'VIAL_RACK',[1.05,.1,.42],[2.2,1.29,.43],steel);for(let r=0;r<2;r++)for(let c=0;c<6;c++)cyl(g,'SAMPLE_VIAL',.035,.23,[1.82+c*.15,1.46,.3+r*.2],glass,[],16);
  for(let i=0;i<4;i++)box(g,'PROTOCOL_CARD',[.72,.015,.5],[.85+i*.56,1.25,.9],paper,[0,.04*(i%2?1:-1),.02*i]);
  const p=panel(['MEASURE.','ADAPT.'],'PROTOCOL TABLE','Shared system. Individual execution.',C.ocean,3.6,1.4);p.position.set(2.1,3.15,-11.73);g.add(p);
  pick(pickables,analyzer,'lactate-kit','Lactate analyzer');pick(pickables,screen,'lactate-kit','Lactate analyzer');pick(pickables,rack,'lactate-kit','Sample rack');obstacle(obstacles,2.1,0,2);
}

function altitude(g,pickables,obstacles,lite){
  const bay=new THREE.Group();bay.name='ALTITUDE_GLASSHOUSE';g.add(bay);
  const steel=mat('#465158',.28,.78),glass=phys({color:'#9ecbd4',roughness:.1,transmission:lite?.35:.68,transparent:true,opacity:lite?.28:.42,ior:1.46,thickness:.06});
  for(const x of [7,12.2])for(const z of [-8.2,-2])box(bay,'ALT_POST',[.1,5.15,.1],[x,2.575,z],steel);
  box(bay,'ALT_BACK',[5.2,5.15,.06],[9.6,2.575,-8.2],glass);box(bay,'ALT_SIDE',[.06,5.15,6.2],[12.2,2.575,-5.1],glass);box(bay,'ALT_SIDE',[.06,5.15,6.2],[7,2.575,-5.1],glass);box(bay,'ALT_TOP',[5.2,.06,6.2],[9.6,5.15,-5.1],glass);
  const ctrl=box(bay,'ALT_CONTROL',[.78,1.16,.22],[11.78,1.65,-7.7],mat('#182126',.38,.52));const sign=badge('ALTITUDE / ENVIRONMENT',3.5,.5,C.glacier);sign.position.set(9.6,4.65,-8.16);bay.add(sign);
  pick(pickables,ctrl,'altitude-bay','Altitude Glasshouse');obstacle(obstacles,9.6,-5.1,2.6);
}

function heatCool(g,pickables,obstacles,lite){
  const steel=mat('#3e494f',.28,.82),dark=mat('#13191c',.52,.35),paper=mat('#d8d2c8',.94),fans=new THREE.Group();fans.name='HEAT_COOL_FANS';g.add(fans);
  [2.6,5.8].forEach((z,i)=>{const rim=new THREE.Mesh(new THREE.TorusGeometry(.7,.055,12,48),dark);rim.position.set(10.4,1.6,z);rim.rotation.y=Math.PI/2;fans.add(rim);cyl(fans,'FAN_HUB',.12,.18,[10.4,1.6,z],steel,[0,0,Math.PI/2],24);for(let b=0;b<6;b++){const a=b*Math.PI*2/6;box(fans,'FAN_BLADE',[.03,.24,.06],[10.32,1.6+.25*Math.sin(a),z+.25*Math.cos(a)],steel,[a,0,0])}});
  const hot=new THREE.MeshStandardMaterial({color:'#321608',emissive:new THREE.Color(C.sunrise),emissiveIntensity:lite?.38:.92,roughness:.42});[2.8,3.35,3.9].forEach(z=>cyl(g,'HEAT_LAMP',.1,1,[13.2,4.85,z],hot,[Math.PI/2,0,0],20));
  box(g,'TOWEL_RAIL',[.15,.15,2.5],[12,2.22,5.8],steel);box(g,'TOWEL',[.05,1.55,1.2],[12,1.44,5.8],paper);
  pick(pickables,fans,'heat-cool','Heat / Cool');obstacle(obstacles,10.4,4.2,1.7);
}

function vault(g,pickables,obstacles,lite){
  const V=new THREE.Group();V.name='PODIUM_VAULT';g.add(V);
  const b18=new THREE.Group();b18.name='BERMUDA_2018';b18.position.set(-1.3,3.2,11.63);V.add(b18);
  [[-1.25,C.gold,'1 · STORNES'],[0,C.silver,'2 · BLU'],[1.25,C.bronze,'3 · IDEN']].forEach(v=>{const d=cyl(b18,'BERMUDA_DISC',.55,.1,[v[0],0,0],mat(v[1],.26,.86),[Math.PI/2,0,0],48);const s=badge(v[2],1.35,.32,C.sand);s.position.set(v[0],-.86,.04);b18.add(s);});
  const nice=new THREE.Group();nice.name='NICE_2025';nice.position.set(4,.25,10.95);V.add(nice);
  [[-1.35,C.gold,2.9,'1 · STORNES'],[0,C.silver,2.55,'2 · IDEN'],[1.35,C.bronze,2.3,'3 · BLU']].forEach(v=>{box(nice,'NICE_BLADE',[.78,v[2],.22],[v[0],v[2]/2,0],mat(v[1],.28,.8));const s=badge(v[3],1.25,.34,C.sand);s.position.set(v[0],v[2]+.3,.13);nice.add(s)});
  const h=panel(['2018 BERMUDA','2025 NICE'],'PODIUM VAULT','Shared sweeps before individual shelves.',C.sunrise,6,1.45);h.position.set(1.8,5.15,11.72);V.add(h);
  pick(pickables,b18,'bermuda-2018','Bermuda 2018 sweep');pick(pickables,nice,'nice-2025','Nice 2025 sweep');obstacle(obstacles,3,10.4,2.6);
  const warm=new THREE.SpotLight('#ffc18e',lite?18:30,18,Math.PI/6,.55,1.5);warm.position.set(2.4,5.8,7);warm.target.position.set(2.5,2.5,11.2);g.add(warm,warm.target);
}

function fjord(g,pickables,obstacles,lite){
  const stone=mat('#1c272c',.91,.02),oak=mat(C.oak,.68),steel=mat('#3d474d',.32,.78),relief=new THREE.Group();relief.name='FJORD_RELIEF';g.add(relief);
  for(let i=0;i<19;i++){const z=7+i*.25,x=-8.3+Math.sin(i*.72)*1.15,h=.25+.18*(1+Math.sin(i*.91));box(relief,'TOPO_LAYER',[5.2-i*.1,h,.08],[x,1.05+h,z],stone,[0,0,.02*Math.sin(i)])}
  box(g,'FJORD_BENCH',[6.4,.4,1.1],[-8.1,.42,8.8],oak);[-10.6,-8.1,-5.6].forEach(x=>box(g,'BENCH_LEG',[.2,.8,.94],[x,.2,8.8],steel));
  const rm=new THREE.MeshBasicMaterial({color:C.glacier,transparent:true,opacity:lite?.1:.2,toneMapped:false}),rain=new THREE.Group();rain.name='RAIN_LIGHT';g.add(rain);for(let i=0;i<28;i++)box(rain,'RAIN_LINE',[.014,3.5,.014],[-11.5+i*.25,3,11.62],rm,[0,0,.02*Math.sin(i)]);
  pick(pickables,relief,'fjord-wall','Fjord Wall');obstacle(obstacles,-8.1,8.8,2.8);
}
function kona(g,pickables){const s=badge('KONA',1.9,.55,C.sand);s.position.set(-7.8,2.15,-11.7);g.add(s);pick(pickables,s,'kona-line','Kona Line')}

export function buildNorwegianEngine({scene,lite=false,pickables=[],obstacles=[]}={}){
  const group=new THREE.Group();group.name='NOR3_NORWEGIAN_ENGINE';scene?.add?.(group);
  shell(group,lite);rainLock(group,pickables,lite);rails(group,pickables,obstacles);protocol(group,pickables,obstacles);altitude(group,pickables,obstacles,lite);heatCool(group,pickables,obstacles,lite);vault(group,pickables,obstacles,lite);fjord(group,pickables,obstacles,lite);kona(group,pickables);
  group.userData.productionCandidate=true;group.userData.publicNavigation=false;group.userData.roomId='athlete-norway-trio-engine-room-v1';
  return {group,pickables,obstacles,zones:NOR_ENGINE_ZONES,entry:NOR_ENGINE_ENTRY,bounds:NOR_ENGINE_BOUNDS,productionCandidate:true,publicNavigation:false,defaultCamera:{position:new THREE.Vector3(-12,3.5,9.5),target:new THREE.Vector3(-1,1.4,-.3)}};
}

export function disposeNorwegianEngine(built){
  const group=built?.group;if(!group)return;
  group.traverse(o=>{if(!o.isMesh)return;o.geometry?.dispose?.();const ms=Array.isArray(o.material)?o.material:[o.material];for(const m of ms){if(!m)continue;for(const k of ['map','emissiveMap','normalMap','roughnessMap','metalnessMap','alphaMap'])m[k]?.dispose?.();m.dispose?.()}});
  group.removeFromParent();
}
