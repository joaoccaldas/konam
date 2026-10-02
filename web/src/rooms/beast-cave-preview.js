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
renderer.toneMappingExposure=.86;
renderer.shadowMap.enabled=!matchMedia('(pointer:coarse)').matches;
host.append(renderer.domElement);

const scene=new THREE.Scene();
scene.background=new THREE.Color('#090909');
scene.fog=new THREE.FogExp2('#090909',.018);

const pmrem=new THREE.PMREMGenerator(renderer);
const env=new RoomEnvironment();
scene.environment=pmrem.fromScene(env).texture;
env.dispose();pmrem.dispose();

const camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,.08,120);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;
controls.dampingFactor=.065;
controls.maxPolarAngle=Math.PI*.49;
controls.minDistance=1.2;
controls.maxDistance=28;
controls.target.set(-.8,1.2,-.8);

const pickables=[],obstacles=[];
const lite=matchMedia('(pointer:coarse)').matches || innerWidth<700;
const built=buildBeastCave({scene,lite,pickables,obstacles});
camera.position.copy(built.overview.position);
controls.target.copy(built.overview.target);
controls.update();

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
    'speedmax':'Hero bike slot. Prototype geometry now; sourced authored asset attaches only after explicit review.',
    'fans':'Cooling and heat work become part of the room rather than invisible preparation.',
    'run-lab':'The cave is not bike-only: the treadmill makes the training loop spatially complete.',
    'iterations-gallery':'Race chapters shown as original art treatments, not copied photographs.',
    'sculpture-gap':'The gap between almost and done. Deliberately unresolved.',
    'sculpture-repeat':'Training is repetition with feedback, not repetition for its own sake.',
    'sculpture-silver':'A visual shorthand for finding useful information inside an imperfect outcome.',
    'kona-window':'Every training zone ultimately points back toward Kona.'
  }[d.hotspot]||'Prototype story object.';
  card.style.display='block';
});

function pose(p,t){
  const start=camera.position.clone(),from=controls.target.clone();
  const t0=performance.now(),dur=900;
  const ease=x=>1-Math.pow(1-x,3);
  function step(now){
    const k=Math.min(1,(now-t0)/dur),e=ease(k);
    camera.position.lerpVectors(start,p,e);
    controls.target.lerpVectors(from,t,e);
    if(k<1)requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
document.getElementById('overview').onclick=()=>pose(built.overview.position,built.overview.target);
document.getElementById('trainer').onclick=()=>pose(built.hero.position,built.hero.target);

addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});

function frame(){
  controls.update();
  renderer.render(scene,camera);
  requestAnimationFrame(frame);
}
frame();

window.__BEAST_CAVE_REVIEW={scene,camera,controls,built,pickables,obstacles,pose};
