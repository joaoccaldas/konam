import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildNorwegianEngine } from './norwegian-engine.js';

const host=document.getElementById('stage');
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.90;
const lite=matchMedia('(pointer:coarse)').matches||innerWidth<700;renderer.shadowMap.enabled=!lite;renderer.shadowMap.type=THREE.PCFShadowMap;host.append(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#071116');scene.fog=new THREE.FogExp2('#071116',.013);
const pmrem=new THREE.PMREMGenerator(renderer),env=new RoomEnvironment();scene.environment=pmrem.fromScene(env).texture;env.dispose();pmrem.dispose();
const camera=new THREE.PerspectiveCamera(51,innerWidth/innerHeight,.08,130);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.065;controls.maxPolarAngle=Math.PI*.49;controls.minDistance=1.2;controls.maxDistance=34;
const pickables=[],obstacles=[];const built=buildNorwegianEngine({scene,lite,pickables,obstacles});
const PRESETS=Object.freeze({overview:{p:[-12.0,3.6,9.7],t:[-1.0,1.4,-.3]},lanes:{p:[-11.0,2.5,2.4],t:[-4.0,1.0,0]},protocol:{p:[-2.0,2.8,5.2],t:[2.1,1.25,0]},altitude:{p:[4.6,2.8,-.8],t:[9.6,2.3,-5.0]},vault:{p:[-.5,3.2,6.3],t:[2.6,2.8,11.0]},fjord:{p:[-3.7,2.7,5.8],t:[-8.2,2.0,10.1]},kona:{p:[-2.8,2.1,-5.0],t:[-7.8,2.6,-11.6]}});
const vec=a=>new THREE.Vector3(...a);
function setPose(name,instant=false){const preset=PRESETS[name]||PRESETS.overview,p=vec(preset.p),t=vec(preset.t);if(instant){camera.position.copy(p);controls.target.copy(t);controls.update();return Promise.resolve()}return new Promise(resolve=>{const s=camera.position.clone(),f=controls.target.clone(),t0=performance.now(),dur=850,ease=x=>1-Math.pow(1-x,3);function step(now){const k=Math.min(1,(now-t0)/dur),e=ease(k);camera.position.lerpVectors(s,p,e);controls.target.lerpVectors(f,t,e);controls.update();if(k<1)requestAnimationFrame(step);else resolve()}requestAnimationFrame(step)})}
setPose('overview',true);
const copy={
  'rain-lock':'A narrow wet-stone threshold. Weather is part of the Norwegian identity, but the global Kona.m shell stays calm.',
  'three-lanes':'Three parallel stations make the shared system visible while leaving room for different athletes and sessions.',
  'lactate-kit':'The protocol table represents measured feedback: lactate, timing, notes and repeatability. It does not interpret medical data.',
  'altitude-bay':'A glass controlled-environment bay inspired by documented altitude and physiology work, not one literal training session.',
  'heat-cool':'Fans, heat and cold-air cues show environmental control without turning the room into a spa or cyberpunk set.',
  'bermuda-2018':'2018 Bermuda: Stornes first, Blummenfelt second, Iden third. The first men’s WTS podium sweep by one nation.',
  'nice-2025':'2025 Nice: Stornes first, Iden second, Blummenfelt third at the IRONMAN World Championship.',
  'fjord-wall':'An original layered relief evokes Bergen / western Norway. No copied maps or photography.',
  'kona-line':'Method stays cold and controlled. Kona remains the thin warm destination line.'
};
const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();
renderer.domElement.addEventListener('pointerup',ev=>{const r=renderer.domElement.getBoundingClientRect();mouse.x=(ev.clientX-r.left)/r.width*2-1;mouse.y=-((ev.clientY-r.top)/r.height*2-1);ray.setFromCamera(mouse,camera);const hit=ray.intersectObjects(pickables,true).find(x=>x.object.userData?.norEngine),card=document.getElementById('inspect');if(!hit){card.style.display='none';return}const d=hit.object.userData.norEngine;document.getElementById('inspectTitle').textContent=d.label||d.hotspot;document.getElementById('inspectBody').textContent=copy[d.hotspot]||'Production-candidate story object.';card.style.display='block'});
for(const name of Object.keys(PRESETS)){const el=document.getElementById(name);if(el)el.onclick=()=>setPose(name,false)}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
let frames=0;function frame(){controls.update();renderer.render(scene,camera);frames++;if(frames===3)window.__NOR_ENGINE_RENDER_READY=true;requestAnimationFrame(frame)}frame();
window.__NOR_ENGINE_REVIEW={scene,camera,controls,built,pickables,obstacles,presets:PRESETS,setPose,renderer};
