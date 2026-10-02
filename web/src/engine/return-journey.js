import { readStorage, writeStorage } from './storage.js';

const SESSION_KEY='kona.returnJourney.session.v1';
const fresh=()=>({
  schema:1,
  visits:0,
  rewardsSeen:false,
  installTeaserSeen:false,
  installReminderSeen:false,
  installDismissals:0,
  lastInstallPromptVisit:0,
  annoyanceAsked:false,
  installEngaged:false,
  installOptOut:false,
});

export function readReturnJourney(storage=globalThis.localStorage){
  try{
    const raw=JSON.parse(readStorage('returnJourney',storage)||'null');
    return raw?.schema===1?{...fresh(),...raw}:fresh();
  }catch(_){return fresh();}
}
export function writeReturnJourney(state,storage=globalThis.localStorage){
  writeStorage('returnJourney',JSON.stringify({...fresh(),...state,schema:1}),storage);
  return state;
}
export function registerVisit({storage=globalThis.localStorage,session=globalThis.sessionStorage}={}){
  const state=readReturnJourney(storage);
  let counted=false;
  try{
    if(session?.getItem?.(SESSION_KEY)!=='1'){
      session?.setItem?.(SESSION_KEY,'1');
      state.visits+=1;
      counted=true;
      writeReturnJourney(state,storage);
    }
  }catch(_){
    state.visits+=1;
    counted=true;
    writeReturnJourney(state,storage);
  }
  return {state,counted};
}
export function nextReturnMoment(state,{standalone=false,native=false}={}){
  const s={...fresh(),...(state||{})};
  if(s.visits>=3&&!s.rewardsSeen)return 'rewards';
  if(standalone||native||s.installOptOut||s.installEngaged)return null;
  if(s.visits>=5&&!s.installTeaserSeen)return 'install-teaser';
  if(s.installDismissals>=1&&s.visits>=s.lastInstallPromptVisit+3&&!s.installReminderSeen)return 'install-reminder';
  if(s.installDismissals>=2&&s.visits>=s.lastInstallPromptVisit+3&&!s.annoyanceAsked)return 'annoyance-check';
  return null;
}
export function recordReturnMoment(state,moment,action,storage=globalThis.localStorage){
  const s={...fresh(),...(state||{})};
  if(moment==='rewards')s.rewardsSeen=true;
  if(moment==='install-teaser')s.installTeaserSeen=true;
  if(moment==='install-reminder')s.installReminderSeen=true;
  if(moment==='annoyance-check')s.annoyanceAsked=true;
  if(moment?.startsWith('install')||moment==='annoyance-check')s.lastInstallPromptVisit=s.visits;
  if(action==='dismiss-install'){s.installDismissals+=1;}
  if(action==='engage-install'){s.installEngaged=true;}
  if(action==='opt-out-install'){s.installOptOut=true;}
  writeReturnJourney(s,storage);
  return s;
}
