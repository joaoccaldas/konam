// ui/admin-asset-preview.js — lazy real thumbnails from canonical GLBs.
// Loaded only by the admin portfolio; one renderer is reused to avoid dozens of WebGL contexts.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

const canvas=document.createElement('canvas');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,preserveDrawingBuffer:true,powerPreference:'low-power'});
renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
const scene=new THREE.Scene();
scene.background=new THREE.Color('#f4efe7');
scene.add(new THREE.HemisphereLight('#ffffff','#5f6a72',1.8));
const key=new THREE.DirectionalLight('#ffffff',2.4);key.position.set(3,4,4);scene.add(key);
const rim=new THREE.DirectionalLight('#00a7c7',1.1);rim.position.set(-3,2,-3);scene.add(rim);
const camera=new THREE.PerspectiveCamera(34,1.6,.01,100);
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
let queue=Promise.resolve();
const cache=new Map();

function dispose(obj){
 obj?.traverse?.(o=>{o.geometry?.dispose?.();for(const m of(Array.isArray(o.material)?o.material:[o.material])){m?.map?.dispose?.();m?.dispose?.();}});
}
async function renderGlb(src){
 if(cache.has(src))return cache.get(src);
 const task=queue.then(async()=>{
   const gltf=await loader.loadAsync(src),obj=gltf.scene;scene.add(obj);
   const box=new THREE.Box3().setFromObject(obj),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
   obj.position.sub(center);
   const max=Math.max(size.x,size.y,size.z)||1,scale=2.4/max;obj.scale.setScalar(scale);
   const framed=new THREE.Box3().setFromObject(obj),s=framed.getSize(new THREE.Vector3());
   camera.aspect=1.6;camera.position.set(s.x*.9,s.y*.45,Math.max(s.x,s.y,s.z)*2.45);camera.lookAt(0,0,0);camera.updateProjectionMatrix();
   renderer.setSize(640,400,false);renderer.render(scene,camera);
   const url=canvas.toDataURL('image/webp',.82);scene.remove(obj);dispose(obj);return url;
 }).catch(()=>null);
 queue=task.then(()=>undefined,()=>undefined);cache.set(src,task);return task;
}

export function mountAdminAssetPreviews(root=document){
 const targets=[...root.querySelectorAll('[data-admin-3d][data-glb]')];
 if(!targets.length)return;
 const io=new IntersectionObserver(entries=>{
   for(const e of entries)if(e.isIntersecting){
     io.unobserve(e.target);const el=e.target,src=el.dataset.glb;
     renderGlb(src).then(url=>{if(!url||!el.isConnected)return;const img=document.createElement('img');img.src=url;img.alt='';img.decoding='async';el.replaceWith(img);});
   }
 },{rootMargin:'320px'});
 targets.forEach(x=>io.observe(x));
}
window.__mountAdminAssetPreviews=mountAdminAssetPreviews;
