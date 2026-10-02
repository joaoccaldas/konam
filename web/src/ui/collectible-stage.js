// ui/collectible-stage.js — lazy 3D viewer for modeled KONA Finds.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { disposeObject3D } from '../world/disposal.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export async function mountCollectibleStage(canvas,{model,motion='auto'}={}){
  if(!canvas||!model?.glb||!model?.node)throw new Error('Collectible has no modeled view');
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'low-power'});
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.1;
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(34,1,.01,50);
  camera.position.set(1.7,1.15,2.4);
  const controls=new OrbitControls(camera,canvas);
  controls.enablePan=false;controls.enableDamping=true;
  scene.add(new THREE.HemisphereLight(0xffffff,0x283038,2.4));
  const key=new THREE.DirectionalLight(0xfff2dc,3.1);key.position.set(2.5,4,3);scene.add(key);
  const rim=new THREE.DirectionalLight(0x00a7c7,1.4);rim.position.set(-3,1,-2);scene.add(rim);
  const loader=new GLTFLoader();loader.setMeshoptDecoder(MeshoptDecoder);
  let gltf=null;
  try{
  gltf=await loader.loadAsync(model.glb);
  let src=null;gltf.scene.traverse(o=>{if(!src&&o.name===model.node)src=o;});
  if(!src)throw new Error('Collectible mesh missing: '+model.node);
  const root=new THREE.Group();const object=src.clone(true);root.add(object);scene.add(root);
  object.traverse(o=>{if(o.isMesh){o.material=o.material?.clone?.()||o.material;o.castShadow=true;}});
  const box=new THREE.Box3().setFromObject(root),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  root.position.sub(center);
  const radius=Math.max(size.x,size.y,size.z,.1);
  camera.position.set(radius*1.8,radius*.9,radius*2.25);controls.minDistance=radius*.9;controls.maxDistance=radius*5;controls.target.set(0,0,0);
  const floor=new THREE.Mesh(new THREE.CircleGeometry(radius*1.25,48),new THREE.MeshStandardMaterial({color:0xe8e1d6,roughness:.9,transparent:true,opacity:.7}));
  floor.rotation.x=-Math.PI/2;floor.position.y=-size.y*.52;scene.add(floor);
  const reduced=motion==='reduced'||matchMedia('(prefers-reduced-motion: reduce)').matches;
  let disposed=false,last=performance.now();
  const resize=()=>{const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};
  const ro=new ResizeObserver(resize);ro.observe(canvas);resize();
  renderer.setAnimationLoop(now=>{if(disposed)return;const dt=Math.min(.05,(now-last)/1000);last=now;controls.update();if(!reduced&&!controls.state?.active)root.rotation.y+=dt*.18;renderer.render(scene,camera);});
  canvas.__collectibleStage=true;
  return{reset(){camera.position.set(radius*1.8,radius*.9,radius*2.25);controls.target.set(0,0,0);controls.update();},dispose(){disposed=true;renderer.setAnimationLoop(null);ro.disconnect();controls.dispose();renderer.dispose();canvas.__collectibleStage=false;scene.add(gltf.scene);disposeObject3D(scene,{removeFromParent:false});}};
  }catch(error){controls.dispose();renderer.dispose();if(gltf?.scene)scene.add(gltf.scene);disposeObject3D(scene,{removeFromParent:false});throw error;}
}
