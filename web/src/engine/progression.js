import { contentVisible } from './event-visibility.js';
import { readStorage, writeStorage, storageKey } from './storage.js';
import { readPassportState } from './passport-state.js';
import { PROGRESSION_CONFIG, RELIC_REGISTRY, UNLOCK_REGISTRY, FIND_REGISTRY } from '../generated/game-config.js';
// Progression runtime is generated from museum/game/*.json.
// JSON registries are the source of truth; UI code never owns reward values.

export const PROGRESSION_KEY = storageKey('progression');
export const TIERS = Object.freeze(['visitor','passport','athlete']);
export const LEVELS = Object.freeze((PROGRESSION_CONFIG.levels||[]).map(row=>{const summary=(row.summary||'').replace(/\s*\+\s*WYLD/g,'');return Object.freeze({...row,summary,unlock:summary,rewards:(row.rewards||[]).filter(contentVisible)});}));
export const EVENTS = Object.freeze(PROGRESSION_CONFIG.events||{});
const RARITY = Object.freeze(PROGRESSION_CONFIG.rarity_rewards||{});
export const COLLECTIBLES = Object.freeze([...(FIND_REGISTRY.items||[]),...(RELIC_REGISTRY.relics||[])].map(x=>Object.freeze({...x})));
export const UNLOCKS = Object.freeze((UNLOCK_REGISTRY.unlocks||[]).map(x=>Object.freeze({...x})));
export const COLLECTIONS = Object.freeze((PROGRESSION_CONFIG.collections||[]).map(x=>Object.freeze({...x})));
export const SURPRISE_POLICY = Object.freeze(PROGRESSION_CONFIG.surprise_policy||{});
export const RANKING_POLICY = Object.freeze(PROGRESSION_CONFIG.ranking_policy||{});
export const ADMIN_POLICY = Object.freeze(PROGRESSION_CONFIG.admin_policy||{});

const relicById=id=>(RELIC_REGISTRY.relics||[]).find(x=>x.id===id)||null;
const collectionCount=(state,id)=>{
  const relics=(RELIC_REGISTRY.relics||[]).filter(x=>x.collection===id);
  const found=new Set(state?.discoveries||[]);
  return relics.filter(x=>found.has(x.id)).length;
};
export function levelRewards(level){
  return Object.freeze([...(LEVELS.find(x=>x.level===Number(level))?.rewards||[])].map(x=>Object.freeze({...x})));
}
export function visibleProgression(state,{admin=false}={}){
  const level=admin&&ADMIN_POLICY.full_visibility?LEVELS.at(-1)?.level||10:Math.max(1,Number(state?.level)||1);
  const levels=LEVELS.map(row=>Object.freeze({...row,unlocked:admin||row.level<=level}));
  const rewards=levels.flatMap(row=>(row.rewards||[]).map(reward=>Object.freeze({...reward,level:row.level,unlocked:admin||row.level<=level})));
  return Object.freeze({level,levels,rewards,admin:!!admin});
}
export function rewardUnlocked(state,reward,{admin=false}={}){
  if(!contentVisible(reward))return false;
  if(admin&&ADMIN_POLICY.bypass_progression_visibility)return true;
  if(!reward)return false;
  const source=LEVELS.find(row=>(row.rewards||[]).some(x=>x.type===reward.type&&x.id===reward.id));
  if(source)return (Number(state?.level)||1)>=source.level;
  return (state?.unlocks||[]).some(id=>{
    const unlock=UNLOCKS.find(x=>x.id===id);
    return unlock?.reward?.type===reward.type&&unlock?.reward?.id===reward.id;
  });
}

const tierRank = t => Math.max(0, TIERS.indexOf(t));

export function levelFor(xp) {
  const n = Math.max(0, Number(xp) || 0);
  let cur = LEVELS[0];
  for (const row of LEVELS) if (n >= row.xp) cur = row;
  return cur;
}

export function emptyProgression() {
  return {
    schema: 'progression-v1',
    access_tier: 'visitor',
    xp: 0,
    level: 1,
    level_name: 'Visitor',
    streak: 0,
    discoveries: [],
    badges: [],
    unlocks: [],
    seen: [],
    ledger: [],
    credits: 0,
    history: [],
    acquisitions: [],
  };
}

export function collectibleById(id) {
  return COLLECTIBLES.find(c => c.id === id) || null;
}

export function collectibleReward(itemOrId){
  const item=typeof itemOrId==='string'?collectibleById(itemOrId):itemOrId;
  if(!item)return Object.freeze({xp:0,credits:0});
  const pay=RARITY[item.rarity]||RARITY.common||{xp:0,credits:0};
  return Object.freeze({xp:Math.max(0,Number(pay.xp)||0),credits:Math.max(0,Number(pay.credits)||0)});
}

function countPrefix(state, prefix) {
  return (state.discoveries||[]).filter(id => id.startsWith(prefix)).length;
}

export function canUnlock(state, unlock) {
  if (!state || !unlock || state.unlocks.includes(unlock.id)) return false;
  return (unlock.requirements||[]).every(req => {
    if (req.type === 'level') return state.level >= req.min;
    if (req.type === 'tier') return tierRank(state.access_tier) >= tierRank(req.min);
    if (req.type === 'collection') {
      if(req.prefix)return countPrefix(state,req.prefix)>=Number(req.count||1);
      const collection=COLLECTIONS.find(x=>x.id===req.id);
      const required=Number(req.count||collection?.required||1);
      return collectionCount(state,req.id)>=required;
    }
    return false;
  });
}

function withLevel(state) {
  const lv = levelFor(state.xp);
  state.level = lv.level;
  state.level_name = lv.name;
  state.credits = state.ledger.reduce((n, row) => n + row.delta, 0);
  return state;
}

export function applyEvent(state, event) {
  const base = state ? structuredClone(state) : emptyProgression();
  if (!event?.type || !EVENTS[event.type]) return { state: base, granted: null, error: 'unknown-event' };
  const id = String(event.id || `${event.type}:${event.subject || ''}`).slice(0, 80);
  if (!id || base.seen.includes(id)) return { state: base, granted: null, duplicate: true };

  let xp = EVENTS[event.type].xp;
  let credits = EVENTS[event.type].credits;
  let discovery = null;
  if (event.type === 'FIND_DISCOVERED' || event.type === 'FIND_ACQUIRED') {
    const item = collectibleById(event.subject);
    if (!item) return { state: base, granted: null, error: 'unknown-collectible' };
    if (base.discoveries.includes(item.id)) return { state: base, granted: null, duplicate: true };
    const pay = RARITY[item.rarity] || RARITY.common;
    xp = pay.xp;
    credits = pay.credits;
    discovery = item.id;
    const method = event.type === 'FIND_DISCOVERED'
      ? 'hidden'
      : ['hidden','trade','event'].includes(event.method) ? event.method : item.acquisition || 'hidden';
    base.acquisitions = Array.isArray(base.acquisitions) ? base.acquisitions : [];
    if (!base.acquisitions.some(x=>x.item_id===item.id)) {
      base.acquisitions.push({ item_id:item.id, method, at:String(event.at||new Date().toISOString()) });
    }
  }
  if (event.type === 'CURRENCY_SPENT') {
    const cost = Math.abs(Number(event.amount) || 0);
    if (!cost || base.credits < cost) return { state: base, granted: null, error: 'insufficient-credits' };
    credits = -cost;
    xp = 0;
  }
  if (event.type === 'PASSPORT_CREATED') base.access_tier = 'passport';
  if (event.type === 'EQUIPMENT_ADDED' && event.relationship === 'dream') {
    xp = EVENTS.DREAM_EQUIPMENT_ADDED.xp;
  }

  base.seen.push(id);
  base.xp += xp;
  if (credits) base.ledger.push({ id, delta: credits, reason: event.type });
  if (discovery && !base.discoveries.includes(discovery)) base.discoveries.push(discovery);
  if (event.discovery && !base.discoveries.includes(event.discovery)) base.discoveries.push(String(event.discovery));
  const completedCollections=[];
  for(const collection of COLLECTIONS){
    const completionId='collection-complete:'+collection.id;
    if(base.seen.includes(completionId))continue;
    const required=Number(collection.required)||1;
    if(collectionCount(base,collection.id)<required)continue;
    base.seen.push(completionId);
    const reward=collection.reward||{};
    const bonusXp=Math.max(0,Number(reward.xp)||0),bonusCredits=Math.max(0,Number(reward.credits)||0);
    base.xp+=bonusXp;
    if(bonusCredits)base.ledger.push({id:completionId,delta:bonusCredits,reason:'COLLECTION_COMPLETED'});
    if(reward.badge&&!base.badges.includes(reward.badge))base.badges.push(reward.badge);
    completedCollections.push({id:collection.id,xp:bonusXp,credits:bonusCredits,badge:reward.badge||null});
  }
  withLevel(base);
  const opened = [];
  for (const unlock of UNLOCKS) {
    if (canUnlock(base, unlock)) {
      base.unlocks.push(unlock.id);
      if (unlock.reward?.type === 'badge' && !base.badges.includes(unlock.reward.id)) base.badges.push(unlock.reward.id);
      opened.push(unlock.id);
    }
  }
  base.history.push({ id, type: event.type, xp, credits });
  if (base.history.length > 200) base.history.splice(0, base.history.length - 200);
  return { state: base, granted: { id, xp, credits, unlocks: opened, collections: completedCollections } };
}

export function migratePassport({ passport = null, finds = [] } = {}) {
  const state = emptyProgression();
  if (passport && typeof passport === 'object') {
    if (typeof passport.xp === 'number') state.xp = Math.max(0, passport.xp);
    if (typeof passport.streak === 'number') state.streak = Math.max(0, passport.streak);
    if (passport.profile) state.access_tier = 'passport';
    if (Array.isArray(passport.discoveries)) {
      for (const key of passport.discoveries) {
        const id = `bike:${key}`;
        if (!state.discoveries.includes(id)) state.discoveries.push(id);
        state.seen.push(`migrate:${id}`);
      }
    }
    if (passport.stamps && typeof passport.stamps === 'object') {
      for (const key of Object.keys(passport.stamps)) {
        if (!state.discoveries.includes(key)) state.discoveries.push(key);
        state.seen.push(`FIND_DISCOVERED:${key}`);
        state.seen.push(`migrate:${key}`);
      }
    }
    if (passport.badges && typeof passport.badges === 'object') {
      for (const key of Object.keys(passport.badges)) if (!state.badges.includes(key)) state.badges.push(key);
    }
  }
  const ids = Array.isArray(finds) ? finds : Object.keys(finds || {});
  for (const id of ids) {
    const subject = collectibleById(id) ? id : `find:shore:${id}`;
    if (!collectibleById(subject)) continue;
    if (!state.discoveries.includes(subject)) state.discoveries.push(subject);
    state.seen.push(`FIND_DISCOVERED:${subject}`);
  }
  return withLevel(state);
}

export function readProgression(storage = globalThis.localStorage) {
  try {
    const raw = JSON.parse(readStorage('progression',storage) || 'null');
    if (raw?.schema === 'progression-v1') {
      if(!Array.isArray(raw.acquisitions))raw.acquisitions=[];
      return withLevel(raw);
    }
  } catch (_) { /* keep going into migration */ }
  return null;
}

export function writeProgression(state, storage = globalThis.localStorage) {
  try { writeStorage('progression',JSON.stringify(state),storage); } catch (_) { /* private mode */ }
  return state;
}

export function ensureProgression(storage = globalThis.localStorage) {
  const existing = readProgression(storage);
  if (existing) return existing;
  let passport = null;
  let finds = [];
  passport = readPassportState(storage);
  try { finds = JSON.parse(readStorage('finds',storage) || '[]'); } catch (_) {}
  return writeProgression(migratePassport({ passport, finds }), storage);
}

export function applyStoredEvent(event, storage = globalThis.localStorage) {
  const { state } = applyEvent(ensureProgression(storage), event);
  return writeProgression(state, storage);
}
