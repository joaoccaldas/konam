// engine/items.js — collection projections over canonical personal state.
// No independent persistence. Finds are defined by the generated game registry and
// collected state comes only from Progression.
import { contentVisible } from './event-visibility.js';
import { FIND_REGISTRY } from '../generated/game-config.js';

const clean = value => String(value || '').replace(/^(?:product|bike|part|find|kona|relic):/, '');
export const FIND_COUNT=Number(FIND_REGISTRY.count)||100;
export const FIND_ITEMS=Object.freeze((FIND_REGISTRY.items||[]).map(x=>Object.freeze({...x})));
export const FIND_METHODS=Object.freeze(FIND_REGISTRY.acquisition_methods||{});

export function findById(id){return FIND_ITEMS.find(x=>x.id===id)||null;}

export function findCollection(snapshot={}){
  const engine=snapshot.progression_engine||{};
  const found=new Set([...(Array.isArray(engine.discoveries)?engine.discoveries:[]),...Object.keys(snapshot.progression?.stamps||{})]);
  const acquisitions=Array.isArray(engine.acquisitions)?engine.acquisitions:[];
  const byAcquisition=new Map(acquisitions.map(x=>[x.item_id,x]));
  return FIND_ITEMS.map(item=>Object.freeze({
    ...item,
    collected:found.has(item.id),
    acquired:byAcquisition.get(item.id)||null,
  }));
}

export function findSummary(snapshot={}){
  const items=findCollection(snapshot);
  const collected=items.filter(x=>x.collected);
  const count=method=>collected.filter(x=>(x.acquired?.method||x.acquisition)===method).length;
  return Object.freeze({
    total:items.length,
    collected:collected.length,
    hidden:count('hidden'),
    trade:count('trade'),
    event:count('event'),
    percent:items.length?Math.round(collected.length/items.length*100):0,
  });
}

export function itemCollection(snapshot = {}) {
  const rows = [];
  const seen = new Set();
  const push = item => {
    if (!item?.id || !contentVisible(item) || seen.has(item.id)) return;
    seen.add(item.id); rows.push(item);
  };

  for (const e of Array.isArray(snapshot.user_equipment) ? snapshot.user_equipment : []) {
    push({
      id:'equipment:' + clean(e.product_id),
      entity_id:e.product_id,
      kind:'equipment',
      relationship:e.relationship || 'try',
      label:clean(e.product_id).replace(/[-_]+/g,' '),
      collected:true,
    });
  }

  for (const race of Array.isArray(snapshot.race_history) ? snapshot.race_history : []) {
    push({
      id:'race:' + race.race_id,
      entity_id:race.race_id,
      kind:'race',
      relationship:race.relationship || 'interested',
      label:'Race badge',
      collected:true,
    });
  }

  for(const item of findCollection(snapshot).filter(x=>x.collected)){
    push({
      id:'find-card:'+item.id,
      entity_id:item.id,
      kind:'find',
      relationship:item.acquired?.method||item.acquisition||'hidden',
      label:item.name,
      collected:true,
    });
  }

  const discoveries = [...new Set([...(snapshot.progression_engine?.discoveries||[]), ...Object.keys(snapshot.progression?.stamps||{}), ...(snapshot.progression?.discoveries||[]).map(id=>'bike:'+id)])];
  for (const id of discoveries) {
    const raw=String(id);
    if(findById(raw))continue;
    const kind=raw.startsWith('bike:')?'bike':raw.startsWith('part:')?'part':raw.startsWith('kona:')?'story':'card';
    push({
      id:'discovery:' + raw,
      entity_id:raw,
      kind,
      relationship:'collected',
      label:clean(raw).replace(/[-_]+/g,' '),
      collected:true,
    });
  }

  return rows;
}

export function collectionSummary(snapshot = {}) {
  const items=itemCollection(snapshot);
  const finds=findSummary(snapshot);
  const count=kind=>items.filter(x=>x.kind===kind).length;
  return {
    total:items.length,
    equipment:count('equipment'),
    bikes:count('bike'),
    parts:count('part'),
    finds:finds.collected,
    findSlots:finds.total,
    stories:count('story'),
    races:count('race')
  };
}
