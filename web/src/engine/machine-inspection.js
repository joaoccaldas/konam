import * as THREE from 'three';

/**
 * Global Kona.m machine inspection kernel.
 *
 * Owns mechanical part indexing and exploded-state math.
 * Contexts (Museum, Studio, rooms) own camera/UI choreography only.
 */
export const blenderVectorToThree = v => new THREE.Vector3(v[0], v[2], -v[1]);
export const clamp01 = v => Math.min(1, Math.max(0, v));
export const smoothstep01 = v => {
  const u=clamp01(v);
  return u*u*(3-2*u);
};

export function indexMachine(root,{
  partKey='part',
  explodeKey='explode',
  vectorAdapter=blenderVectorToThree,
}={}){
  const parts={};
  const meshesByPart={};
  const explodables=[];
  const meshes=[];

  root.traverse(o=>{
    const ud=o.userData||{};
    if(ud[partKey] && !parts[ud[partKey]]) parts[ud[partKey]]=o;
    if(ud[explodeKey]){
      const raw=ud[explodeKey];
      const vec=raw?.isVector3 ? raw.clone() : vectorAdapter(raw);
      explodables.push({node:o,base:o.position.clone(),vec,delay:0});
    }
    if(!o.isMesh)return;
    meshes.push(o);
    let p=o;
    while(p && !(p.userData&&p.userData[partKey]))p=p.parent;
    if(p){
      const id=p.userData[partKey];
      (meshesByPart[id]||=[]).push(o);
    }
  });

  [...explodables]
    .sort((a,b)=>a.vec.length()-b.vec.length())
    .forEach((x,i,a)=>{x.delay=a.length>1?i/a.length:0;});

  return {root,parts,meshesByPart,explodables,meshes};
}

export function applyExplosion(explodables,value,{
  progressScale=1.35,
  staggerWindow=.35,
  distanceScale=1.15,
  easing=smoothstep01,
}={}){
  for(const x of explodables){
    const u=clamp01(value*progressScale-x.delay*staggerWindow);
    const e=easing(u);
    x.node.position.copy(x.base).addScaledVector(x.vec,e*distanceScale);
  }
}

export function createExplosionController(index,{
  value=0,
  target=0,
  motion='step',
  speed=1.1,
  reducedSpeed=10,
  progressScale=1.35,
  staggerWindow=.35,
  distanceScale=1.15,
  easing=smoothstep01,
}={}){
  const state={value,target};

  const api={
    ...index,
    state,
    get value(){return state.value;},
    set value(v){state.value=clamp01(v);applyExplosion(index.explodables,state.value,{progressScale,staggerWindow,distanceScale,easing});},
    get target(){return state.target;},
    set target(v){state.target=clamp01(v);},
    setExploded(on){state.target=on?1:0;},
    setProgress(v,{immediate=false}={}){state.target=clamp01(v);if(immediate){state.value=state.target;applyExplosion(index.explodables,state.value,{progressScale,staggerWindow,distanceScale,easing});}},
    update(dt,{reduced=false}={}){
      if(Math.abs(state.value-state.target)<.0005){
        state.value=state.target;
        return false;
      }
      if(reduced){
        state.value=state.target;
      }else if(motion==='exponential'){
        state.value+=(state.target-state.value)*(1-Math.exp(-dt*speed));
      }else{
        state.value+=Math.sign(state.target-state.value)*Math.min(Math.abs(state.target-state.value),dt*(reduced?reducedSpeed:speed));
      }
      if(Math.abs(state.value-state.target)<1e-4)state.value=state.target;
      applyExplosion(index.explodables,state.value,{progressScale,staggerWindow,distanceScale,easing});
      return true;
    },
    partOf(obj,{knownOnly=false}={}){
      for(let o=obj;o;o=o.parent){
        const id=o.userData?.part;
        if(id && (!knownOnly || index.parts[id]))return id;
      }
      return null;
    },
    assemble({immediate=false}={}){api.setProgress(0,{immediate});},
    explode({immediate=false}={}){api.setProgress(1,{immediate});},
  };

  applyExplosion(index.explodables,state.value,{progressScale,staggerWindow,distanceScale,easing});
  return api;
}

export function createMachineInspection(root,options={}){
  return createExplosionController(indexMachine(root,options),options);
}
