// The first minute. HTML only. The museum is not part of this.
// Rewards are events. This file does not add credits.

export const INTENTS = [
  { id: 'racing', label: 'Racing Kona' },
  { id: 'dreaming', label: 'Dreaming of Kona' },
  { id: 'supporting', label: 'Supporting someone' },
  { id: 'exploring', label: 'Just exploring' },
];

export const BIKES = [
  { id: 'canyon-cfr-2027', label: 'Speedmax CFR AXS' },
  { id: 'canyon-slx-2027', label: 'Speedmax CF SLX 8 Di2' },
  { id: 'canyon-speedmax-cf-2011', label: 'Speedmax CF 9.0 Pro' },
];

export const SHOES = [
  { id: 'nike-alphafly-3-study', label: 'Nike Alphafly 3' },
];

export const GOALS = ['Finish', 'Personal best', 'Sub-12', 'Sub-10', 'Podium', 'Someday'];

export function emptyQuest() {
  return { intent: null, bikeId: null, shoeId: null, goal: null };
}

export function relationshipFor(intent) {
  if (intent === 'racing') return 'owned';
  if (intent === 'dreaming') return 'dream';
  return 'try';
}

export function questReady(draft) {
  return !!(draft?.intent && draft?.goal);
}

const GOAL_SLUG={Finish:'finish','Personal best':'pb','Sub-12':'sub-12','Sub-10':'sub-10',Podium:'podium',Someday:'someday'};
const GOAL_FROM_SLUG=Object.fromEntries(Object.entries(GOAL_SLUG).map(([label,slug])=>[slug,label]));
export function questLabels(draft){return{bike:BIKES.find(x=>x.id===draft?.bikeId)?.label||'Bike later',shoe:SHOES.find(x=>x.id===draft?.shoeId)?.label||'Shoes later',goal:draft?.goal||''};}
export function encodeShare(draft){
 if(!questReady(draft)||!INTENTS.some(x=>x.id===draft.intent)||!GOAL_SLUG[draft.goal]) return null;
 if(draft.bikeId&&!BIKES.some(x=>x.id===draft.bikeId)) return null;
 if(draft.shoeId&&!SHOES.some(x=>x.id===draft.shoeId)) return null;
 return [draft.intent,draft.bikeId||'',draft.shoeId||'',GOAL_SLUG[draft.goal]].join('.');
}
export function decodeShare(token){
 const [intent,bikeId,shoeId,goalSlug,...rest]=String(token||'').split('.');
 if(rest.length||!INTENTS.some(x=>x.id===intent)||!GOAL_FROM_SLUG[goalSlug]) return null;
 if(bikeId&&!BIKES.some(x=>x.id===bikeId)) return null;if(shoeId&&!SHOES.some(x=>x.id===shoeId)) return null;
 return{intent,bikeId:bikeId||null,shoeId:shoeId||null,goal:GOAL_FROM_SLUG[goalSlug]};
}
