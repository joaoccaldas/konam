// One public visibility policy. Progression and admin bypass never enable a held event.
import policy from '../../../museum/game/special-events.json' with { type: 'json' };
export const eventEnabled = id => policy.events[id]?.enabled !== false;
export function contentVisible(content) {
  const value = typeof content === 'string' ? {id:content} : content || {};
  const ids = [value.id,value.entity_id,value.product_id,value.room,value.edition,value.special_event,value.selector?.edition,...(value.where||[]).map(x=>x.id),...(value.locations||[])].filter(x=>typeof x==='string');
  return eventEnabled('wyld') || !ids.some(x=>/(?:^|:)wyld(?:$|-)|(?:^|:)edition-wyld-/.test(x) || (policy.events.wyld.content_ids||[]).includes(x.split(':').at(-1)));
}
