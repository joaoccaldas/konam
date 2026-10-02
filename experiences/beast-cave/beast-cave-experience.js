import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { buildBeastCave, attachBeastCaveBike } from '../../web/src/rooms/beast-cave.js';

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
scene.background=new THREE.Color('#07090b');
scene.fog=new THREE.FogExp2('#090909',.014);
const pmrem=new THREE.PMREMGenerator(renderer);
const env=new RoomEnvironment();
scene.environment=pmrem.fromScene(env).texture;env.dispose();pmrem.dispose();

const camera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.08,120);
camera.position.set(-12.2,1.65,0);
scene.add(camera);

const pickables=[],obstacles=[];
const lite=matchMedia('(pointer:coarse)').matches||innerWidth<700;
const built=buildBeastCave({scene,lite,pickables,obstacles});

let heroBikeReady=false;
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
attachBeastCaveBike(built,loader,'/assets/museum/speedmax_web.glb',{directDrive:true})
 .catch(e=>console.warn('hero bike',e))
 .finally(()=>heroBikeReady=true);

const STORY={
 machine:{kicker:'THE MACHINE',title:'The place where excuses get boring.',copy:'The bike, trainer, screen, airflow and data collapse the world into one repeatable loop. Nothing theatrical. Just another chance to do the work better.',data:['BIKE · TRAIN · REPEAT','ZWIFT COMPANION','KONA AHEAD']},
 archive:{kicker:'PAIN CAVE ARCHIVE',title:'The laboratory came first.',copy:'Mirrors, treadmill, swim erg and controlled indoor training are treated here as evidence of a long-running habit: make the variables visible, then learn from them.',data:['DOCUMENTED SETUP · 2019','BIKE · RUN · SWIM','ARCHIVE LAYER']},
 iterations:{kicker:'ITERATIONS',title:'A career is not a highlight reel.',copy:'Different moments are deliberately rendered through different media: drawing, blueprint, manga, sculpture. One life, repeatedly reinterpreted.',data:['SKETCH','BLUEPRINT','MANGA','SCULPTURE']},
 gear:{kicker:'GEAR WALL',title:'Objects remember work.',copy:'Not a shop wall. A working memory of helmets, shoes, medals, bottles, towels and the small things that acquire meaning because of what happened while using them.',data:['EQUIPMENT','RACE OBJECTS','MEMORY']},
 horizon:{kicker:'KONA HORIZON',title:'Everything points somewhere.',copy:'The room can be huge and still have one destination. From the trainer, the run lab and the archive, Kona stays in the field of view.',data:['KAILUA-KONA','DESTINATION','NOT JUST A RACE']},
 gap:{kicker:'THE GAP',title:'Almost is still information.',copy:'Two basalt forms separated by one unresolved line. The sculpture is intentionally unfinished. Some stories are more useful when they stay open.',data:['SCULPTURE','UNRESOLVED','RETURN']},
 repeat:{kicker:'REPEAT',title:'Same circle. Different athlete.',copy:'Repetition without feedback is just repetition. The concentric rings turn the training loop into an object you can walk around.',data:['SCULPTURE','FEEDBACK','ADAPT']},
 silver:{kicker:'SILVER LINING',title:'Keep what the miss teaches.',copy:'A dark fractured volume with one bright orbit. Not optimism pasted over failure. Useful information kept visible.',data:['SCULPTURE','ACCEPT','ADAPT']}
};

const hotspots=[
 {id:'machine',label:'The Machine',sub:'training loop',p:new THREE.Vector3(-2.5,1.45,-2.1),look:new THREE.Vector3(-2.5,1.0,-2.0)},
 {id:'archive',label:'Pain Cave Archive',sub:'documented setup',p:new THREE.Vector3(9.4,1.65,-8.0),look:new THREE.Vector3(9.4,1.0,-8.0)},
 {id:'iterations',label:'Iterations',sub:'four ways to remember',p:new THREE.Vector3(.2,2.8,10.55),look:new THREE.Vector3(.2,2.5,10.55)},
 {id:'gear',label:'Gear Wall',sub:'objects remember',p:new THREE.Vector3(10.0,2.0,8.5),look:new THREE.Vector3(10.0,1.3,8.5)},
 {id:'horizon',label:'Kona Horizon',sub:'the destination',p:new THREE.Vector3(-7.4,2.45,10.55),look:new THREE.Vector3(-7.4,2.45,10.55)},
 {id:'gap',label:'The Gap',sub:'unfinished',p:new THREE.Vector3(-10.0,2.0,5.0),look:new THREE.Vector3(-10.0,1.5,5.0)},
 {id:'repeat',label:'Repeat',sub:'feedback loop',p:new THREE.Vector3(-9.6,1.55,-6.8),look:new THREE.Vector3(-9.6,1.3,-6.8)},
 {id:'silver',label:'Silver Lining',sub:'keep the lesson',p:new THREE.Vector3(-10.2,1.6,6.7),look:new THREE.Vector3(-10.2,1.3,6.7)}
];

const hotspotHost=document.getElementById('hotspots');
for(const h of hotspots){
 const wrap=document.createElement('div');wrap.className='spatial';wrap.dataset.id=h.id;
 wrap.innerHTML=`<button type="button" aria-label="${h.label}"><span class="spatial-dot"></span><span class="spatial-copy"><small>${h.sub}</small><b>${h.label}</b></span></button>`;
 wrap.querySelector('button').onclick=()=>openStory(h.id,h.look);
 hotspotHost.append(wrap);h.el=wrap;
}

let yaw=-Math.PI/2,pitch=-.03;
let entered=false;
let velocity=new THREE.Vector3(),keys=new Set();
let dragging=false,lastX=0,lastY=0;
let touchMoveId=null;
const bounds=built.bounds;

function clampWalk(pos){
 pos.x=Math.max(bounds.x0+.8,Math.min(bounds.x1-.8,pos.x));
 pos.z=Math.max(bounds.z1+.8,Math.min(bounds.z0-.8,pos.z));
}
function face(){
 const cp=Math.cos(pitch);
 return new THREE.Vector3(-Math.sin(yaw)*cp,Math.sin(pitch),-Math.cos(yaw)*cp);
}
function look(){
 camera.lookAt(camera.position.clone().add(face()));
}
function animatePose(to,target,dur=1200){
 return new Promise(resolve=>{
   const from=camera.position.clone();
   const startDir=face(); const toDir=target.clone().sub(to).normalize();
   const start=performance.now();
   function step(now){
     const t=Math.min(1,(now-start)/dur),e=t*t*(3-2*t);
     camera.position.lerpVectors(from,to,e);
     const d=startDir.clone().lerp(toDir,e).normalize();
     yaw=Math.atan2(-d.x,-d.z);pitch=Math.asin(Math.max(-1,Math.min(1,d.y)));
     look();
     if(t<1)requestAnimationFrame(step);else resolve();
   }
   requestAnimationFrame(step);
 });
}
async function enterRoom(){
 document.getElementById('entry').classList.add('hidden');
 document.body.classList.add('entered');
 await animatePose(new THREE.Vector3(-8.9,1.65,.4),new THREE.Vector3(-2.3,1.2,-2.0),1800);
 entered=true;
}
document.getElementById('enterRoom').onclick=enterRoom;

function openStory(id,target){
 const h=hotspots.find(x=>x.id===id),s=STORY[id]; if(!h||!s)return;
 document.getElementById('storyKicker').textContent=s.kicker;
 document.getElementById('storyTitle').textContent=s.title;
 document.getElementById('storyCopy').textContent=s.copy;
 document.getElementById('storyData').innerHTML=s.data.map(x=>`<span>${x}</span>`).join('');
 document.body.classList.add('has-sheet');
 const here=camera.position.clone();
 const dir=target.clone().sub(here).normalize();
 yaw=Math.atan2(-dir.x,-dir.z);pitch=Math.asin(dir.y);look();
}
document.getElementById('closeStory').onclick=()=>document.body.classList.remove('has-sheet');

addEventListener('keydown',e=>{keys.add(e.key.toLowerCase()); if(e.key==='Escape')document.body.classList.remove('has-sheet')});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));

renderer.domElement.addEventListener('pointerdown',e=>{
 if(!entered)return;dragging=true;lastX=e.clientX;lastY=e.clientY;renderer.domElement.setPointerCapture?.(e.pointerId);
});
renderer.domElement.addEventListener('pointermove',e=>{
 if(!entered||!dragging)return;
 const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;
 yaw-=dx*.0042;pitch-=dy*.0036;pitch=Math.max(-1.15,Math.min(1.05,pitch));look();
});
renderer.domElement.addEventListener('pointerup',e=>{dragging=false;renderer.domElement.releasePointerCapture?.(e.pointerId)});

renderer.domElement.addEventListener('wheel',e=>{
 if(!entered)return;
 const d=face();d.y=0;d.normalize();
 camera.position.addScaledVector(d,e.deltaY>0?-.45:.45);clampWalk(camera.position);look();
},{passive:true});

let last=performance.now(),frames=0;
function updateMove(dt){
 if(!entered)return;
 const f=face();f.y=0;f.normalize();
 const r=new THREE.Vector3(f.z,0,-f.x);
 let m=new THREE.Vector3();
 if(keys.has('w')||keys.has('arrowup'))m.add(f);
 if(keys.has('s')||keys.has('arrowdown'))m.sub(f);
 if(keys.has('d')||keys.has('arrowright'))m.add(r);
 if(keys.has('a')||keys.has('arrowleft'))m.sub(r);
 if(m.lengthSq()>0)m.normalize().multiplyScalar(3.0);
 velocity.lerp(m,1-Math.exp(-dt*10));
 camera.position.addScaledVector(velocity,dt);camera.position.y=1.65;clampWalk(camera.position);
}

const v=new THREE.Vector3();
function updateHotspots(){
 for(const h of hotspots){
   v.copy(h.p).project(camera);
   const visible=v.z>-1&&v.z<1&&Math.abs(v.x)<1.06&&Math.abs(v.y)<1.06;
   const dist=camera.position.distanceTo(h.p);
   h.el.classList.toggle('visible',entered&&visible&&dist<14);
   h.el.style.left=((v.x*.5+.5)*innerWidth)+'px';
   h.el.style.top=((-v.y*.5+.5)*innerHeight)+'px';
   h.el.style.opacity=entered&&visible?String(Math.max(.20,Math.min(1,1.4-dist/16))):'0';
 }
}
function frame(now){
 const dt=Math.min(.04,(now-last)/1000);last=now;
 updateMove(dt);look();updateHotspots();renderer.render(scene,camera);
 frames++; if(frames>3&&heroBikeReady)window.__BEAST_CAVE_READY=true;
 requestAnimationFrame(frame);
}
look();requestAnimationFrame(frame);

addEventListener('resize',()=>{
 renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
});

window.__BEAST_CAVE_EXPERIENCE={scene,camera,built,hotspots,enterRoom,openStory,renderer};
