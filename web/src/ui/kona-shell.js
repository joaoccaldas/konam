// ui/kona-shell.js — mobile-first app shell over the existing 3D museum.
// Navigation/utility only. The 3D renderer remains the existing proven museum runtime.
import { PRODUCT_NAME } from '../product-meta.js';
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
import { readGameState } from '../engine/game-state.js';
import { navigationForState } from '../engine/navigation-policy.js';
import { readStorage, writeStorage, STATE_CHANGE_EVENT } from '../engine/storage.js';
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
    '<a class="kona-why-global" href="why.html" aria-label="Read Why Kona">Why Kona</a>'+ 
    '<button type="button" class="kona-user-menu" data-user-studio aria-label="Open User Studio" title="User Studio"><i></i><span>Me</span></button>'+
    '<div id="konaPanel" class="kona-panel" hidden>'+
      `<div class="kona-panel-head"><div><small id="konaPanelEyebrow">${PRODUCT_NAME} · BETA</small><h2 id="konaPanelTitle">Now</h2></div><div class="kona-panel-actions"><a class="kona-panel-why" href="why.html">Why Kona</a><button id="konaPanelClose" type="button" aria-label="Close">×</button></div></div>`+
      '<div id="konaPanelBody" class="kona-panel-body"></div>'+
    '</div>'+
    '<nav class="kona-desktop-nav" aria-label="Desktop navigation">'+
      '<button type="button" data-desktop-tab="home">Now</button>'+
      '<button type="button" data-desktop-tab="discover">Discover</button>'+
      '<button type="button" data-desktop-tab="garage">Garage</button>'+
      '<button type="button" data-desktop-tab="plan">Plan</button>'+
      '<button type="button" data-desktop-tab="me">Me</button>'+
    '</nav>'+
    '<nav class="kona-bottom-nav" aria-label="Main navigation">'+
      '<button type="button" data-tab="home">'+icon('now')+'<span>Now</span></button>'+
      '<button type="button" data-tab="discover">'+icon('explore')+'<span>Discover</span></button>'+
      '<button type="button" data-tab="garage">'+icon('setup')+'<span>Garage</span></button>'+
      '<button type="button" data-tab="plan">'+icon('plan')+'<span>Plan</span></button>'+
      '<button type="button" data-tab="me">'+icon('me')+'<span>Me</span></button>'+
    '</nav>';
  document.body.append(shell);

  let body=shell.querySelector('#konaPanelBody');
  const panel=shell.querySelector('#konaPanel'), title=shell.querySelector('#konaPanelTitle'), eyebrow=shell.querySelector('#konaPanelEyebrow');
  let companionReturn=null;
  const accessContext={admin:false};
  globalThis.__konaAccess=accessContext;
  const accessReady=currentUser().then(user=>{accessContext.admin=isAdminUser(user);return accessContext;}).catch(()=>accessContext);
  const syncNavigation=()=>{
    let visible=['home'];
    try{visible=navigationForState(readGameState(),{admin:accessContext.admin});}catch(_){}
    const shown=new Set(visible);
    shell.querySelectorAll('[data-tab]').forEach(button=>{button.hidden=!shown.has(button.dataset.tab);});
    shell.querySelectorAll('[data-desktop-tab]').forEach(button=>{button.hidden=false;});
    const nav=shell.querySelector('.kona-bottom-nav');
    if(nav){
      nav.style.setProperty('--nav-count',String(Math.max(1,visible.length)));
      nav.dataset.count=String(visible.length);
      nav.setAttribute('aria-hidden',visible.length<2?'true':'false');
    }
    const studio=shell.querySelector('[data-user-studio]');
    if(studio)studio.hidden=!shown.has('me')&&!accessContext.admin;
    return visible;
  };
  accessReady.then(syncNavigation);
  syncNavigation();
  let routeToken=0,currentView='';
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
  const setActive=id=>{
    shell.querySelectorAll('[data-tab]').forEach(x=>(x.classList.toggle('on',x.dataset.tab===id),x.setAttribute('aria-current',x.dataset.tab===id?'page':'false')));
    shell.querySelectorAll('[data-desktop-tab]').forEach(x=>(x.classList.toggle('on',x.dataset.desktopTab===id),x.setAttribute('aria-current',x.dataset.desktopTab===id?'page':'false')));
  };
  let tourNode=null,tourTarget=null,tourFrame=0;
  const positionTour=()=>{
    if(!tourNode||!tourTarget)return;
    const t=tourTarget.getBoundingClientRect(),c=tourNode.getBoundingClientRect(),v=window.visualViewport;
    const vw=v?.width||innerWidth,vh=v?.height||innerHeight,pad=16,gap=16;
    const panelHead=panel.hidden?null:panel.querySelector('.kona-panel-head')?.getBoundingClientRect();
    const safeTop=panelHead?Math.max(pad,panelHead.bottom+8):pad;
    const maxY=Math.max(safeTop,vh-c.height-pad);
    const candidates=[{x:t.left,y:t.top-c.height-gap},{x:t.left,y:t.bottom+gap},{x:t.right+gap,y:t.top},{x:t.left-c.width-gap,y:t.top}].map(p=>({x:Math.max(pad,Math.min(p.x,vw-c.width-pad)),y:Math.max(safeTop,Math.min(p.y,maxY))}));
    const overlap=p=>Math.max(0,Math.min(p.x+c.width,t.right+8)-Math.max(p.x,t.left-8))*Math.max(0,Math.min(p.y+c.height,t.bottom+8)-Math.max(p.y,t.top-8));
    const best=candidates.sort((a,b)=>overlap(a)-overlap(b))[0];
    Object.assign(tourNode.style,{left:best.x+'px',top:best.y+'px',bottom:'auto',transform:'none'});
  };
  const scheduleTourPosition=()=>{cancelAnimationFrame(tourFrame);tourFrame=requestAnimationFrame(positionTour);};
  addEventListener('resize',scheduleTourPosition);panel.addEventListener('scroll',scheduleTourPosition,{passive:true});window.visualViewport?.addEventListener('resize',scheduleTourPosition);
  const dismissTour=()=>{
    tourTarget?.classList.remove('tour-target');tourTarget=null;cancelAnimationFrame(tourFrame);
    tourNode?.remove();tourNode=null;
  };
  const tourSteps=[
    {target:'[data-home-self]',kicker:'01 · MAKE IT YOURS',title:'Start with your athlete',copy:'Your Race Self is the anchor. Character, races, equipment and progress grow from here.'},
    {target:'[data-home-feed]',kicker:'02 · KONA NOW',title:'Come back for what changed',copy:'The Feed keeps athlete videos, triathlon headlines and island updates close, with source and freshness visible.'},
    {target:'[data-first-find]',kicker:'03 · GET CURIOUS',title:'Kona rewards looking around',copy:'Finds turn small race-week details into things you can keep. Your first one is already hiding on Home.'},
    {target:'[data-tab="me"]',kicker:'04 · YOUR UNIVERSE',title:'Me opens User Studio',copy:'Avatar, bike, races, collection, progress and settings live here. Deeper destinations reveal as your Kona grows.'}
  ];
  function startTour({force=false}={}){
    if(tourNode)return;
    if(!force){try{if(readStorage('onboarding')==='seen')return;}catch(_){}}
    try{writeStorage('onboarding','seen')}catch(_){}
    const card=document.createElement('aside');card.className='kona-tour';card.setAttribute('role','dialog');card.setAttribute('aria-label',`${PRODUCT_NAME} quick tour`);card.addEventListener('keydown',e=>{if(e.key==='Escape'){dismissTour();e.stopPropagation();}});
    const visibleTarget=selector=>{
      const el=document.querySelector(selector);if(!el)return null;
      const rect=el.getBoundingClientRect(),style=getComputedStyle(el);
      return !el.hidden&&style.display!=='none'&&style.visibility!=='hidden'&&+style.opacity>.02&&rect.width>0&&rect.height>0?el:null;
    };
    const steps=tourSteps.map(step=>({...step,element:visibleTarget(step.target)})).filter(step=>step.element);
    if(!steps.length){card.remove();tourNode=null;return;}
    document.body.append(card);tourNode=card;let index=0;
    const paint=()=>{
      tourTarget?.classList.remove('tour-target');
      const step=steps[index];tourTarget=step.element;
      tourTarget.classList.add('tour-target');tourTarget.scrollIntoView?.({block:'center',behavior:'instant'});
      card.innerHTML='<small>'+step.kicker+'</small><h3>'+step.title+'</h3><p>'+step.copy+'</p><p class="tour-instruction">Tap the highlighted button, or try it below.</p><div class="kona-tour-actions"><button type="button" class="btn-text" data-tour-skip>Skip</button><button type="button" class="btn-text" data-tour-open>Try it ↗</button><button type="button" class="btn-primary" data-tour-next>'+(index===steps.length-1?'Go explore':'Next')+' <span>→</span></button></div>';
      card.querySelector('[data-tour-skip]').onclick=dismissTour;
      card.querySelector('[data-tour-open]').onclick=()=>tourTarget?.click();
      scheduleTourPosition();
      card.querySelector('[data-tour-next]').focus({preventScroll:true});
      card.querySelector('[data-tour-next]').onclick=()=>{if(index===steps.length-1)dismissTour();else{index+=1;paint();}};
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
  shell.querySelector('#konaPanelClose').onclick=()=>panel.classList.contains('companion-panel')?(companionReturn||raceSelf)():close();

  async function now(){
    currentView='home';
    await accessReady;
    dismissTour();leaveRaceSelf();const request=studioRequest;panel.hidden=true;
    await featureStyle('home','web/styles/home.css');
    if(request!==studioRequest)return;
    title.textContent='Now'; eyebrow.textContent=`${PRODUCT_NAME} · TODAY`;
    panel.hidden=false;document.body.classList.add('kona-panel-open');setActive('home');
    disposeStudio=renderHomeSurface(body,{
      event:facts().event,
      profile,
      openRaceSelf:raceSelf,
      openGarage:garage,
      openDiscover:explore,
      openPlan:plan,
      openCollection:collection,
      openFeed:()=>feed('home'),
      openTravel:()=>travel('home'),
      openWorld:()=>{close();enter?.();},
      onStateChange:syncNavigation,
      admin:accessContext.admin,
    });
    syncNavigation();
    scheduleSurprise('home');
    setTimeout(()=>{
      if(!panel.hidden&&title.textContent==='Now'&&!document.querySelector('.kona-tour'))returnJourney.maybeShow();
    },1200);
  }

  async function raceSelf(){
    currentView='me';
    dismissTour();leaveRaceSelf();const request=studioRequest;panel.hidden=true;
    await featureStyle('race-self','web/styles/race-self.css');
    if(request!==studioRequest)return;
    title.textContent='User Studio'; eyebrow.textContent=`${PRODUCT_NAME} · YOUR ATHLETE`;
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
      openFeed:()=>feed('studio'),
      openTravel:()=>travel('studio'),
    });
    if(request===studioRequest) disposeStudio=cleanup; else cleanup?.();
    syncNavigation();
    scheduleSurprise('studio');
  }

  async function companion(view,origin='studio'){
    currentView='companion';
    dismissTour();leaveRaceSelf();const request=studioRequest;panel.hidden=true;
    await featureStyle('companion','web/styles/companion.css');
    if(request!==studioRequest)return;
    title.textContent=view==='feed'?'The Feed':'Travel to Kona';eyebrow.textContent=`${PRODUCT_NAME} · EXPLORE MORE`;
    panel.hidden=false;panel.classList.add('companion-panel');panel.scrollTop=0;
    document.body.classList.add('kona-panel-open');setActive(view==='feed'?'home':'plan');
    const back=origin==='home'?now:raceSelf;
    const backLabel=origin==='home'?'Now':'User Studio';
    companionReturn=back;
    disposeStudio=(view==='feed'?renderFeed:renderTravel)(body,{back,backLabel});
  }
  const feed=(origin='studio')=>companion('feed',origin),travel=(origin='studio')=>companion('travel',origin);

  async function collection(){
    currentView='collection';
    dismissTour();leaveRaceSelf();const request=studioRequest;panel.hidden=true;
    await featureStyle('',null);
    if(request!==studioRequest)return;
    title.textContent='Finds'; eyebrow.textContent=`${PRODUCT_NAME} · STORY COLLECTIBLES`;
    panel.hidden=false;document.body.classList.add('kona-panel-open');setActive('');
    disposeStudio=await renderCollectionSurface(body,{admin:accessContext.admin,onBack:raceSelf});
  }

  async function garage(){
    currentView='garage';
    await accessReady;
    dismissTour();leaveRaceSelf();const request=studioRequest;panel.hidden=true;
    await featureStyle('garage','web/styles/garage.css');
    if(request!==studioRequest)return;
    title.textContent='Garage'; eyebrow.textContent=`${PRODUCT_NAME} · YOUR EQUIPMENT`;
    panel.hidden=false;document.body.classList.add('kona-panel-open');setActive('garage');
    await renderGarageSurface(body,{admin:accessContext.admin});
    syncNavigation();
    scheduleSurprise('garage');
  }

  async function plan(){
    currentView='plan';
    dismissTour();leaveRaceSelf();const request=studioRequest;panel.hidden=true;
    await featureStyle('plan','web/styles/plan.css');
    if(request!==studioRequest)return;
    title.textContent='Plan'; eyebrow.textContent=`${PRODUCT_NAME} · SOURCE-GROUNDED`;
    const readyData = entryDataReady ? await entryDataReady.catch(()=>null) : null;
    if(request!==studioRequest)return;
    disposeStudio=renderPlanSurface(body,{data:readyData || window.__ENTRY_DATA || { event:facts().event }});
    panel.hidden=false;document.body.classList.add('kona-panel-open');setActive('plan');syncNavigation();
  }

  async function me(){
    await raceSelf();
  }

  async function adminAssets(){
    currentView='assets';
    dismissTour();leaveRaceSelf();const request=studioRequest;panel.hidden=true;
    await featureStyle('admin','web/styles/admin-assets.css');
    if(request!==studioRequest)return;
    title.textContent='Asset Portfolio';eyebrow.textContent=`${PRODUCT_NAME} · ADMIN`;
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
    currentView='discover';
    dismissTour();leaveRaceSelf();const request=studioRequest;panel.hidden=true;
    await featureStyle('',null);
    if(request!==studioRequest)return;
    title.textContent='Discover'; eyebrow.textContent=`${PRODUCT_NAME} · INTERESTING THINGS`;
    panel.hidden=false;document.body.classList.add('kona-panel-open');setActive('discover');
    await renderDiscoverSurface(body,{enter:()=>{close();enter?.();}});
    syncNavigation();
    scheduleSurprise('discover');
  }

  shell.querySelector('[data-tab=home]').onclick=now;
  shell.querySelector('[data-tab=discover]').onclick=explore;
  shell.querySelector('[data-tab=garage]').onclick=garage;
  shell.querySelector('[data-tab=plan]').onclick=plan;
  shell.querySelector('[data-tab=me]').onclick=me;
  shell.querySelector('[data-desktop-tab=home]').onclick=now;
  shell.querySelector('[data-desktop-tab=discover]').onclick=explore;
  shell.querySelector('[data-desktop-tab=garage]').onclick=garage;
  shell.querySelector('[data-desktop-tab=plan]').onclick=plan;
  shell.querySelector('[data-desktop-tab=me]').onclick=me;
  const routeToUserStudio=()=>typeof openUserStudio==='function'?openUserStudio():me();
  shell.querySelector('[data-user-studio]').onclick=routeToUserStudio;
  addEventListener('keydown',e=>{if(e.key==='Escape'&&!e.defaultPrevented&&!panel.hidden&&document.body.classList.contains('museum-open'))close();});

  const userMenu=shell.querySelector('[data-user-studio]');
  const syncUserMenu=p=>{
    applyBrandMode(p?.appearance||'auto');
    if(userMenu){
      userMenu.style.setProperty('--user-accent',p?.avatar||'#e8471c');
      userMenu.querySelector('span').textContent='Me';
    }
  };
  syncUserMenu(profile?.get?.()); profile?.subscribe?.(syncUserMenu);
  globalThis.addEventListener?.(STATE_CHANGE_EVENT,syncNavigation);
  addEventListener('pageshow',event=>{
    if(!event.persisted)return;
    if(currentView==='me')raceSelf();
    else if(currentView==='collection')collection();
    else if(currentView==='garage')garage();
    else if(currentView==='plan')plan();
    else if(currentView==='discover')explore();
    else if(currentView==='home')now();
  });
  return { now, raceSelf, garage, plan, me, explore, collection, feed, travel, adminAssets, tour:replayTour, close, accessReady, syncNavigation };
}
