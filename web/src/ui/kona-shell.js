// ui/kona-shell.js — mobile-first app shell over the existing 3D museum.
// Navigation/utility only. The 3D renderer remains the existing proven museum runtime.
import { applyBrandMode } from '../brand/runtime.js';
import { renderGarageSurface } from './garage.js';
import { renderHomeSurface } from './home.js';
import { renderAvatarHome } from './avatar-home.js';
import { renderCollectionSurface } from './collection.js';
import { renderDiscoverSurface } from './discover.js';
import { renderPlanSurface } from './plan.js';
import { renderFeed, renderTravel } from './companion.js';
import { renderAdminAssets } from './admin-assets.js';
import { currentUser, isAdminUser } from '../cloud/supabase-lite.js';
import { readStorage, writeStorage } from '../engine/storage.js';
import { initReturnJourney } from './return-journey.js';
import { initSurpriseLayer } from './surprise.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon = name => {
  const d={
    now:'M3 11.5 12 4l9 7.5v8.5a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
    explore:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm3.7 5.3-2.1 5.3-5.3 2.1 2.1-5.3z',
    setup:'M4 7.2 12 3l8 4.2v9.6L12 21l-8-4.2zm8-1.9-5.2 2.7L12 10.7 17.2 8zm-6 4.4v5.9l5 2.6v-5.9zm12 0-5 2.6v5.9l5-2.6z',
    plan:'M6 2v3m12-3v3M4 8h16M5 4h14a1 1 0 0 1 1 1v15H4V5a1 1 0 0 1 1-1z',
    me:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 9a7 7 0 0 1 14 0'
  }[name];
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+d+'"/></svg>';
};

export function initKonaShell({ profile, settings, enter, openUserStudio, featureStyle=async()=>{}, entryDataReady=null }) {
  const facts = () => ({
    event: window.__ENTRY_EVENT || window.__ENTRY_DATA?.event || {},
  });
  const shell=document.createElement('div'); shell.id='konaShell';
  shell.innerHTML=
    '<button type="button" class="kona-user-menu" data-user-studio aria-label="Open User Studio" title="User Studio"><i></i><span>Studio</span></button>'+
    '<div id="konaPanel" class="kona-panel" hidden>'+
      '<div class="kona-panel-head"><div><small id="konaPanelEyebrow">KONA · BETA</small><h2 id="konaPanelTitle">Now</h2></div><button id="konaPanelClose" type="button" aria-label="Close">×</button></div>'+
      '<div id="konaPanelBody" class="kona-panel-body"></div>'+
    '</div>'+
    '<nav class="kona-bottom-nav" aria-label="Main navigation">'+
      '<button type="button" data-tab="home">'+icon('now')+'<span>Home</span></button>'+
      '<button type="button" data-tab="discover">'+icon('explore')+'<span>Discover</span></button>'+
      '<button type="button" data-tab="garage">'+icon('setup')+'<span>Garage</span></button>'+
      '<button type="button" data-tab="plan">'+icon('plan')+'<span>Plan</span></button>'+
      '<button type="button" data-tab="me">'+icon('me')+'<span>Me</span></button>'+
    '</nav>';
  document.body.append(shell);

  let body=shell.querySelector('#konaPanelBody');
  const panel=shell.querySelector('#konaPanel'), title=shell.querySelector('#konaPanelTitle'), eyebrow=shell.querySelector('#konaPanelEyebrow');
  const accessContext={admin:false};
  globalThis.__konaAccess=accessContext;
  const accessReady=currentUser().then(user=>{accessContext.admin=isAdminUser(user);return accessContext;}).catch(()=>accessContext);
  let routeToken=0;
  const returnJourney=initReturnJourney({openProgress:async()=>{
    await raceSelf();
    body.querySelector('[data-race-self-action="progress"]')?.click();
  }});
  const surpriseLayer=initSurpriseLayer({
    admin:()=>accessContext.admin,
    openProgress:async()=>{await raceSelf();body.querySelector('[data-race-self-action="progress"]')?.click();}
  });
  const scheduleSurprise=surface=>{
    const token=++routeToken;
    setTimeout(()=>{if(token===routeToken&&!panel.hidden)surpriseLayer.maybeShow(surface);},2200);
  };
  const setActive=id=>shell.querySelectorAll('[data-tab]').forEach(x=>(x.classList.toggle('on',x.dataset.tab===id),x.setAttribute('aria-current',x.dataset.tab===id?'page':'false')));
  let tourNode=null,tourTarget=null;
  const dismissTour=()=>{
    tourTarget?.classList.remove('tour-target');tourTarget=null;
    tourNode?.remove();tourNode=null;
  };
  const tourSteps=[
    {target:'[data-home-self]',kicker:'01 · MAKE IT YOURS',title:'Start with your athlete',copy:'Your Race Self is the anchor. Change the character, trisuit and attitude whenever you want.'},
    {target:'[data-home-discover]',kicker:'02 · GET CURIOUS',title:'Kona rewards wandering',copy:'Discover surfaces places, stories and small race-week details without making you enter the 3D world first.'},
    {target:'[data-home-garage]',kicker:'03 · BUILD THE MACHINE',title:'Your setup lives here',copy:'The Garage remembers what is yours. Bike Studio is where you inspect, paint and choose in 3D.'},
    {target:'[data-tab="me"]',kicker:'04 · YOUR UNIVERSE',title:'Me opens User Studio',copy:'Avatar, bike, races, collection, progress and settings live here. The wider world stays in the main navigation.'}
  ];
  function startTour({force=false}={}){
    if(tourNode)return;
    if(!force){try{if(readStorage('onboarding')==='seen')return;}catch(_){}}
    try{writeStorage('onboarding','seen')}catch(_){}
    const card=document.createElement('aside');card.className='kona-tour';card.setAttribute('role','dialog');card.setAttribute('aria-label','KONA quick tour');
    document.body.append(card);tourNode=card;let index=0;
    const paint=()=>{
      tourTarget?.classList.remove('tour-target');
      const step=tourSteps[index];tourTarget=document.querySelector(step.target);
      if(!tourTarget&&index<tourSteps.length-1){index+=1;paint();return;}
      tourTarget?.classList.add('tour-target');tourTarget?.scrollIntoView?.({block:'center',behavior:'smooth'});
      card.innerHTML='<small>'+step.kicker+'</small><h3>'+step.title+'</h3><p>'+step.copy+'</p><div class="kona-tour-actions"><button type="button" class="btn-text" data-tour-skip>Skip</button><button type="button" class="btn-primary" data-tour-next>'+(index===tourSteps.length-1?'Go explore':'Next')+' <span>→</span></button></div>';
      card.querySelector('[data-tour-skip]').onclick=dismissTour;
      card.querySelector('[data-tour-next]').onclick=()=>{if(index===tourSteps.length-1)dismissTour();else{index+=1;paint();}};
    };
    paint();
  }
  const replayTour=async()=>{await now();requestAnimationFrame(()=>requestAnimationFrame(()=>startTour({force:true})));};
  let disposeStudio=null, studioRequest=0;
  const leaveRaceSelf=()=>{panel.classList.remove('companion-panel');studioRequest++;disposeStudio?.();disposeStudio=null;document.body.classList.remove('race-self-open');
    surpriseLayer.close();routeToken++;
    const next=body.cloneNode(false);body.replaceWith(next);body=next;
    panel.scrollTop=0;
  };
  const close=()=>{routeToken++;surpriseLayer.close();leaveRaceSelf();panel.hidden=true;document.body.classList.remove('kona-panel-open');setActive(document.body.classList.contains('walking')?'explore':'');};
  shell.querySelector('#konaPanelClose').onclick=()=>panel.classList.contains('companion-panel')?raceSelf():close();

  async function now(){
    await accessReady;
    dismissTour();leaveRaceSelf();const request=studioRequest;panel.hidden=true;
    await featureStyle('home','web/styles/home.css');
    if(request!==studioRequest)return;
    title.textContent='Home'; eyebrow.textContent='KONA · TODAY';
    panel.hidden=false;document.body.classList.add('kona-panel-open');setActive('home');
    disposeStudio=renderHomeSurface(body,{
      event:facts().event,
      profile,
      openRaceSelf:raceSelf,
      openGarage:garage,
      openDiscover:explore,
      openPlan:plan,
      openCollection:collection,
      admin:accessContext.admin,
    });
    requestAnimationFrame(()=>requestAnimationFrame(()=>{if(request===studioRequest)startTour();}));
    scheduleSurprise('home');
    setTimeout(()=>{
      if(!panel.hidden&&title.textContent==='Home'&&!document.querySelector('.kona-tour'))returnJourney.maybeShow();
    },1200);
  }

  async function raceSelf(){
    dismissTour();leaveRaceSelf();const request=studioRequest;panel.hidden=true;
    await featureStyle('race-self','web/styles/race-self.css');
    if(request!==studioRequest)return;
    title.textContent='User Studio'; eyebrow.textContent='KONA · YOUR ATHLETE';
    panel.hidden=false;document.body.classList.add('kona-panel-open','race-self-open');setActive('me');
    const admin=isAdminUser(await currentUser().catch(()=>null));
    if(request!==studioRequest)return;
    const cleanup=await renderAvatarHome(body,{
      profile,
      settings,
      onBack:now,
      openGarage:garage,
      openCollection:collection,
      openTour:replayTour,
      isCurrent:()=>request===studioRequest,
      openMuseum:()=>{ close(); enter?.(); },
      isAdmin:admin,
      openAssets:adminAssets,
      openFeed:feed,
      openTravel:travel,
    });
    if(request===studioRequest) disposeStudio=cleanup; else cleanup?.();
    scheduleSurprise('studio');
  }

  async function companion(view){
    dismissTour();leaveRaceSelf();const request=studioRequest;panel.hidden=true;
    await featureStyle('companion','web/styles/companion.css');
    if(request!==studioRequest)return;
    title.textContent=view==='feed'?'The Feed':'Travel to Kona';eyebrow.textContent='KONA · EXPLORE MORE';
    panel.hidden=false;panel.classList.add('companion-panel');panel.scrollTop=0;
    document.body.classList.add('kona-panel-open');setActive('discover');
    disposeStudio=(view==='feed'?renderFeed:renderTravel)(body,{back:raceSelf});
  }
  const feed=()=>companion('feed'),travel=()=>companion('travel');

  async function collection(){
    dismissTour();leaveRaceSelf();const request=studioRequest;panel.hidden=true;
    await featureStyle('',null);
    if(request!==studioRequest)return;
    title.textContent='Collection'; eyebrow.textContent='KONA · CARDS & ITEMS';
    panel.hidden=false;document.body.classList.add('kona-panel-open');setActive('');
    disposeStudio=await renderCollectionSurface(body,{admin:accessContext.admin,onBack:raceSelf});
  }

  async function garage(){
    await accessReady;
    dismissTour();leaveRaceSelf();const request=studioRequest;panel.hidden=true;
    await featureStyle('garage','web/styles/garage.css');
    if(request!==studioRequest)return;
    title.textContent='Garage'; eyebrow.textContent='KONA · YOUR EQUIPMENT';
    panel.hidden=false;document.body.classList.add('kona-panel-open');setActive('garage');
    await renderGarageSurface(body,{admin:accessContext.admin});
    scheduleSurprise('garage');
  }

  async function plan(){
    dismissTour();leaveRaceSelf();const request=studioRequest;panel.hidden=true;
    await featureStyle('',null);
    if(request!==studioRequest)return;
    title.textContent='Plan'; eyebrow.textContent='KONA · SOURCE-GROUNDED';
    const readyData = entryDataReady ? await entryDataReady.catch(()=>null) : null;
    if(request!==studioRequest)return;
    disposeStudio=renderPlanSurface(body,{data:readyData || window.__ENTRY_DATA || { event:facts().event }});
    panel.hidden=false;document.body.classList.add('kona-panel-open');setActive('plan');
  }

  async function me(){
    await raceSelf();
  }

  async function adminAssets(){
    dismissTour();leaveRaceSelf();const request=studioRequest;panel.hidden=true;
    await featureStyle('admin','web/styles/admin-assets.css');
    if(request!==studioRequest)return;
    title.textContent='Asset Portfolio';eyebrow.textContent='KONA · ADMIN';
    panel.hidden=false;document.body.classList.add('kona-panel-open');setActive('me');
    await renderAdminAssets(body);
  }

  function walkTo(id){
    close();
    const go=window.__museumGo;
    if(go){ go(id); return; }
    enter?.(id);
  }
  async function explore(){
    dismissTour();leaveRaceSelf();const request=studioRequest;panel.hidden=true;
    await featureStyle('',null);
    if(request!==studioRequest)return;
    title.textContent='Discover'; eyebrow.textContent='KONA · INTERESTING THINGS';
    panel.hidden=false;document.body.classList.add('kona-panel-open');setActive('discover');
    await renderDiscoverSurface(body,{enter:()=>{close();enter?.();}});
    scheduleSurprise('discover');
  }

  shell.querySelector('[data-tab=home]').onclick=now;
  shell.querySelector('[data-tab=discover]').onclick=explore;
  shell.querySelector('[data-tab=garage]').onclick=garage;
  shell.querySelector('[data-tab=plan]').onclick=plan;
  shell.querySelector('[data-tab=me]').onclick=me;
  const routeToUserStudio=()=>typeof openUserStudio==='function'?openUserStudio():me();
  shell.querySelector('[data-user-studio]').onclick=routeToUserStudio;
  addEventListener('keydown',e=>{if(e.key==='Escape'&&!e.defaultPrevented&&!panel.hidden&&document.body.classList.contains('museum-open'))close();});

  const userMenu=shell.querySelector('[data-user-studio]');
  const syncUserMenu=p=>{
    applyBrandMode(p?.appearance||'auto');
    if(userMenu){
      userMenu.style.setProperty('--user-accent',p?.avatar||'#e8471c');
      userMenu.querySelector('span').textContent='Studio';
    }
  };
  syncUserMenu(profile?.get?.()); profile?.subscribe?.(syncUserMenu);
  return { now, raceSelf, garage, plan, me, explore, collection, feed, travel, adminAssets, tour:replayTour, close, accessReady };
}
