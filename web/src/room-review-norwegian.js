import * as THREE from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {buildInstallation} from './engine/room-installations.js';
import {loadSpeedmax} from './exp/engine.js';

const canvas=document.querySelector('[data-room-canvas]');
const loading=document.querySelector('[data-room-loading]');
const label=document.querySelector('[data-room-label]');
const copy=document.querySelector('[data-room-copy]');
const buttons=[...document.querySelectorAll('[data-view]')];
const coarse=matchMedia('(pointer:coarse)').matches;
const small=Math.min(innerWidth,innerHeight)<700;
const lite=coarse||small;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;

const renderer=new THREE.WebGLRenderer({canvas,antialias:!lite,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,lite?1.45:2));
renderer.setSize(innerWidth,innerHeight,false);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.AgXToneMapping;
renderer.toneMappingExposure=.92;
renderer.shadowMap.enabled=!lite;
renderer.shadowMap.type=THREE.PCFShadowMap;

const scene=new THREE.Scene();
scene.background=new THREE.Color('#05090b');
scene.fog=new THREE.FogExp2('#071014',lite?.009:.012);
const pmrem=new THREE.PMREMGenerator(renderer);
scene.environment=pmrem.fromScene(new RoomEnvironment(),.025).texture;

const camera=new THREE.PerspectiveCamera(small?56:(lite?60:54),innerWidth/innerHeight,.08,100);
const target=new THREE.Vector3(0,1.30,-.20);
let yaw=.02,pitch=-.055,distance=lite?13.4:14.2;
function updateCamera(drift=0){
  const cp=Math.cos(pitch),yy=yaw+drift;
  camera.position.set(target.x+Math.sin(yy)*cp*distance,target.y+Math.sin(pitch)*distance,target.z-Math.cos(yy)*cp*distance);
  camera.lookAt(target);
}
updateCamera();

const room=new THREE.Group();room.name='review-host-room';scene.add(room);
const bounds={x0:-6.8,x1:6.8,z0:-5.4,z1:5.4};
const Y=0,cx=0,cz=0,rw=13.6,rd=10.8;
const wallH=5.6;
const stone=new THREE.MeshStandardMaterial({color:'#0c1113',roughness:.98,metalness:.02});
const floorMat=new THREE.MeshPhysicalMaterial({color:'#090d0f',roughness:.62,metalness:.06,clearcoat:.16,clearcoatRoughness:.72,envMapIntensity:.62});
const backMat=new THREE.MeshStandardMaterial({color:'#111719',roughness:.99,metalness:.01});
function addBox(w,h,d,x,y,z,mat=stone){
  const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
  o.position.set(x,y,z);o.receiveShadow=true;o.castShadow=!lite;room.add(o);return o;
}
const floor=addBox(rw,.12,rd,cx,-.06,cz,floorMat);floor.userData.floor=true;
addBox(rw,wallH,.34,cx,wallH/2,bounds.z1,backMat);
addBox(.34,wallH,rd,bounds.x0,wallH/2,cz,backMat);
addBox(.34,wallH,rd,bounds.x1,wallH/2,cz,backMat);
const shellSteel=new THREE.MeshStandardMaterial({color:'#171d20',roughness:.56,metalness:.66});
const smokedOak=new THREE.MeshStandardMaterial({color:'#26170f',roughness:.84,metalness:0});
for(let i=0;i<9;i++){
  const beam=addBox(rw-.7,.10,.16,cx,wallH-.24,bounds.z0+.72+i*((rd-1.44)/8),shellSteel);
  beam.castShadow=false;
}
for(const x of [bounds.x0+.72,bounds.x1-.72]){
  addBox(.42,4.35,.72,x,2.18,cz,stone);
  addBox(.18,3.55,rd-1.4,x+(x<0?.34:-.34),1.78,cz,smokedOak);
}
addBox(rw-2.2,.22,.62,cx,.18,bounds.z1-.62,stone);
addBox(rw-3.0,.10,.34,cx,.36,bounds.z1-.66,smokedOak);
const obstacles=[];
const specimen=new THREE.Vector3(.55,Y,cz);
const L=buildInstallation('norwegian',{group:room,bounds,elevation:Y,specimen,lite,obstacles,floorMat,seed:401});
// The installation uses explicit contact shadows and reflected light for most grounding.
 // Per-mesh shadow casting turns a ~200-mesh room into hundreds of extra shadow draw calls.
 // Keep the review physically legible while reserving real-time shadow work for future hero assets.
room.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=true}});

// The room owns only the three specimen anchors. Bike identity/loading remains canonical.
// One neutral CFR study is cloned into all lanes; athlete-specific equipment/liveries stay
// unassigned until sourced and rights-cleared.
async function mountCanonicalSpecimens(){
  if(!L.specimenSlots?.length)return;
  try{
    const canonical=await loadSpeedmax('assets/museum/speedmax_web.glb',{shadows:!lite});
    const horizontal=Math.max(canonical.size.x,canonical.size.z)||1;
    const scale=1.72/horizontal;
    for(const slot of L.specimenSlots){
      const holder=canonical.holder.clone(true);
      holder.scale.setScalar(scale);
      holder.rotation.y=Math.PI/2;
      holder.position.copy(slot);
      holder.position.y+=.02;
      holder.userData.nor3CanonicalSpecimen=true;
      holder.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=true}});
      room.add(holder);
    }
    room.traverse(o=>{if(o.userData?.nor3BikeFallback)o.visible=false;});
  }catch(error){
    console.warn('NOR // 3 canonical bike unavailable; keeping neutral fallback study',error);
  }
}
mountCanonicalSpecimens();

// Host lighting: restrained ambient, directional moon/cold key and warm/cool cross-light.
scene.add(new THREE.HemisphereLight('#6f858d','#090705',lite?.42:.34));
const key=new THREE.DirectionalLight('#d7e8ec',lite?1.35:1.85);key.position.set(-5.4,7.6,-6.4);key.castShadow=false;scene.add(key);
const warm=new THREE.PointLight('#d45a25',lite?3.8:6.5,13,2.0);warm.position.set(5.0,3.2,4.2);scene.add(warm);
const rim=new THREE.PointLight('#7fb9c5',lite?3.6:6.2,13,2.0);rim.position.set(-5.2,3.8,-4.0);scene.add(rim);
const doorway=new THREE.SpotLight('#c7e8ef',lite?10:18,16,Math.PI*.20,.62,1.45);
doorway.position.set(0,4.8,-8.4);doorway.target.position.set(0,1.1,.25);scene.add(doorway,doorway.target);

const views={
  overview:{target:[-.10,1.34,.05],yaw:.02,pitch:-.060,distance:small?10.8:(lite?11.8:12.35),title:'NOR // 3',copy:'Three lanes. One system. Wet basalt, blackened steel, glass, timber and enough imperfection to feel inhabited.'},
  lanes:{target:[-1.00,1.18,0],yaw:-.10,pitch:-.070,distance:small?7.25:8.35,title:'Three Rails',copy:'Three distinct athlete stations share one measured system. Each lane has a trainer, run deck, generic bike slot and traces of use.'},
  protocol:{target:[2.25,1.38,.05],yaw:.68,pitch:-.06,distance:small?3.85:4.7,title:'Protocol Table',copy:'A working bench with analyzer, instanced samples, paper protocols and a physical data wall. No fake holograms.'},
  altitude:{target:[3.05,1.40,-1.90],yaw:.62,pitch:-.03,distance:4.25,title:'Environment Bay',copy:'Framed low-iron glass, internal haze, controls and cool reflections make the environmental chamber feel physically present.'},
  vault:{target:[2.35,2.35,2.78],yaw:.42,pitch:.02,distance:4.5,title:'Podium Vault',copy:'Abstract result objects sit inside a dark shadow-gap cabinet. Achievement is present without copying medals or trophies.'},
  fjord:{target:[5.42,1.52,.02],yaw:-.60,pitch:-.035,distance:4.05,title:'Fjord Relief',copy:'Wall-mounted contour ribs catch a cold grazing light so the Norwegian landscape reads as physical memory, not borrowed imagery.'},
  kona:{target:[5.48,2.96,.02],yaw:-.46,pitch:-.020,distance:3.55,title:'Kona Line',copy:'The cold performance room resolves into one warm physical route: Kona ahead, never wallpaper.'},
  recovery:{target:[.95,.70,-2.55],yaw:-.58,pitch:-.10,distance:4.75,title:'Recovery Corner',copy:'Bench, rollers and bottles are intentionally ordinary. Tiny signs of use are what stop the room feeling like a sterile render.'}
};
const trailerOrder=['overview','lanes','protocol','altitude','vault','fjord','recovery','kona'];
let anim=null,trailer=false,trailerIndex=0,trailerAt=0,lastHuman=performance.now();

function setView(id,{fromTrailer=false}={}){
  if(id==='trailer'){
    trailer=!trailer;
    buttons.find(b=>b.dataset.view==='trailer')?.setAttribute('aria-pressed',String(trailer));
    if(trailer){
      trailerIndex=0;trailerAt=performance.now()-3400;
      label.textContent='Cinematic pass';
      copy.textContent='A slow room tour through training, protocol, environment, recovery and the Kona line.';
    }
    return;
  }
  if(!fromTrailer) trailer=false;
  buttons.forEach(b=>{
    if(b.dataset.view!=='trailer')b.setAttribute('aria-pressed',String(b.dataset.view===id));
    else if(!trailer)b.setAttribute('aria-pressed','false');
  });
  const v=views[id]||views.overview;
  label.textContent=v.title;copy.textContent=v.copy;
  const from={target:target.clone(),yaw,pitch,distance};
  const to={target:new THREE.Vector3(...v.target),yaw:v.yaw,pitch:v.pitch,distance:v.distance,start:performance.now(),duration:fromTrailer?1500:820};
  anim={from,to};
}
buttons.forEach(b=>b.addEventListener('click',()=>{lastHuman=performance.now();setView(b.dataset.view)}));

// Object inspection through room-owned semantic pickables.
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
function inspectAt(clientX,clientY){
  const rect=canvas.getBoundingClientRect();
  pointer.set(((clientX-rect.left)/rect.width)*2-1,-((clientY-rect.top)/rect.height)*2+1);
  raycaster.setFromCamera(pointer,camera);
  const hits=raycaster.intersectObjects(L.reviewPickables||[],true);
  const hit=hits.find(h=>h.object?.userData?.review || h.object?.parent?.userData?.review);
  if(!hit)return false;
  let o=hit.object;while(o&&!o.userData?.review)o=o.parent;
  if(!o?.userData?.review)return false;
  trailer=false;
  label.textContent=o.userData.review.title;
  copy.textContent=o.userData.review.body;
  return true;
}

const pointers=new Map();
let dragging=false,lx=0,ly=0,moved=0,pinchDistance=0;
canvas.addEventListener('pointerdown',e=>{
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  dragging=true;lx=e.clientX;ly=e.clientY;moved=0;lastHuman=performance.now();trailer=false;
  canvas.setPointerCapture(e.pointerId);
  if(pointers.size===2){
    const [a,b]=[...pointers.values()];
    pinchDistance=Math.hypot(a.x-b.x,a.y-b.y);
  }
});
canvas.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId))return;
  const prior=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===2){
    const [a,b]=[...pointers.values()],d=Math.hypot(a.x-b.x,a.y-b.y);
    if(pinchDistance>0){distance=Math.max(3.2,Math.min(14,distance-(d-pinchDistance)*.012));anim=null}
    pinchDistance=d;return;
  }
  if(!dragging)return;
  const dx=e.clientX-lx,dy=e.clientY-ly;lx=e.clientX;ly=e.clientY;moved+=Math.hypot(dx,dy);
  yaw-=dx*.006;pitch=Math.max(-.62,Math.min(.38,pitch-dy*.004));anim=null;
  prior.x=e.clientX;prior.y=e.clientY;
});
function endPointer(e){
  if(moved<8&&pointers.size===1)inspectAt(e.clientX,e.clientY);
  pointers.delete(e.pointerId);dragging=pointers.size>0;if(pointers.size<2)pinchDistance=0;
}
canvas.addEventListener('pointerup',endPointer);
canvas.addEventListener('pointercancel',endPointer);
canvas.addEventListener('wheel',e=>{distance=Math.max(3.2,Math.min(14,distance+e.deltaY*.007));anim=null;lastHuman=performance.now();trailer=false},{passive:true});

addEventListener('resize',()=>{
  renderer.setPixelRatio(Math.min(devicePixelRatio,lite?1.45:2));renderer.setSize(innerWidth,innerHeight,false);
  camera.aspect=innerWidth/innerHeight;camera.fov=innerHeight>innerWidth?(small?55:(lite?62:61)):(lite?54:52);camera.updateProjectionMatrix();
});

const clock=new THREE.Clock();
function frame(now){
  if(trailer&&!reduced&&now-trailerAt>3600){
    const id=trailerOrder[trailerIndex%trailerOrder.length];trailerIndex++;trailerAt=now;setView(id,{fromTrailer:true});trailer=true;
    buttons.find(b=>b.dataset.view==='trailer')?.setAttribute('aria-pressed','true');
  }
  if(anim){
    const u=Math.min(1,(now-anim.to.start)/anim.to.duration),e=1-Math.pow(1-u,3);
    target.lerpVectors(anim.from.target,anim.to.target,e);
    yaw=THREE.MathUtils.lerp(anim.from.yaw,anim.to.yaw,e);pitch=THREE.MathUtils.lerp(anim.from.pitch,anim.to.pitch,e);distance=THREE.MathUtils.lerp(anim.from.distance,anim.to.distance,e);
    if(u>=1)anim=null;
  }
  const t=clock.getElapsedTime();
  const idle=!dragging&&!anim&&!trailer&&now-lastHuman>1800&&!reduced;
  updateCamera(idle?Math.sin(t*.18)*.010:0);
  for(const m of L.motes||[])m.step?.(t);
  if(!reduced)for(const [i,f] of (L.fanRotors||[]).entries())f.o.rotation.x=t*(1.55+i*.16);
  renderer.render(scene,camera);
  requestAnimationFrame(frame);
}
setView('overview');
loading.hidden=true;
requestAnimationFrame(frame);
window.__NOR3_REVIEW_READY=true;
window.__NOR3_REVIEW_API={
  setView:(id)=>setView(id),
  render:()=>renderer.render(scene,camera),
  metrics:()=>{
    renderer.render(scene,camera);
    let meshes=0,lights=0,materials=new Set(),geometries=new Set(),textures=new Set();
    room.traverse(o=>{
      if(o.isMesh){
        meshes++;geometries.add(o.geometry.uuid);
        const ms=Array.isArray(o.material)?o.material:[o.material];
        for(const m of ms){if(!m)continue;materials.add(m.uuid);if(m.map)textures.add(m.map.uuid);if(m.normalMap)textures.add(m.normalMap.uuid);if(m.roughnessMap)textures.add(m.roughnessMap.uuid);}
      }
      if(o.isLight)lights++;
    });
    const info=renderer.info.render;
    return {
      lite,
      variant:'cinematic-production-v3',
      objects:room.children.length,
      meshes,
      lights,
      pickables:(L.reviewPickables||[]).length,
      unique_geometries:geometries.size,
      unique_materials:materials.size,
      textures:textures.size,
      draw_calls:info.calls,
      triangles:info.triangles,
      points:info.points,
      lines:info.lines
    };
  }
};
window.__NOR3_REVIEW_METRICS=window.__NOR3_REVIEW_API.metrics();
