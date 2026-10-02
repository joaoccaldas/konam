import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildBeastCave } from './beast-cave.js';

const host=document.getElementById('stage');
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=.92;
renderer.shadowMap.enabled=!matchMedia('(pointer:coarse)').matches;
renderer.shadowMap.type=THREE.PCFShadowMap;
host.append(renderer.domElement);

const scene=new THREE.Scene();
scene.background=new THREE.Color('#090909');
scene.fog=new THREE.FogExp2('#090909',.015);

const pmrem=new THREE.PMREMGenerator(renderer);
const env=new RoomEnvironment();
scene.environment=pmrem.fromScene(env).texture;
env.dispose();pmrem.dispose();

const camera=new THREE.PerspectiveCamera(52,innerWidth/innerHeight,.08,120);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;
controls.dampingFactor=.065;
controls.maxPolarAngle=Math.PI*.49;
controls.minDistance=1.2;
controls.maxDistance=31;

const pickables=[],obstacles=[];
const lite=matchMedia('(pointer:coarse)').matches || innerWidth<700;
const built=buildBeastCave({scene,lite,pickables,obstacles});

const PRESETS=Object.freeze({
  overview:{p:[-11.7,3.15,8.8],t:[-.8,1.25,-.8]},
  trainer:{p:[-7.2,2.25,1.7],t:[-2.1,1.15,-2.1]},
  heat:{p:[5.0,2.35,-.4],t:[9.8,1.1,-3.7]},
  runlab:{p:[5.0,2.25,4.4],t:[9.1,.9,1.0]},
  gear:{p:[5.7,2.30,4.2],t:[10.3,1.65,8.55]},
  gallery:{p:[-1.0,2.45,5.6],t:[0.1,2.75,10.65]},
  recovery:{p:[6.0,2.0,4.25],t:[2.3,.72,8.35]},
  kona:{p:[-3.6,2.15,4.7],t:[-7.4,2.55,10.72]},
  threshold:{p:[-11.0,2.4,-5.6],t:[-13.6,2.4,-1.0]}
});

function vec(a){return new THREE.Vector3(...a)}
function setPose(name,instant=false){
  const preset=PRESETS[name]||PRESETS.overview;
  const p=vec(preset.p),t=vec(preset.t);
  if(instant){
    camera.position.copy(p);
    controls.target.copy(t);
    controls.update();
    return Promise.resolve();
  }
  return new Promise(resolve=>{
    const start=camera.position.clone(),from=controls.target.clone();
    const t0=performance.now(),dur=900;
    const ease=x=>1-Math.pow(1-x,3);
    function step(now){
      const k=Math.min(1,(now-t0)/dur),e=ease(k);
      camera.position.lerpVectors(start,p,e);
      controls.target.lerpVectors(from,t,e);
      controls.update();
      if(k<1)requestAnimationFrame(step); else resolve();
    }
    requestAnimationFrame(step);
  });
}
setPose('overview',true);

const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();
renderer.domElement.addEventListener('pointerup',ev=>{
  const r=renderer.domElement.getBoundingClientRect();
  mouse.x=(ev.clientX-r.left)/r.width*2-1;
  mouse.y=-((ev.clientY-r.top)/r.height*2-1);
  ray.setFromCamera(mouse,camera);
  const hit=ray.intersectObjects(pickables,true).find(x=>x.object.userData?.beastCave);
  const card=document.getElementById('inspect');
  if(!hit){card.style.display='none';return;}
  const d=hit.object.userData.beastCave;
  document.getElementById('inspectTitle').textContent=d.label||d.hotspot;
  document.getElementById('inspectBody').textContent={
    'zwift-console':'Controlled training, repeatable work and the companion that keeps the room moving.',
    'speedmax':'Hero bike slot. Current room uses procedural candidate geometry until the exact sourced race-bike GLB is approved.',
    'fans':'Cooling and heat work become part of the room rather than invisible preparation.',
    'run-lab':'The treadmill completes the bike + run training loop inside the cave.',
    'iterations-gallery':'Race chapters shown as original art treatments rather than copied event photography.',
    'sculpture-gap':'The unresolved distance between almost and done.',
    'sculpture-repeat':'Repetition with feedback rather than repetition for its own sake.',
    'sculpture-silver':'Useful information inside an imperfect outcome.',
    'kona-window':'Every training zone ultimately points back toward Kona.'
  }[d.hotspot]||'Production-candidate story object.';
  card.style.display='block';
});

for(const name of ['overview','trainer','runlab','gallery','gear','kona']){
  const el=document.getElementById(name);
  if(el) el.onclick=()=>setPose(name,false);
}

addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});

let frames=0;
function frame(){
  controls.update();
  renderer.render(scene,camera);
  frames++;
  if(frames===3) window.__BEAST_CAVE_RENDER_READY=true;
  requestAnimationFrame(frame);
}
frame();

window.__BEAST_CAVE_REVIEW={scene,camera,controls,built,pickables,obstacles,presets:PRESETS,setPose,renderer};
