// ui/race-self-stage.js — lightweight personal 3D stage.
// Four procedural archetypes share the canonical engine/avatar.js item contract.
import * as THREE from 'three';
import { fitPerspectiveBounds } from '../engine/framing.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildAvatar } from '../engine/avatar-models.js';

const plain=(color,roughness=.72)=>new THREE.MeshStandardMaterial({color,roughness,metalness:.02});
function disposeObject(obj){
  obj?.traverse?.(o=>{
    o.geometry?.dispose?.();
    const mats=Array.isArray(o.material)?o.material:[o.material];
    for(const m of mats){m?.map?.dispose?.();m?.dispose?.();}
  });
}
function frameObject(obj,target=1.8){
  const b=new THREE.Box3().setFromObject(obj),size=b.getSize(new THREE.Vector3()),center=b.getCenter(new THREE.Vector3());
  const max=Math.max(size.x,size.y,size.z)||1,s=target/max;obj.scale.setScalar(s);obj.position.sub(center.multiplyScalar(s));
}

export async function mountRaceSelfStage(canvas,{accent='#e8471c',avatarStyle=null,bike=null,shoe=null,onReady}={}){
  if(!canvas)return {dispose(){}};
  let disposed=false;
  const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'low-power',alpha:true});
  const dpr=Math.min(devicePixelRatio||1,1.5);renderer.setPixelRatio(dpr);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  const scene=new THREE.Scene();scene.background=null;
  const camera=new THREE.PerspectiveCamera(38,1,.05,50);camera.position.set(.7,1.22,5.4);
  const controls=new OrbitControls(camera,canvas);controls.target.set(0,1.0,0);controls.enableDamping=true;controls.enablePan=false;controls.minDistance=3.4;controls.maxDistance=7.5;controls.maxPolarAngle=Math.PI*.55;
  scene.add(new THREE.HemisphereLight('#ffffff','#22303a',1.5));
  const key=new THREE.DirectionalLight('#ffffff',2.2);key.position.set(3,5,2);scene.add(key);
  const rim=new THREE.DirectionalLight(accent,1.3);rim.position.set(-3,2,-2);scene.add(rim);
  const platform=new THREE.Mesh(new THREE.CylinderGeometry(bike?1.25:.68,bike?1.3:.72,.055,64),plain('#20272c',.52));platform.position.y=.025;scene.add(platform);
  let avatar=buildAvatar({...avatarStyle,accent});avatar.scale.setScalar(1);avatar.position.set(bike?-.62:0,.03,.04);avatar.userData.baseY=avatar.position.y;scene.add(avatar);
  const equipment=[];

  const loader=new GLTFLoader();loader.setMeshoptDecoder(MeshoptDecoder);
  const load=async(product,pos,scale=1.5)=>{
    if(!product?.asset&&!product?.glb)return;
    try{
      const src=product.asset||product.glb,gltf=await loader.loadAsync(src);if(disposed){disposeObject(gltf.scene);return;}
      const obj=gltf.scene;frameObject(obj,scale);obj.position.add(new THREE.Vector3(...pos));scene.add(obj);equipment.push(obj);fitCamera();
    }catch(_){}
  };
  load(bike,[.72,.52,-.12],1.34);load(shoe,[.68,.2,.68],.44);

  function fitCamera(){
    const bounds=new THREE.Box3().setFromObject(avatar);
    equipment.forEach(obj=>bounds.expandByObject(obj));
    fitPerspectiveBounds(camera,controls,bounds);
    // Read-only framing evidence for real-browser acceptance checks.
    canvas.__studioFrame={bounds,camera,objects:[avatar,...equipment]};
  }
  function resize(){
    const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight);
    renderer.setSize(w,h,false);camera.aspect=w/h;fitCamera();
  }
  const ro=new ResizeObserver(resize);ro.observe(canvas);resize();
  let startedAt=performance.now();
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  renderer.setAnimationLoop(now=>{
    if(disposed||document.hidden||document.body.classList.contains('settings-open'))return;
    const t=reducedMotion.matches?0:(now-startedAt)/1000,base=avatar.userData.baseY??.03,kind=avatar.userData.avatarAnimation;
    if(kind==='bounce')avatar.position.y=base+Math.sin(t*2.1)*.012;
    else if(kind==='swagger'){avatar.position.y=base+Math.sin(t*1.45)*.006;avatar.rotation.z=Math.sin(t*.85)*.012;}
    else if(kind==='ready'){avatar.position.y=base+Math.sin(t*1.8)*.005;avatar.rotation.y=-.08+Math.sin(t*.55)*.018;}
    else {avatar.position.y=base+Math.sin(t*1.15)*.009;avatar.rotation.z=Math.sin(t*.7)*.018;}
    controls.update();renderer.render(scene,camera);
  });
  onReady?.();
  return {
    resetView:fitCamera,
    setAccent(c){rim.color.set(c);},
    setAvatarStyle(next){
      const pos=avatar.position.clone(),rot=avatar.rotation.clone(),scale=avatar.scale.clone();
      scene.remove(avatar);disposeObject(avatar);avatar=buildAvatar(next);avatar.position.copy(pos);avatar.rotation.copy(rot);avatar.scale.copy(scale);avatar.userData.baseY=pos.y;scene.add(avatar);
      rim.color.set(next?.accent||accent);fitCamera();
    },
    dispose(){disposed=true;ro.disconnect();renderer.setAnimationLoop(null);controls.dispose();disposeObject(scene);renderer.dispose();renderer.forceContextLoss();delete canvas.__studioFrame;}
  };
}
