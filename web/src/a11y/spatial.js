export function createSpatialAnnouncer({region,delayMs=220,setTimer=setTimeout,clearTimer=clearTimeout}={}){
 let timer=null,last='';
 return {
  announce(text){
   const next=String(text||'').trim(); if(!next||next===last)return;
   if(timer)clearTimer(timer);
   timer=setTimer(()=>{last=next;if(region)region.textContent=next;timer=null;},delayMs);
  },
  clear(){if(timer)clearTimer(timer);timer=null;},
  last(){return last;}
 };
}

export function focusArtifactDom(artifactId,{root=document}={}){
 if(!artifactId)return false;
 const safe=globalThis.CSS?.escape?CSS.escape(artifactId):String(artifactId).replace(/["\\]/g,'\\$&');
 const el=root.querySelector?.(`[data-artifact-id="${safe}"]`);
 if(!el)return false;
 if(!el.hasAttribute?.('tabindex'))el.setAttribute?.('tabindex','-1');
 el.focus?.({preventScroll:true});
 return true;
}
