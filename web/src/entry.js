// Kona.m entry. HTML is already on screen. This file does not import Three.js.
// The museum runtime loads only after the visitor chooses to explore.
import { createProfile, QUALITY, AVATARS } from './engine/profile.js';
import { initSettings } from './ui/settings.js';
import { consumeAuthCallback } from './cloud/supabase-lite.js';
import { initKonaShell } from './ui/kona-shell.js';
import { initAppShell } from './app-shell.js';
import { readStorage } from './engine/storage.js';
import { decodeShare, questLabels } from './quest.js';
import { renderAvatarRegistration } from './ui/avatar-registration.js';
import { renderOnboardingQuestions } from './ui/onboarding-questions.js';
import { renderOnboardingBike } from './ui/onboarding-bike.js';
import { PRODUCT_NAME } from './product-meta.js';

const intro = document.getElementById('intro');
const callbackParams = new URLSearchParams(location.hash.replace(/^#/, ''));
const recovering = callbackParams.get('type') === 'recovery';
let authReturned = false;
let authError = callbackParams.get('error_description') || '';
try { authReturned = consumeAuthCallback(); } catch (error) { authError = error.message; }
if (callbackParams.has('error') || callbackParams.has('access_token')) history.replaceState(null, '', location.pathname + location.search);
const setEntryMode = mode => {
  intro?.classList.toggle('quest-active', mode === 'quest');
  intro?.classList.toggle('app-ready', mode === 'app');
  document.body.classList.remove('entry-landing','entry-quest','entry-app');
  document.body.classList.add('entry-' + mode);
  document.body.dataset.entryMode = mode;
  // Keep the shared shortcut in document flow while the entry is visible.
  const why = document.querySelector('.kona-why-global');
  const whyHost = document.getElementById(mode === 'app' ? 'konaShell' : 'entryWhy');
  if (why && whyHost && why.parentElement !== whyHost) whyHost.prepend(why);
};
const profile = createProfile();
window.__konaProfile = profile;
const settingsUI = initSettings({
  profile, QUALITY, AVATARS,
  activeQuality:()=>profile.get().quality,
  onQuality:id=>window.__konaWorldSettings?.onQuality?.(id) ?? true,
  onSound:on=>window.__konaWorldSettings?.onSound?.(on),
  onMotion:value=>window.__konaWorldSettings?.onMotion?.(value) ?? false,
  sync:{available:true,start:async()=>{settingsUI.close();await enterApp('me');document.querySelector('[data-race-self-action=progress]')?.click();}},
});
window.__konaSettingsUI = settingsUI;

const loads = new Map();
const managedStyles = new Map();
let activeFeatureStyle = '';
function syncManagedStyles(){
  const museumActive=document.body.classList.contains('museum-open')&&!document.body.classList.contains('kona-panel-open');
  for(const [group,links] of managedStyles){
    const enabled=group==='museum' ? museumActive : group.startsWith('feature:') ? group===activeFeatureStyle : true;
    for(const link of links)link.disabled=!enabled;
  }
}
async function featureStyle(name,href){
  activeFeatureStyle=name?'feature:'+name:'';
  syncManagedStyles();
  if(href)await loadStyle(href,activeFeatureStyle);
  syncManagedStyles();
}
new MutationObserver(syncManagedStyles).observe(document.body,{attributes:true,attributeFilter:['class']});
function loadStyle(href,group='app') {
  const key='css:'+href;
  if (loads.has(key)) return loads.get(key);
  const pending = new Promise((resolve,reject)=>{
    const link=document.createElement('link');
    link.rel='stylesheet'; link.href=href; link.dataset.styleScope=group;
    if(!managedStyles.has(group))managedStyles.set(group,new Set());
    managedStyles.get(group).add(link);
    link.onload=()=>{syncManagedStyles();resolve(link);}; link.onerror=()=>{globalThis.__konaAnalytics?.trackRuntimeError?.('route_load',{subsystem:'navigation'});loads.delete(key);managedStyles.get(group)?.delete(link);link.remove();reject(new Error(href));};
    document.head.append(link);syncManagedStyles();
  });
  loads.set(key,pending);
  return pending;
}
function loadScript(src) {
  if (loads.has(src)) return loads.get(src);
  const pending = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => { globalThis.__konaAnalytics?.trackRuntimeError?.('route_load',{subsystem:'navigation'}); loads.delete(src); s.remove(); reject(new Error(src)); };
    document.body.append(s);
  });
  loads.set(src, pending);
  return pending;
}

const entryDataReady = fetch('app/entry-data.json',{cache:'no-store',credentials:'same-origin'})
  .then(r=>r.ok?r.json():Promise.reject(new Error('entry data')))
  .catch(()=>({event:{date:'2026-10-10'}}));
let worldShellReady = null;
const ensureWorldShell = () => {
  if (document.getElementById('hall')) return Promise.resolve();
  if (worldShellReady) return worldShellReady;
  worldShellReady = Promise.all([
    loadStyle('web/styles/hall-web.css','museum'),
    loadStyle('web/styles/hall-mobile.css','museum'),
  ]).then(()=>fetch('app/world-shell.html',{cache:'no-store',credentials:'same-origin'}))
    .then(r=>r.ok?r.text():Promise.reject(new Error('world shell unavailable')))
    .then(html=>{
      const t=document.createElement('template'); t.innerHTML=html.trim();
      const anchor=document.getElementById('appSheet');
      document.body.insertBefore(t.content,anchor||document.body.firstChild);
    }).catch(error=>{globalThis.__konaAnalytics?.trackRuntimeError?.('route_load',{subsystem:'navigation'});worldShellReady=null;throw error;});
  return worldShellReady;
};
let museumDataReady = null;
const ensureMuseumData = () => museumDataReady || (museumDataReady = loadScript('app/museum-data.js').catch(error=>{museumDataReady=null;throw error;}));

let opening = null;
function openMuseum(room) {
  const intent=window.__konaShell?.navigationVersion?.();
  const enterLoaded=()=>{
    if(intent!==window.__konaShell?.navigationVersion?.())return;
    window.__museum.enter({gallery:!room&&!new URLSearchParams(location.search).get('room')});
    setEntryMode('app');
    window.__konaShell?.close?.();
  };
  document.body.classList.add('museum-open');
  if (!opening) {
    const buttons=[...document.querySelectorAll('#entryWorld,[data-home-world]')];
    const labels=buttons.map(button=>button.innerHTML);
    for(const button of buttons){button.disabled=true;button.textContent='Opening the museum…';}
    for(const status of document.querySelectorAll('[data-museum-status]'))status.textContent='Opening the museum. Your visit starts in the gallery.';
    opening = Promise.resolve(window.__konaShell?.accessReady)
      .then(() => ensureWorldShell())
      .then(() => ensureMuseumData())
      .then(() => loadScript('app/hall.js'))
      .then(() => {
        if(typeof window.__museum?.enter!=='function')throw new Error('museum unavailable');
        enterLoaded();
        for(const status of document.querySelectorAll('[data-museum-status]'))status.textContent='';
        return true;
      })
      .catch(err => {
        opening = null;
        document.body.classList.remove('museum-open');
        for(const status of document.querySelectorAll('[data-museum-status]'))status.textContent='The museum could not open. Check your connection and try again.';
        console.warn('museum', err);
        return false;
      })
      .finally(()=>buttons.forEach((button,index)=>{button.disabled=false;button.innerHTML=labels[index];}));
  } else {
    opening.then(entered=>{if(entered)enterLoaded();});
  }
  if (typeof room === 'string') {
    opening.then(entered => {if(entered)setTimeout(() => {if(intent===window.__konaShell?.navigationVersion?.())window.__museumGo?.(room);}, 600);});
  }
  return opening;
}

initAppShell();
const shell = initKonaShell({ profile, settings: settingsUI, enter: openMuseum, entryDataReady, openUserStudio:()=>enterApp('me'), featureStyle });
window.__konaShell = shell;

function enterApp(first = 'home') {
  setEntryMode('app');
  intro?.setAttribute('hidden','');
  if (first === 'garage') return shell.garage?.();
  else if (first === 'collection') return shell.collection?.();
  else if (first === 'discover') return shell.explore?.();
  else if (first === 'feed') return shell.feed?.();
  else if (first === 'travel') return shell.travel?.();
  else if (first === 'plan') return shell.plan?.();
  else if (first === 'me') return shell.me?.();
  else return shell.now?.();
}

function questHost() {
  const inner = document.querySelector('#intro .intro-inner');
  if (!inner) return null;
  let host = document.getElementById('konaQuest');
  if (!host) {
    host = document.createElement('div');
    host.id = 'konaQuest';
    inner.append(host);
  }
  return host;
}

function paintQuest(step) {
  setEntryMode('quest');
  const host = questHost();
  if (!host) return;
  host.hidden = false;
  if(step==='questions'){
    renderOnboardingQuestions(host,{onDone:()=>paintQuest('bike'),onSkip:()=>paintQuest('avatar')});
    return;
  }
  if(step==='bike'){
    renderOnboardingBike(host,{onContinue:()=>paintQuest('avatar'),onSkip:()=>paintQuest('avatar')})
      .catch(()=>paintQuest('avatar'));
    return;
  }
  if(step==='avatar'){
    renderAvatarRegistration(host,{
      profile,
      onBack:()=>{setEntryMode('landing');host.hidden=true;document.getElementById('buildSelf')?.focus();},
      onContinue:()=>enterApp('home')
    });
    return;
  }
  if(step==='save'){
    showAccount();
  }
}

async function showAccount(mode='login',error='',newsletterToken='',newsletterReturn=false) {
  setEntryMode('quest');
  const host=questHost();if(!host)return;
  host.hidden=false;intro?.removeAttribute('hidden');
  host.textContent='Opening your account…';
  let renderAccountAuth,renderNewsletterUnsubscribe,renderNewsletterSignup;
  try { ({renderAccountAuth,renderNewsletterUnsubscribe,renderNewsletterSignup}=await import(new URL('app/account-auth.js',document.baseURI).href)); }
  catch (_) {
    host.innerHTML='<p class="kona-note" role="alert">The account form could not load. Check your connection and try again.</p><button class="btn-primary" type="button">Continue without account</button>';
    host.querySelector('button').addEventListener('click',()=>enterApp('home'));return;
  }
  if(mode==='unsubscribe'){
    renderNewsletterUnsubscribe(host,newsletterToken,{onBack:()=>{setEntryMode('landing');host.hidden=true;}});
    window.scrollTo(0,0);return;
  }
  if(mode==='newsletter'){
    await renderNewsletterSignup(host,{onBack:()=>{setEntryMode('landing');host.hidden=true;},onAuth:mode=>showAccount(mode,'','',true)});
    window.scrollTo(0,0);return;
  }
  renderAccountAuth(host,{
    mode,error,
    onSuccess:()=>newsletterReturn?showAccount('newsletter'):enterApp(existingRaceIdentity()?'home':'me'),
    onContinue:()=>enterApp('home'),
    onBack:()=>{if(newsletterReturn)return showAccount('newsletter');setEntryMode('landing');host.hidden=true;document.getElementById('entrySignIn')?.focus();}
  });
  window.scrollTo(0,0);

}

function existingRaceIdentity() {
  try {
    const raw = readStorage('raceIdentity');
    const value = raw ? JSON.parse(raw) : null;
    return value?.entity_type === 'race-identity' && value?.event_id ? value : null;
  } catch (_) { return null; }
}
function firstRunStep() {
  try { return readStorage('onboardingCards') === 'seen' ? 'avatar' : 'questions'; }
  catch (_) { return 'questions'; }
}

document.getElementById('entrySignIn')?.addEventListener('click', () => paintQuest('save'));
document.getElementById('entryWorld')?.addEventListener('click', () => openMuseum());

setEntryMode('landing');
const existingIdentity = existingRaceIdentity();
let onboardingSeen=false;try{onboardingSeen=readStorage('onboarding')==='seen';}catch(_){}
const returningVisit=Boolean(existingIdentity||onboardingSeen);
const buildButton = document.getElementById('buildSelf');
if (returningVisit) {
  if (buildButton) {
    buildButton.textContent = 'Continue your Kona';
    buildButton.setAttribute('aria-description','Your Kona stays private on this device unless you choose to save or share it.');
    buildButton.addEventListener('click', () => enterApp());
  }
} else {
  buildButton?.addEventListener('click', () => paintQuest(firstRunStep()));
}
entryDataReady.then(data=>{ window.__ENTRY_DATA=data||{}; window.__ENTRY_EVENT=data?.event||{}; }).catch(()=>{});

function paintShared(draft){
  const host=questHost(); if(!host) return;
  const labels=questLabels(draft);
  host.innerHTML=`<p class="eyebrow">A Kona setup</p><h2>${labels.bike}</h2><p>${labels.shoe}</p><p>${labels.goal}</p><p class="kona-note">Someone shared this setup with you. Build yours to make it your own.</p><button class="btn primary" id="buildShared" type="button">Build yours</button>`;
  host.querySelector('#buildShared')?.addEventListener('click',()=>paintQuest(firstRunStep()));
}
const q = new URLSearchParams(location.search);
const shared=decodeShare(q.get('kona'));
if(q.get('account')==='unsubscribe'){
  const token=q.get('token')||'';q.delete('token');
  history.replaceState(null,'',location.pathname+(q.toString()?'?'+q.toString():''));
  showAccount('unsubscribe','',token);
}
else if(shared) paintShared(shared);
else if (q.get('reviewRoom') === 'beast-cave') openMuseum('beast');
else if (q.get('room') || q.get('map')) openMuseum();
else if (recovering && authReturned) showAccount('reset');
else if (authError) showAccount('login', authError);
else if (['login','register','newsletter'].includes(q.get('account'))) showAccount(q.get('account'));
else if (authReturned && existingRaceIdentity()) enterApp('home');
else if (authReturned) enterApp('me').then(()=>document.querySelector('[data-race-self-action=progress]')?.click());
else if (returningVisit && ['home','garage','collection','discover','plan','me','feed','travel'].includes(q.get('view'))) enterApp(q.get('view'));
