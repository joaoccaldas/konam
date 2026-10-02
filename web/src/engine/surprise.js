// engine/surprise.js — deterministic, sparse collectible surprises across app surfaces.
import { readStorage, writeStorage } from './storage.js';
import { COLLECTIBLES, SURPRISE_POLICY, ensureProgression, applyStoredEvent, collectibleById } from './progression.js';
import { readReturnJourney } from './return-journey.js';

const SESSION_KEY='kona.surprise.session.v1';
const rarityOrder=['common','uncommon','rare','epic','legendary','mythic'];
const hash=s=>[...String(s)].reduce((n,c)=>((n*33)^c.charCodeAt(0))>>>0,5381);
const stateDefault=()=>({schema:1,last_visit:0,shown:[],collected:[]});
export function readSurpriseState(storage=globalThis.localStorage){
  try{return {...stateDefault(),...JSON.parse(readStorage('surpriseState',storage)||'null')}}catch(_){return stateDefault()}
}
const save=(s,storage=globalThis.localStorage)=>{writeStorage('surpriseState',JSON.stringify({...stateDefault(),...s,schema:1}),storage);return s};
export function eligibleSurprises({surface,state=ensureProgression(),admin=false}={}){
  if(!(SURPRISE_POLICY.eligible_surfaces||[]).includes(surface))return[];
  const level=admin?10:Math.max(1,Number(state?.level)||1);
  const found=new Set(state?.discoveries||[]);
  return COLLECTIBLES.filter(item=>{
    if(!String(item.id).startsWith('relic:')||found.has(item.id))return false;
    const min=Number(SURPRISE_POLICY.rarity_by_min_level?.[item.rarity]||2);
    return level>=min;
  });
}
export function nextSurprise({surface,state=ensureProgression(),admin=false,storage=globalThis.localStorage,session=globalThis.sessionStorage,date=new Date()}={}){
  const policy=SURPRISE_POLICY||{},visits=readReturnJourney(storage).visits||0;
  if(visits<Number(policy.start_visit||4))return null;
  const saved=readSurpriseState(storage);
  if(visits-saved.last_visit<Number(policy.min_visits_between||2))return null;
  try{if(session?.getItem?.(SESSION_KEY)==='1')return null}catch(_){}
  const pool=eligibleSurprises({surface,state,admin});
  if(!pool.length)return null;
  const day=date.toISOString().slice(0,10),seed=hash(day+':'+visits+':'+surface+':'+state.level);
  const item=pool[seed%pool.length],positions=policy.positions||['top-right'];
  return Object.freeze({...item,position:positions[seed%positions.length],requiredLevel:Number(policy.rarity_by_min_level?.[item.rarity]||2)});
}
export function markSurpriseShown(item,{storage=globalThis.localStorage,session=globalThis.sessionStorage}={}){
  if(!item)return readSurpriseState(storage);
  const s=readSurpriseState(storage),visits=readReturnJourney(storage).visits||0;
  if(!s.shown.includes(item.id))s.shown.push(item.id);
  s.last_visit=visits;save(s,storage);
  try{session?.setItem?.(SESSION_KEY,'1')}catch(_){}
  return s;
}
export function collectSurprise(item,{storage=globalThis.localStorage}={}){
  const found=collectibleById(item?.id);if(!found)return{ok:false,reason:'unknown'};
  const before=ensureProgression(storage);
  const result=applyStoredEvent({type:'FIND_DISCOVERED',id:'surprise:'+found.id,subject:found.id},storage);
  const persisted=ensureProgression(storage);
  if(!(persisted.discoveries||[]).includes(found.id))return{ok:false,reason:'save-failed'};
  const s=readSurpriseState(storage);if(!s.collected.includes(found.id))s.collected.push(found.id);save(s,storage);
  const row=(result.history||[]).at(-1);
  return{ok:true,item:found,xp:result.xp-before.xp,credits:result.credits-before.credits,event:row||null,state:result};
}
export function rarityRank(rarity){return Math.max(0,rarityOrder.indexOf(rarity));}
