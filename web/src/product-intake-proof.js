// Test-only Product Intake Proof V0.
// Reuses the production data-driven wing engine. Candidate identity/asset paths come only from metadata.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildWings } from './engine/wing.js';
import { FONT, SERIF } from './engine/type.js';

window.__intakeStage('SCRIPT_START');
window.__intakeStage('THREE_READY',{revision:THREE.REVISION});
const DATA=window.__INTAKE_PROOF;
const params=new URLSearchParams(location.search);
const mode=params.get('mode')||'both';
const candidateIndex=Number.parseInt(params.get('candidate')||'',10);
const allProducts=DATA.products;
const products=mode==='harness' ? [] :
  mode==='single' && Number.isInteger(candidateIndex) ? [allProducts[candidateIndex]].filter(Boolean) :
  allProducts;
window.__intakeStage('MODE_READY',{mode,candidateIndex:Number.isInteger(candidateIndex)?candidateIndex:null,productIds:products.map(p=>p.id)});
const productById=Object.fromEntries(products.map(p=>[p.id,p]));
const roomByProduct=new Map(DATA.rooms.flatMap(r=>r.products.map(id=>[id,r.id])));
const canvas=document.getElementById('proof');
let renderer;
try{
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  window.__intakeStage('RENDERER_READY',{webgl:renderer.capabilities.isWebGL2?'webgl2':'webgl1'});
}catch(e){
  window.__intakeError('renderer',e);
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.setSize(innerWidth,innerHeight,false);
const scene=new THREE.Scene();
scene.background=new THREE.Color('#dfe7e8');
scene.environment=new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(),.04).texture;
const camera=new THREE.PerspectiveCamera(52,innerWidth/innerHeight,.08,120);
camera.position.set(14,8,19);
const controls=new OrbitControls(camera,canvas);
controls.enableDamping=true; controls.target.set(2,1.5,7); controls.minDistance=3; controls.maxDistance=35;
scene.add(new THREE.HemisphereLight('#ffffff','#766d64',1.7));
const key=new THREE.DirectionalLight('#ffffff',2.4); key.position.set(8,12,6); scene.add(key);
const pickables=[],obstacles=[];

function lettering(w,h,draw,res=512){
  const c=document.createElement('canvas'); c.width=res; c.height=Math.max(64,Math.round(res*h/w));
  const g=c.getContext('2d'); g.setTransform(c.width/w,0,0,c.width/w,0,0); draw(g);
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace;
  const m=new THREE.MeshBasicMaterial({map:t,transparent:true,side:THREE.DoubleSide});
  return new THREE.Mesh(new THREE.PlaneGeometry(w,h),m);
}

const wing={
  id:'product-intake-proof-v0',name:'Product Intake Proof',sub:'asset + metadata + room assignment',
  floor:'test',y:0,height:4.4,
  corridor:{x0:0,x1:4,z0:0,z1:14,style:'gallery'},
  sides:{west:{x0:-6,x1:0},east:{x0:4,x1:10}},
  doors:{south:{x0:1,x1:3,depth:0}},
  rooms:DATA.rooms.map((r,i)=>({
    id:r.id,name:r.title,sub:r.story,side:i%2?'west':'east',
    z0:i?7.2:.5,z1:i?13.5:6.8,
    wall:r.design.wall,ink:'#182126',tint:r.design.accent,
    design:r.design
  }))
};
const exhibits=products.map(p=>({
  key:p.id,name:`${p.brand} ${p.model}`,era:p.representation,kind:'named',
  room:roomByProduct.get(p.id),skins:[]
}));
let atlas;
try{
  atlas=buildWings({scene,lettering,FONT,SERIF,lite:false,pickables,obstacles,contactShadow:null},
    {wings:[wing],bikes:exhibits,paintings:[],sculptures:[],extraRefs:[]});
  window.__intakeStage('WING_BUILT',{rooms:atlas.rooms.length,exhibits:atlas.bikes.length});
}catch(e){
  window.__intakeError('buildWings',e);
  throw e;
}

const gltf=new GLTFLoader(); gltf.setMeshoptDecoder(MeshoptDecoder);
const requested=[];
const adapter={
  async loadAsync(url){
    const m=url.match(/^assets\/atlas\/(.+)\/bike\.glb$/);
    const p=m && productById[m[1]];
    if(!p) throw new Error(`unknown test product request: ${url}`);
    requested.push(p.asset_path);
    return gltf.loadAsync(p.asset_path);
  }
};

let loaded=false,loadError=null,loadStart=0,loadEnd=0;
document.getElementById('loadCandidates').onclick=async()=>{
  if(loaded||loadError)return;
  window.__intakeStage('CANDIDATE_LOAD_START',{mode});
  loadStart=performance.now();
  try {
    await atlas.load(adapter);
    loadEnd=performance.now(); loaded=true;
    window.__intakeStage('CANDIDATE_LOAD_COMPLETE',{mode,ms:Math.round(loadEnd-loadStart),requested:[...requested]});
    document.body.classList.add('loaded');
    document.getElementById('loadCandidates').textContent='Candidates loaded';
  } catch(e) {
    loadEnd=performance.now(); loadError=String(e?.stack||e);
    window.__intakeError('candidate-load',e);
    document.getElementById('loadCandidates').textContent='Candidate load failed';
    console.error('intake candidate load',e);
  }
  window.dispatchEvent(new CustomEvent('intake-proof-loaded'));
};

const info=document.getElementById('info');
function inspect(inst){
  const p=productById[inst?.data?.key]; if(!p)return;
  info.hidden=false;
  info.querySelector('h2').textContent=`${p.brand} ${p.model}`;
  info.querySelector('[data-type]').textContent=`${p.type} · ${p.representation} · ${p.readiness}`;
  info.querySelector('[data-path]').textContent=p.asset_path;
  info.querySelector('[data-cap]').textContent=p.capabilities.join(' · ');
  info.querySelector('[data-source]').textContent=p.source_records.join(' · ');
  info.querySelector('[data-claim]').textContent=p.public_claim;
  info.dataset.productId=p.id;
}
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
canvas.addEventListener('pointerup',e=>{
  if(!loaded)return;
  const r=canvas.getBoundingClientRect();
  pointer.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);
  ray.setFromCamera(pointer,camera);
  const hit=ray.intersectObjects(pickables,true).find(h=>h.object.userData.wingBike);
  if(hit)inspect(hit.object.userData.wingBike);
});
function focusRoom(room){
  if(!room)return false;
  camera.position.copy(room.view).add(new THREE.Vector3(0,1.6,0));
  controls.target.copy(room.look);
  controls.update();
  return true;
}
function modelStatus(id){
  const inst=atlas.bikes.find(x=>x.data.key===id);
  if(!inst?.bike)return {exists:!!inst,loaded:false};
  scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(inst.bike),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  const ndc=center.clone().project(camera);
  return {exists:true,loaded:true,size:{x:size.x,y:size.y,z:size.z},center:{x:center.x,y:center.y,z:center.z},ndc:{x:ndc.x,y:ndc.y,z:ndc.z},onscreen:Math.abs(ndc.x)<=1&&Math.abs(ndc.y)<=1&&ndc.z>=-1&&ndc.z<=1};
}
document.querySelectorAll('[data-room]').forEach(b=>b.onclick=()=>focusRoom(atlas.rooms.find(r=>r.id===b.dataset.room)));

function focusProduct(id){
  const inst=atlas.bikes.find(x=>x.data.key===id);
  if(!inst?.turn)return false;
  scene.updateMatrixWorld(true); inst.turn.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(inst.turn);
  if(box.isEmpty())return false;
  const sphere=box.getBoundingSphere(new THREE.Sphere());
  const center=sphere.center;
  const radius=Math.max(sphere.radius,.25);
  const vFov=THREE.MathUtils.degToRad(camera.fov);
  const hFov=2*Math.atan(Math.tan(vFov/2)*Math.max(camera.aspect,.1));
  const limitingFov=Math.max(.12,Math.min(vFov,hFov));
  const dist=Math.max(radius/Math.sin(limitingFov/2)*1.18,radius*2.8,1.8);
  const opening=inst.room?.face===-1?-1:1;
  const dir=new THREE.Vector3(opening,.18,.12).normalize();
  camera.position.copy(center).addScaledVector(dir,dist);
  controls.target.copy(center);
  controls.minDistance=Math.max(.35,radius*.5);
  controls.maxDistance=Math.max(8,radius*12);
  camera.near=Math.max(.02,dist-radius*2.8);
  camera.far=Math.max(50,dist+radius*9);
  camera.updateProjectionMatrix();
  controls.update();
  camera.updateMatrixWorld(true);
  return true;
}
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}
addEventListener('resize',resize);
let frames=0,last=performance.now(),fpsWindow=[];
function loop(now){
  const dt=Math.min(.05,(now-last)/1000);last=now;controls.update();
  atlas.update(now/1000,dt,controls.target,true,true);
  renderer.render(scene,camera);frames++;
  if(frames===1){
    window.__intakeStage('FIRST_RENDER');
    window.__intakeProofReady=true;
    window.__intakeStage('PROOF_READY');
  }
  if(loaded){fpsWindow.push(dt);if(fpsWindow.length>180)fpsWindow.shift();}
  requestAnimationFrame(loop);
}

window.__intakeProof={
  DATA,mode,atlas,requested,diagnostics:window.__intakeProofDiagnostics,
  get loaded(){return loaded;},get loadError(){return loadError;},
  inspectById(id){const inst=atlas.bikes.find(x=>x.data.key===id);if(inst)inspect(inst);return !!inst;},
  focusById:focusProduct,
  modelStatus,
  metrics(){
    const avg=fpsWindow.length?fpsWindow.reduce((a,b)=>a+b,0)/fpsWindow.length:0;
    return {
      loaded,load_error:loadError,requested:[...requested],load_ms:loadEnd&&loadStart?Math.round(loadEnd-loadStart):null,
      draw_calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,
      fps_observed:avg?+(1/avg).toFixed(1):null,
      js_heap_bytes:performance.memory?.usedJSHeapSize??null
    };
  }
};
window.__intakeStage('PROOF_API_READY');
requestAnimationFrame(loop);
