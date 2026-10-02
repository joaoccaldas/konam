// engine/avatar.js — canonical avatar platform contract.
// One data model powers phone and desktop. UI and renderer are projections only.
// New archetypes/items should be added here, not hard-coded into screen code.

export const AVATAR_SCHEMA_VERSION=5;

export const AVATAR_ARCHETYPES=Object.freeze([
  Object.freeze({id:'minecraft',label:'Minecraft',note:'Block-built, playful and instantly readable.',shape:'voxel',animation:'bounce'}),
  Object.freeze({id:'renegade',label:'Badass',note:'Athletic street-racer silhouette with optional ink.',shape:'renegade',animation:'swagger'}),
  Object.freeze({id:'aero',label:'Aero',note:'Lean futuristic race avatar with a technical silhouette.',shape:'aero',animation:'ready'}),
  Object.freeze({id:'islander',label:'Islander',note:'Relaxed Kona explorer with a softer, sun-ready silhouette.',shape:'islander',animation:'sway'}),
]);
export const AVATAR_ARCHETYPE_IDS=Object.freeze(AVATAR_ARCHETYPES.map(x=>x.id));
export const AVATAR_PRESENTATIONS=Object.freeze([
  Object.freeze({id:'male',label:'Male'}),
  Object.freeze({id:'female',label:'Female'}),
  Object.freeze({id:'prefer-not',label:'Prefer not to answer'}),
]);
export const AVATAR_PRESENTATION_IDS=Object.freeze(AVATAR_PRESENTATIONS.map(x=>x.id));

export const AVATAR_SLOTS=Object.freeze(['skin','hair','trisuit','top','bottoms','shoes','accessory','tattoo']);

export const AVATAR_ITEMS=Object.freeze({
  skin:Object.freeze([
    {id:'sand',label:'Sand',color:'#d6aa86'},
    {id:'bronze',label:'Bronze',color:'#b77d58'},
    {id:'umber',label:'Umber',color:'#80543d'},
    {id:'deep',label:'Deep',color:'#4e342b'},
  ]),
  hair:Object.freeze([
    {id:'none',label:'No hair',color:'transparent'},
    {id:'short',label:'Short',color:'#211c1a'},
    {id:'crop',label:'Crop',color:'#342922'},
    {id:'cap',label:'Cap',color:'#0f1519'},
  ]),
  trisuit:Object.freeze([
    {id:'kona-classic',label:'KONA Classic',color:'#11181c',accent:'#ff6a00',kind:'trisuit',layout:'classic'},
    {id:'aero-panel',label:'Aero Panel',color:'#101820',accent:'#00a7c7',kind:'trisuit',layout:'panel'},
    {id:'split-wave',label:'Split Wave',color:'#f4efe7',accent:'#ff2d6d',kind:'trisuit',layout:'split'},
    {id:'lava-line',label:'Lava Line',color:'#080b0e',accent:'#ff833d',kind:'trisuit',layout:'stripe'},
    {id:'blank-canvas',label:'Blank Canvas',color:'#fbf9f5',accent:'#12181d',kind:'trisuit',layout:'blank'},
    {id:'separates',label:'Top + bottoms',color:'#11181c',accent:'#ff6a00',kind:'trisuit',layout:'separates'},
  ]),
  top:Object.freeze([
    {id:'kona-black',label:'Kona black top',color:'#11181c',kind:'clothing'},
    {id:'lava',label:'Lava top',color:'#e8471c',kind:'clothing'},
    {id:'ocean',label:'Ocean top',color:'#138a8f',kind:'clothing'},
    {id:'hibiscus',label:'Hibiscus top',color:'#c53b72',kind:'clothing'},
    {id:'lime',label:'Lime top',color:'#719444',kind:'clothing'},
  ]),
  bottoms:Object.freeze([
    {id:'black',label:'Black bottoms',color:'#101417',kind:'clothing'},
    {id:'navy',label:'Navy bottoms',color:'#172938',kind:'clothing'},
    {id:'graphite',label:'Graphite bottoms',color:'#3a4247',kind:'clothing'},
  ]),
  shoes:Object.freeze([
    {id:'white',label:'White shoes',color:'#ecebe6',kind:'clothing'},
    {id:'lava',label:'Lava shoes',color:'#e8471c',kind:'clothing'},
    {id:'ocean',label:'Ocean shoes',color:'#138a8f',kind:'clothing'},
    {id:'lime',label:'Lime shoes',color:'#719444',kind:'clothing'},
  ]),
  accessory:Object.freeze([
    {id:'none',label:'No accessory',color:'transparent',kind:'accessory'},
    {id:'visor',label:'Visor',color:'#11181c',kind:'accessory'},
    {id:'headband',label:'Headband',color:'#f0eee8',kind:'accessory'},
  ]),
  tattoo:Object.freeze([
    {id:'none',label:'No ink',color:'transparent',kind:'body-art'},
    {id:'bands',label:'Arm bands',color:'#15191b',kind:'body-art'},
    {id:'geo',label:'Geometric ink',color:'#15191b',kind:'body-art'},
    {id:'lava-mark',label:'Lava mark',color:'#6f2112',kind:'body-art'},
  ]),
});

export const AVATAR_OPTIONS=Object.freeze(Object.fromEntries(
  Object.entries(AVATAR_ITEMS).map(([slot,items])=>[slot,Object.freeze(items.map(x=>x.id))])
));
export const AVATAR_COLORS=Object.freeze(Object.fromEntries(
  Object.entries(AVATAR_ITEMS).map(([slot,items])=>[slot,Object.freeze(Object.fromEntries(items.map(x=>[x.id,x.color])))])
));

const hex=v=>/^#[0-9a-f]{6}$/i.test(String(v||''))?String(v):null;
const safeOverlay=v=>{
  if(!v||typeof v!=='object')return null;
  const src=String(v.src||'');
  if(!/^data:image\/(png|jpeg|webp);base64,/i.test(src)||src.length>700000)return null;
  return {src,name:String(v.name||'overlay').slice(0,80),opacity:Math.min(1,Math.max(0,+v.opacity||1)),updatedAt:String(v.updatedAt||'')};
};
const itemFor=(slot,id)=>AVATAR_ITEMS[slot]?.find(x=>x.id===id)||AVATAR_ITEMS[slot]?.[0];

export const defaultAvatarStyle=()=>({
  v:AVATAR_SCHEMA_VERSION,
  archetype:'minecraft',
  presentation:'prefer-not',
  accent:'#e8471c',
  items:{
    skin:{id:'bronze',color:null,overlay:null},
    hair:{id:'short',color:null,overlay:null},
    trisuit:{id:'kona-classic',color:null,accentColor:null,overlay:null},
    top:{id:'kona-black',color:null,overlay:null},
    bottoms:{id:'black',color:null,overlay:null},
    shoes:{id:'white',color:null,overlay:null},
    accessory:{id:'none',color:null,overlay:null},
    tattoo:{id:'none',color:null,overlay:null},
  },
});

export function normaliseAvatarItem(slot,value,fallbackId){
  const raw=value&&typeof value==='object'?value:{id:value};
  const requested=String(raw.id||fallbackId||AVATAR_ITEMS[slot]?.[0]?.id||'');
  const item=itemFor(slot,requested);
  return {id:item.id,color:hex(raw.color),accentColor:hex(raw.accentColor),overlay:safeOverlay(raw.overlay)};
}

export function normaliseAvatarStyle(value){
  const d=defaultAvatarStyle(),o=value&&typeof value==='object'?value:{};
  const legacy={
    skin:o.skin,hair:o.hair,trisuit:o.trisuit,top:o.top,bottoms:o.bottoms,shoes:o.shoes,accessory:o.accessory,tattoo:o.tattoo,
  };
  const items={};
  for(const slot of AVATAR_SLOTS){
    const source=o.items?.[slot]??legacy[slot]??d.items[slot];
    items[slot]=normaliseAvatarItem(slot,source,d.items[slot].id);
  }
  return {
    v:AVATAR_SCHEMA_VERSION,
    archetype:AVATAR_ARCHETYPE_IDS.includes(o.archetype)?o.archetype:d.archetype,
    presentation:AVATAR_PRESENTATION_IDS.includes(o.presentation)?o.presentation:(AVATAR_PRESENTATION_IDS.includes(o.gender)?o.gender:d.presentation),
    accent:hex(o.accent)||d.accent,
    items,
  };
}

export function avatarItem(styleInput,slot){
  const style=normaliseAvatarStyle(styleInput);
  const state=style.items[slot];
  const item=itemFor(slot,state?.id);
  return Object.freeze({...item,...state,color:state?.color||item?.color||'#777777',accentColor:state?.accentColor||item?.accent||'#ffffff'});
}

export function patchAvatarItem(styleInput,slot,patch={}){
  const style=normaliseAvatarStyle(styleInput);
  if(!AVATAR_SLOTS.includes(slot))return style;
  return normaliseAvatarStyle({...style,items:{...style.items,[slot]:{...style.items[slot],...patch}}});
}

export function setAvatarArchetype(styleInput,archetype){
  return normaliseAvatarStyle({...normaliseAvatarStyle(styleInput),archetype});
}
export function setAvatarPresentation(styleInput,presentation){
  return normaliseAvatarStyle({...normaliseAvatarStyle(styleInput),presentation});
}
