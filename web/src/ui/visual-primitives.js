// ui/visual-primitives.js — tiny shared visual marks for 2D product surfaces.
// No Three.js. These previews exist to hint at Race Self / equipment without loading 3D.
import catalog from '../../../museum/entry-catalog.json' with { type: 'json' };
import { chooseEntryPreview } from '../engine/entry-preview.js';
import { readStorage, writeStorage } from '../engine/storage.js';
import { avatarItem, normaliseAvatarStyle } from '../engine/avatar.js';

export function avatarPreviewMarkup(styleInput,{className='visual-avatar'}={}){
  const s=normaliseAvatarStyle(styleInput);
  const [skin,hair,top,bottoms,shoes]=['skin','hair','top','bottoms','shoes'].map(slot=>avatarItem(s,slot).color);
  return '<div class="visual-avatar '+className+'" style="--skin:'+skin+';--hair:'+hair+';--top:'+top+';--bottoms:'+bottoms+';--shoes:'+shoes+'">'+
    '<i class="va-hair"></i><i class="va-head"></i><i class="va-body"></i><i class="va-arm l"></i><i class="va-arm r"></i><i class="va-leg l"></i><i class="va-leg r"></i><i class="va-shoe l"></i><i class="va-shoe r"></i>'+
  '</div>';
}

export function bikeMarkSvg(className='visual-bike-mark'){
  return '<svg class="visual-bike-mark '+className+'" viewBox="0 0 180 92" aria-hidden="true"><circle cx="38" cy="66" r="23"/><circle cx="142" cy="66" r="23"/><path d="M38 66 72 31l28 35H64l36-35 42 35M72 31h38m-10 0 14-14m-10 0h24"/></svg>';
}

export function renderEntryProductStage(host,{profile}={}){
  if(!host) return;
  let selected=chooseEntryPreview(catalog.bikes,readStorage('entryPreview'));
  host.innerHTML=
    '<div class="entry-stage-orbit" aria-hidden="true"></div>'+
    '<div class="entry-stage-object entry-stage-bike"><img width="1200" height="754" fetchpriority="high" decoding="async" hidden alt=""><div class="entry-bike-silhouette" hidden>'+bikeMarkSvg()+'</div></div>'+
    '<div class="entry-stage-object entry-stage-avatar"><img src="assets/entry/triathlete.webp" width="356" height="837" alt="Block triathlete in a trisuit and running shoes"></div>'+
    '<button class="entry-livery" type="button" aria-label="Discover another bike"><span aria-hidden="true">↻</span> Another bike</button>'+
    '<div class="entry-stage-caption"><small>YOUR NEXT DISCOVERY</small><b></b><span class="entry-edition" aria-live="polite"></span></div>';
  const bike=host.querySelector('.entry-stage-bike img'),label=host.querySelector('.entry-edition'),title=host.querySelector('.entry-stage-caption b'),silhouette=host.querySelector('.entry-bike-silhouette');
  const show=()=>{
    if(!selected)return;
    writeStorage('entryPreview',selected.id);
    host.dataset.previewId=selected.id;host.classList.toggle('entry-secret-preview',!!selected.secret);
    bike.hidden=!!selected.secret;silhouette.hidden=!selected.secret;
    if(selected.secret){bike.removeAttribute('src');bike.alt='';title.textContent='Something worth finding.';label.textContent='Secret Collection';}
    else{bike.alt=[selected.brand,selected.label].filter(Boolean).join(' ');bike.src=selected.image;title.textContent='Canyon. Unrestrained.';label.textContent=[selected.brand,selected.label,selected.year].filter(Boolean).join(' · ');}
    title.title=title.textContent;
  };
  bike.addEventListener('error',()=>{bike.hidden=true;silhouette.hidden=false;label.textContent='Preview unavailable · keep exploring';});
  show();
  host.querySelector('.entry-livery').addEventListener('click',()=>{selected=chooseEntryPreview(catalog.bikes,selected?.id);show();});
  const move=e=>{
    if(e.pointerType!=='mouse'||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const r=host.getBoundingClientRect(),x=(e.clientX-r.left)/Math.max(1,r.width)-.5,y=(e.clientY-r.top)/Math.max(1,r.height)-.5;
    host.style.setProperty('--stage-rx',(y*-3).toFixed(2)+'deg');host.style.setProperty('--stage-ry',(x*5).toFixed(2)+'deg');
  };
  host.addEventListener('pointermove',move,{passive:true});
  host.addEventListener('pointerleave',()=>{host.style.removeProperty('--stage-rx');host.style.removeProperty('--stage-ry')},{passive:true});
}
