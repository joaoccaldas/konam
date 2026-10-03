import * as THREE from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {buildNorwegianReview} from './review/norwegian-installation.snapshot.js';

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
renderer.toneMappingExposure=1.02;
renderer.shadowMap.enabled=!lite;
renderer.shadowMap.type=THREE.PCFShadowMap;

const scene=new THREE.Scene();
scene.background=new THREE.Color('#05090b');
scene.fog=new THREE.FogExp2('#081318',lite?.014:.018);
const pmrem=new THREE.PMREMGenerator(renderer);
scene.environment=pmrem.fromScene(new RoomEnvironment(),.04).texture;

const camera=new THREE.PerspectiveCamera(small?56:(lite?60:54),innerWidth/innerHeight,.08,100);
const target=new THREE.Vector3(0,1.30,-.20);
let yaw=.02,pitch=-.06,distance=lite?10.6:9.8;
function updateCamera(drift=0){
  const cp=Math.cos(pitch),yy=yaw+drift;
  camera.position.set(target.x+Math.sin(yy)*cp*distance,target.y+Math.sin(pitch)*distance,target.z-Math.cos(yy)*cp*distance);
  camera.lookAt(target);
}
updateCamera();

const room=new THREE.Group();room.name='review-host-room';scene.add(room);
const bounds={x0:-4.3,x1:4.3,z0:-3.4,z1:3.4};
const Y=0,cx=0,cz=0,rw=8.6,rd=6.8;
const stone=new THREE.MeshStandardMaterial({color:'#10171a',roughness:.90,metalness:.04});
const floorMat=new THREE.MeshPhysicalMaterial({color:'#0b1114',roughness:.32,metalness:.12,clearcoat:.58,clearcoatRoughness:.32,envMapIntensity:1.0});
const backMat=new THREE.MeshStandardMaterial({color:'#141c20',roughness:.93,metalness:.03});
function addBox(w,h,d,x,y,z,mat=stone){
  const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
  o.position.set(x,y,z);o.receiveShadow=true;o.castShadow=!lite;room.add(o);return o;
}
const floor=addBox(rw,.12,rd,cx,-.06,cz,floorMat);floor.userData.floor=true;
addBox(rw,4.25,.16,cx,2.12,bounds.z1,backMat);
addBox(.16,4.25,rd,bounds.x0,2.12,cz,backMat);
addBox(.16,4.25,rd,bounds.x1,2.12,cz,backMat);
for(let i=0;i<6;i++){
  const beam=addBox(rw-.5,.06,.08,cx,4.02,bounds.z0+.55+i*1.05,new THREE.MeshStandardMaterial({color:'#20292d',roughness:.48,metalness:.68}));
  beam.castShadow=false;
}
const obstacles=[];
const specimen=new THREE.Vector3(.55,Y,cz);
const L={id:'norwegian',group:room,floorMat,motes:[]};
const put=(mesh,x,y,z)=>{mesh.position.set(x,y,z);room.add(mesh);return mesh};
const box=(w,h,d,x,y,z,mat)=>put(new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat),x,y,z);
const r={id:'norwegian',z0:Math.max(bounds.z0,bounds.z1),z1:Math.min(bounds.z0,bounds.z1)};
buildNorwegianReview({r,rg:room,put,box,seed:401,lite,cx,cz,Y,rw,rd,specimen,obstacles,L,bounds});
room.traverse(o=>{if(o.isMesh){o.castShadow=!lite;o.receiveShadow=true}});

// Host lighting: restrained ambient, directional moon/cold key and warm/cool cross-light.
scene.add(new THREE.HemisphereLight('#8fb7c3','#160c08',lite?.72:.58));
const key=new THREE.DirectionalLight('#d3eef5',lite?1.15:1.52);key.position.set(-3.5,6,-4.5);key.castShadow=!lite;scene.add(key);
const warm=new THREE.PointLight('#ff6a22',lite?6:10,10,1.8);warm.position.set(3.6,2.7,2.7);scene.add(warm);
const rim=new THREE.PointLight('#6bc7da',lite?4.5:8,10,1.9);rim.position.set(-3.7,3.0,-2.6);scene.add(rim);
const doorway=new THREE.SpotLight('#c7e8ef',lite?10:18,16,Math.PI*.20,.62,1.45);
doorway.position.set(0,3.7,-5.8);doorway.target.position.set(0,1.0,.35);scene.add(doorway,doorway.target);

const views={
  overview:{target:[-.15,1.24,.05],yaw:.02,pitch:-.05,distance:small?6.55:(lite?9.1:9.5),title:'NOR // 3',copy:'Three lanes. One system. Wet basalt, blackened steel, glass, timber and enough imperfection to feel inhabited.'},
  lanes:{target:[-1.00,1.10,0],yaw:-.15,pitch:-.07,distance:small?5.05:6.65,title:'Three Rails',copy:'Three distinct athlete stations share one measured system. Each lane has a trainer, run deck, generic bike slot and traces of use.'},
  protocol:{target:[2.25,1.38,.05],yaw:.68,pitch:-.06,distance:small?3.85:4.7,title:'Protocol Table',copy:'A working bench with analyzer, instanced samples, paper protocols and a physical data wall. No fake holograms.'},
  altitude:{target:[3.05,1.40,-1.90],yaw:.62,pitch:-.03,distance:4.25,title:'Environment Bay',copy:'Framed low-iron glass, internal haze, controls and cool reflections make the environmental chamber feel physically present.'},
  vault:{target:[2.35,2.35,2.78],yaw:.42,pitch:.02,distance:4.5,title:'Podium Vault',copy:'Abstract result objects sit inside a dark shadow-gap cabinet. Achievement is present without copying medals or trophies.'},
  fjord:{target:[3.18,.95,.10],yaw:1.12,pitch:-.04,distance:4.25,title:'Fjord Relief',copy:'Twenty-five layered ridges turn the wall into a landscape memory, built as original geometry rather than borrowed imagery.'},
  kona:{target:[3.55,2.42,.05],yaw:1.05,pitch:.01,distance:4.55,title:'Kona Line',copy:'One thin warm line remains the destination signal. The room stays Nordic, physical and restrained.'},
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
window.__NOR3_REVIEW_METRICS={lite,objects:room.children.length,pickables:(L.reviewPickables||[]).length,variant:'cinematic-production-v3'};
