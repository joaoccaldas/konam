// render/renderer.js — canonical Three.js renderer + lifecycle authority.
//
// This module owns renderer construction and cross-surface GPU lifecycle policy.
// It deliberately does not own scene composition, camera choreography, controls,
// product data, room geometry, or machine-inspection state.
import * as THREE from 'three';

const TONE_MAPPING=Object.freeze({
  aces:THREE.ACESFilmicToneMapping,
  agx:THREE.AgXToneMapping,
  none:THREE.NoToneMapping,
});

export function createRendererContext({
  canvas,
  antialias=true,
  alpha=false,
  powerPreference='high-performance',
  maxDpr=2,
  toneMapping='aces',
  exposure=1,
  preserveDrawingBuffer=false,
}={}){
  if(!canvas)throw new TypeError('renderer context requires a canvas');
  let renderer;
  try{renderer=new THREE.WebGLRenderer({canvas,antialias,alpha,powerPreference,preserveDrawingBuffer});}
  catch(error){globalThis.__konaAnalytics?.trackRuntimeError?.('renderer_init',{subsystem:'renderer'});throw error;}
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=TONE_MAPPING[toneMapping]??THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=exposure;
  const dpr=Math.min(globalThis.devicePixelRatio||1,Math.max(.5,Number(maxDpr)||1));
  renderer.setPixelRatio(dpr);

  let disposed=false;
  let loop=null;
  const onContextLost=()=>globalThis.__konaAnalytics?.trackRuntimeError?.('renderer_context_lost',{subsystem:'renderer'});
  const onContextRestored=()=>globalThis.__konaAnalytics?.trackRuntimeError?.('renderer_context_restored',{subsystem:'renderer'});
  canvas.addEventListener?.('webglcontextlost',onContextLost);
  canvas.addEventListener?.('webglcontextrestored',onContextRestored);

  const visible=()=>typeof document==='undefined'||!document.hidden;
  const syncLoop=()=>{
    if(disposed)return;
    renderer.setAnimationLoop(loop&&visible()?loop:null);
  };
  const onVisibility=()=>syncLoop();
  if(typeof document!=='undefined')document.addEventListener('visibilitychange',onVisibility);

  return Object.freeze({
    renderer,
    dpr,
    setAnimationLoop(callback){
      loop=typeof callback==='function'?callback:null;
      syncLoop();
    },
    paused(){return disposed||!visible();},
    dispose({forceContextLoss=false}={}){
      if(disposed)return;
      disposed=true;
      loop=null;
      renderer.setAnimationLoop(null);
      if(typeof document!=='undefined')document.removeEventListener('visibilitychange',onVisibility);
      canvas.removeEventListener?.('webglcontextlost',onContextLost);
      canvas.removeEventListener?.('webglcontextrestored',onContextRestored);
      renderer.dispose();
      if(forceContextLoss)renderer.forceContextLoss?.();
    },
  });
}
