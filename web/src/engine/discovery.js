// engine/discovery.js — "what is over the horizon?" projected from canonical progression.
import { LEVELS } from './progression.js';

const kindOf=reward=>reward?.type==='room'||reward?.type==='room-group'?'place':reward?.type==='bike'||reward?.type==='bike-group'?'bike':reward?.type==='avatar-item'?'customization':reward?.type==='surprise-tier'?'surprise':reward?.type==='feature'?'feature':reward?.type||'reward';
const silhouette=kind=>({place:'ROOM',bike:'BIKE',customization:'KIT',surprise:'?',feature:'+',cosmetic:'STYLE','equipment-slot':'SLOT','garage-bay':'BAY'}[kind]||'NEW');

export const DISCOVERY_HORIZON=Object.freeze(
  LEVELS.filter(row=>row.level>1).map(row=>{
    const reward=(row.rewards||[]).find(x=>['room','bike','avatar-item','surprise-tier','feature'].includes(x.type))||(row.rewards||[])[0];
    const kind=kindOf(reward);
    return Object.freeze({
      id:'horizon:level-'+row.level,
      level:row.level,
      kind,
      tease:row.summary||'Something new is getting closer.',
      silhouette:silhouette(kind),
      reveal:reward?.label||row.summary||row.name,
    });
  })
);

export function discoveryHorizon(progression={},count=4,{admin=false}={}){
  const actual=Math.max(1,Number(progression.level)||1);
  const visibleLevel=admin?(LEVELS.at(-1)?.level||actual):actual;
  return DISCOVERY_HORIZON
    .map(row=>Object.freeze({...row,unlocked:visibleLevel>=row.level,levelsAway:Math.max(0,row.level-actual)}))
    .filter(row=>admin||row.level>=Math.max(2,actual-1))
    .slice(0,count);
}
