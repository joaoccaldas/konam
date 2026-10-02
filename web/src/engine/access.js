// engine/access.js — one entitlement resolver for app, Studio and 3D world.
import { contentVisible } from './event-visibility.js';
import { LEVELS, ADMIN_POLICY, RANKING_POLICY, ensureProgression } from './progression.js';

const rewards=()=>LEVELS.flatMap(level=>(level.rewards||[]).map(reward=>({...reward,level:level.level})));
const selectorMatch=(product,selector={})=>Object.entries(selector).every(([key,value])=>{
  if(key==='ids')return Array.isArray(value)&&value.includes(product?.id);
  return product?.[key]===value;
});

export function minimumLevelForRoom(roomId){
  let min=Infinity;
  for(const reward of rewards()){
    if(reward.type==='room'&&reward.id===roomId)min=Math.min(min,reward.level);
    if(reward.type==='room-group'&&typeof reward.selector?.prefix==='string'&&String(roomId).startsWith(reward.selector.prefix))min=Math.min(min,reward.level);
  }
  return Number.isFinite(min)?min:1;
}
export function minimumLevelForProduct(product){
  if(!product)return 1;
  let min=Infinity;
  for(const reward of rewards()){
    if(reward.type==='bike'&&reward.id===product.id)min=Math.min(min,reward.level);
    if(reward.type==='bike-group'&&selectorMatch(product,reward.selector))min=Math.min(min,reward.level);
  }
  return Number.isFinite(min)?min:1;
}
export function minimumLevelForAvatarItem(slot,id){
  const row=rewards().find(x=>x.type==='avatar-item'&&x.slot===slot&&x.id===id);
  return row?.level||1;
}
export function minimumLevelForFeature(id){
  const row=rewards().find(x=>x.type==='feature'&&x.id===id);
  return row?.level||1;
}
export function canAccessLevel(required,{state=ensureProgression(),admin=false}={}){
  if(admin&&ADMIN_POLICY.bypass_progression_visibility)return true;
  return Math.max(1,Number(state?.level)||1)>=Math.max(1,Number(required)||1);
}
export function roomAccess(roomId,options={}){
  if(!contentVisible(roomId))return Object.freeze({id:roomId,requiredLevel:null,unlocked:false,hidden:true});
  const requiredLevel=minimumLevelForRoom(roomId);
  return Object.freeze({id:roomId,requiredLevel,unlocked:canAccessLevel(requiredLevel,options)});
}
export function productAccess(product,options={}){
  if(!contentVisible(product))return Object.freeze({id:product?.id||'',requiredLevel:null,unlocked:false,informationVisible:false,hidden:true});
  const requiredLevel=minimumLevelForProduct(product);
  return Object.freeze({id:product?.id||'',requiredLevel,unlocked:canAccessLevel(requiredLevel,options),informationVisible:true});
}
export function avatarItemAccess(slot,id,options={}){
  const requiredLevel=minimumLevelForAvatarItem(slot,id);
  return Object.freeze({slot,id,requiredLevel,unlocked:canAccessLevel(requiredLevel,options)});
}
export function levelContent(state=ensureProgression(),{admin=false}={}){
  const level=admin&&ADMIN_POLICY.full_visibility?(LEVELS.at(-1)?.level||10):Math.max(1,Number(state?.level)||1);
  const all=rewards().filter(contentVisible);
  return Object.freeze({
    level,
    rooms:all.filter(x=>x.type==='room'||x.type==='room-group').map(x=>({...x,unlocked:admin||x.level<=level})),
    bikes:all.filter(x=>x.type==='bike'||x.type==='bike-group').map(x=>({...x,unlocked:admin||x.level<=level})),
    avatar:all.filter(x=>x.type==='avatar-item').map(x=>({...x,unlocked:admin||x.level<=level})),
    features:all.filter(x=>['feature','equipment-slot','garage-bay','surprise-tier','cosmetic'].includes(x.type)).map(x=>({...x,unlocked:admin||x.level<=level})),
  });
}
export function rankingMetric(state=ensureProgression(),remote=null){
  if(remote&&Number(remote.population)>=Number(RANKING_POLICY.minimum_population||25)&&Number.isFinite(Number(remote.rank))){
    return Object.freeze({status:'ranked',rank:Number(remote.rank),population:Number(remote.population),percentile:Number(remote.percentile)||null});
  }
  return Object.freeze({status:'unranked',label:RANKING_POLICY.anonymous_label||'Unranked',minimumPopulation:Number(RANKING_POLICY.minimum_population||25)});
}

export function findAccess(item,{collected=false,admin=false}={}){
  return Object.freeze({id:item?.id,detailsVisible:collected||Boolean(admin&&ADMIN_POLICY.full_visibility),owned:collected});
}
