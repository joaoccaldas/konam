// engine/navigation-policy.js — deterministic progressive disclosure for the app shell.
//
// This policy changes what the persistent navigation *shows*, never which routes exist.
// Home cards, deep links and accessibility-safe direct routes remain available.
// Product goal: simple surface first; reveal durable destinations when they become meaningful.

export const NAV_ORDER=Object.freeze(['home','discover','garage','plan','me']);

const engine=snapshot=>snapshot?.progression_engine?.schema==='progression-v1'
  ? snapshot.progression_engine
  : null;

const hasIdentity=snapshot=>Boolean(snapshot?.race_identity && typeof snapshot.race_identity==='object');
const hasEquipment=snapshot=>
  (Array.isArray(snapshot?.user_equipment)&&snapshot.user_equipment.length>0) ||
  (Array.isArray(snapshot?.garage)&&snapshot.garage.length>0);

const hasRaceContext=snapshot=>
  (Array.isArray(snapshot?.race_history)&&snapshot.race_history.length>0) ||
  Boolean(snapshot?.race_setup || snapshot?.entry_intent?.race || snapshot?.race_identity?.race);

const hasMeaningfulDiscovery=snapshot=>{
  const p=engine(snapshot);
  if(!p)return false;
  const discoveries=Array.isArray(p.discoveries)?p.discoveries:[];
  const seen=Array.isArray(p.seen)?p.seen:[];
  // Equipment/onboarding events alone should not make the whole world navigation appear.
  const worldDiscovery=discoveries.some(id=>!/^bike:/.test(id));
  const explorationEvent=seen.some(id=>/^(?:FIND_|ROOM_|QUEST_|collection-complete:)/.test(id));
  return worldDiscovery||explorationEvent;
};

export function navigationForState(snapshot={}, {admin=false}={}){
  if(admin)return [...NAV_ORDER];
  const visible=new Set(['home']);
  if(hasMeaningfulDiscovery(snapshot))visible.add('discover');
  if(hasEquipment(snapshot))visible.add('garage');
  if(hasRaceContext(snapshot))visible.add('plan');
  if(hasIdentity(snapshot))visible.add('me');
  return NAV_ORDER.filter(id=>visible.has(id));
}

export function navigationVisibility(snapshot={},options={}){
  const visible=new Set(navigationForState(snapshot,options));
  return Object.freeze(Object.fromEntries(NAV_ORDER.map(id=>[id,visible.has(id)])));
}
