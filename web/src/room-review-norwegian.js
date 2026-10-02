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

const renderer=new THREE.WebGLRenderer({canvas,antialias:!lite,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,lite?1.5:2));
renderer.setSize(innerWidth,innerHeight,false);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.AgXToneMapping;
renderer.toneMappingExposure=.88;
renderer.shadowMap.enabled=!lite;
renderer.shadowMap.type=THREE.PCFShadowMap;

const scene=new THREE.Scene();
scene.background=new THREE.Color('#071116');
scene.fog=new THREE.FogExp2('#081318',lite?.018:.024);
const pmrem=new THREE.PMREMGenerator(renderer);
scene.environment=pmrem.fromScene(new RoomEnvironment(),.04).texture;

const camera=new THREE.PerspectiveCamera(lite?63:55,innerWidth/innerHeight,.1,100);
const target=new THREE.Vector3(0,1.35,-1.4);
let yaw=.02,pitch=-.05,distance=lite?11.2:10.2;
function updateCamera(){
 const cp=Math.cos(pitch);
 camera.position.set(target.x+Math.sin(yaw)*cp*distance,target.y+Math.sin(pitch)*distance,target.z+Math.cos(yaw)*cp*distance);
 camera.lookAt(target);
}
updateCamera();

const room=new THREE.Group();room.name='review-host-room';scene.add(room);
const bounds={x0:-4.3,x1:4.3,z0:-3.4,z1:3.4};
const Y=0,cx=0,cz=0,rw=8.6,rd=6.8;
const stone=new THREE.MeshStandardMaterial({color:'#11181b',roughness:.82,metalness:.08});
const floorMat=new THREE.MeshStandardMaterial({color:'#0d1417',roughness:.48,metalness:.15});
const backMat=new THREE.MeshStandardMaterial({color:'#172126',roughness:.9,metalness:.04});
function addBox(w,h,d,x,y,z,mat=stone){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);o.position.set(x,y,z);o.receiveShadow=true;o.castShadow=!lite;room.add(o);return o}
const floor=addBox(rw,.12,rd,cx,-.06,cz,floorMat);floor.userData.floor=true;
addBox(rw,4.25,.16,cx,2.12,bounds.z1,backMat);
addBox(.16,4.25,rd,bounds.x0,2.12,cz,backMat);
addBox(.16,4.25,rd,bounds.x1,2.12,cz,backMat);
for(let i=0;i<6;i++){const beam=addBox(rw-.5,.06,.08,cx,4.02,bounds.z0+.55+i*1.05,new THREE.MeshStandardMaterial({color:'#20292d',roughness:.48,metalness:.68}));beam.castShadow=false}
const obstacles=[];
const specimen=new THREE.Vector3(.55,Y,cz);
const L={id:'norwegian',group:room,floorMat,motes:[]};
const put=(mesh,x,y,z)=>{mesh.position.set(x,y,z);room.add(mesh);return mesh};
const box=(w,h,d,x,y,z,mat)=>put(new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat),x,y,z);
const r={id:'norwegian',z0:Math.max(bounds.z0,bounds.z1),z1:Math.min(bounds.z0,bounds.z1)};
buildNorwegianReview({r,rg:room,put,box,seed:401,lite,cx,cz,Y,rw,rd,specimen,obstacles,L,bounds});
for(const o of room.children){if(o.isMesh){o.castShadow=!lite;o.receiveShadow=true}}
const ambient=new THREE.HemisphereLight('#b9dfe8','#25170f',lite?1.25:1.0);scene.add(ambient);
const key=new THREE.DirectionalLight('#c8e8ef',lite?1.45:1.8);key.position.set(-3,6,-4);key.castShadow=!lite;scene.add(key);
const warm=new THREE.PointLight('#ff7430',lite?12:18,11,1.7);warm.position.set(3.5,2.8,2.4);scene.add(warm);
const rim=new THREE.PointLight('#76d5e8',lite?7:12,12,1.8);rim.position.set(-3.8,3.2,-2.7);scene.add(rim);

const views={
 overview:{target:[0,1.25,-.35],yaw:.02,pitch:-.07,distance:lite?11.4:10.4,title:'NOR // 3',copy:'Three lanes. One system. A production candidate inside the canonical KONA.m room grammar.'},
 lanes:{target:[-1.0,1.05,0],yaw:-.24,pitch:-.08,distance:7.3,title:'Three Rails',copy:'Three distinct athlete stations share one measured training system without pretending the athletes are interchangeable.'},
 protocol:{target:[2.25,1.15,0],yaw:.82,pitch:-.06,distance:5.4,title:'Protocol Table',copy:'Smoked timber, analyzer, sample rack and handled protocol notes. Evidence and interpretation stay separate.'},
 altitude:{target:[3.0,1.35,-1.9],yaw:.72,pitch:-.03,distance:4.6,title:'Environment Bay',copy:'Glass, temperature, airflow and controlled-environment cues. Atmosphere is part of the experiment.'},
 vault:{target:[2.2,2.0,2.65],yaw:.48,pitch:.02,distance:5.1,title:'Podium Vault',copy:'Original abstract objects evoke results without copying medals or trophies.'},
 fjord:{target:[3.15,.9,0],yaw:1.28,pitch:-.03,distance:4.8,title:'Fjord Relief',copy:'Layered original geometry gives the room a landscape memory without using copied maps or photography.'},
 kona:{target:[3.55,2.3,0],yaw:1.18,pitch:.01,distance:5.0,title:'Kona Line',copy:'One restrained warm line. Kona is the destination, not another UI layer.'}
};
let anim=null;
function setView(id){
 const v=views[id]||views.overview;
 buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===id)));
 label.textContent=v.title;copy.textContent=v.copy;
 const from={target:target.clone(),yaw,pitch,distance},to={target:new THREE.Vector3(...v.target),yaw:v.yaw,pitch:v.pitch,distance:v.distance,start:performance.now()};
 anim={from,to};
}
buttons.forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
setView('overview');

let dragging=false,lx=0,ly=0;
canvas.addEventListener('pointerdown',e=>{dragging=true;lx=e.clientX;ly=e.clientY;canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointermove',e=>{if(!dragging)return;const dx=e.clientX-lx,dy=e.clientY-ly;lx=e.clientX;ly=e.clientY;yaw-=dx*.006;pitch=Math.max(-.65,Math.min(.4,pitch-dy*.004));anim=null});
canvas.addEventListener('pointerup',()=>dragging=false);
canvas.addEventListener('wheel',e=>{distance=Math.max(3.5,Math.min(15,distance+e.deltaY*.008));anim=null},{passive:true});

addEventListener('resize',()=>{renderer.setPixelRatio(Math.min(devicePixelRatio,lite?1.5:2));renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.fov=innerHeight>innerWidth?(lite?69:62):(lite?60:53);camera.updateProjectionMatrix()});
const clock=new THREE.Clock();
function frame(now){
 if(anim){
  const u=Math.min(1,(now-anim.to.start)/700),e=1-Math.pow(1-u,3);
  target.lerpVectors(anim.from.target,anim.to.target,e);yaw=THREE.MathUtils.lerp(anim.from.yaw,anim.to.yaw,e);pitch=THREE.MathUtils.lerp(anim.from.pitch,anim.to.pitch,e);distance=THREE.MathUtils.lerp(anim.from.distance,anim.to.distance,e);if(u>=1)anim=null;
 }
 updateCamera();
 const t=clock.getElapsedTime();
 for(const m of L.motes||[])m.step?.(t);
 for(const [i,f] of (L.fanRotors||[]).entries())f.o.rotation.x=t*(1.9+i*.18);
 renderer.render(scene,camera);
 requestAnimationFrame(frame);
}
loading.hidden=true;
requestAnimationFrame(frame);
window.__NOR3_REVIEW_READY=true;
