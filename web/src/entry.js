// KONA entry. HTML is already on screen. This file does not import Three.js.
// The museum runtime loads only after the visitor chooses to explore.
import { mountCountdown } from './ui/countdown.js';
import { renderEntryProductStage } from './ui/visual-primitives.js';
import { createProfile, QUALITY, AVATARS } from './engine/profile.js';
import { initSettings } from './ui/settings.js';
import { consumeAuthCallback } from './cloud/supabase-lite.js';
import { initKonaShell } from './ui/kona-shell.js';
import { initAppShell } from './app-shell.js';
import { readStorage } from './engine/storage.js';
import { decodeShare, questLabels } from './quest.js';
import { renderAvatarRegistration } from './ui/avatar-registration.js';
import { renderOnboardingQuestions } from './ui/onboarding-questions.js';

const intro = document.getElementById('intro');
const authReturned = consumeAuthCallback();
const setEntryMode = mode => {
  intro?.classList.toggle('quest-active', mode === 'quest');
  intro?.classList.toggle('app-ready', mode === 'app');
  document.body.classList.remove('entry-landing','entry-quest','entry-app');
  document.body.classList.add('entry-' + mode);
  document.body.dataset.entryMode = mode;
};
const profile = createProfile();
window.__konaProfile = profile;
const settingsUI = initSettings({
  profile, QUALITY, AVATARS,
  activeQuality:()=>profile.get().quality,
  onQuality:id=>window.__konaWorldSettings?.onQuality?.(id) ?? true,
  onSound:on=>window.__konaWorldSettings?.onSound?.(on),
  onMotion:()=>window.__konaWorldSettings?.onMotion?.() ?? true,
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
    link.onload=()=>{syncManagedStyles();resolve(link);}; link.onerror=()=>{loads.delete(key);managedStyles.get(group)?.delete(link);link.remove();reject(new Error(href));};
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
    s.onerror = () => { loads.delete(src); s.remove(); reject(new Error(src)); };
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
    }).catch(error=>{worldShellReady=null;throw error;});
  return worldShellReady;
};
let museumDataReady = null;
const ensureMuseumData = () => museumDataReady || (museumDataReady = loadScript('app/museum-data.js').catch(error=>{museumDataReady=null;throw error;}));

let disposeCount=null;
function paintCount(){disposeCount?.();const host=document.querySelector('.entry-race-clock');if(host)disposeCount=mountCountdown(host,window.__ENTRY_EVENT||{});}

let opening = null;
function openMuseum(room) {
  document.body.classList.add('museum-open');
  const btn = document.getElementById('enterBtn');
  if (btn && !window.__museum) btn.innerHTML = 'Opening the coast…';
  if (!opening) {
    opening = Promise.resolve(window.__konaShell?.accessReady)
      .then(() => ensureWorldShell())
      .then(() => ensureMuseumData())
      .then(() => loadScript('app/hall.js'))
      .then(() => window.__museum?.enter?.())
      .catch(err => { opening = null; console.warn('museum', err); });
  }
  if (typeof room === 'string') {
    opening.then(() => setTimeout(() => window.__museumGo?.(room), 600));
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
    renderOnboardingQuestions(host,{onDone:()=>paintQuest('avatar'),onSkip:()=>paintQuest('avatar')});
    return;
  }
  if(step==='avatar'){
    renderAvatarRegistration(host,{
      profile,
      onBack:()=>{setEntryMode('landing');host.hidden=true;document.getElementById('buildSelf')?.focus();},
      onContinue:()=>paintQuest('install')
    });
    return;
  }
  if(step==='install'){
    const landscape=matchMedia('(orientation: landscape)').matches;
    host.innerHTML='<section class="onboarding-handoff">'+
      '<div class="onboarding-handoff-copy"><p class="eyebrow">ONE TINY THING</p><h2>Make KONA feel less like a browser.</h2><p>Then turn your phone sideways when the world gets serious.</p></div>'+
      '<div class="onboarding-handoff-grid">'+
        '<article class="onboarding-tip install-tip"><span class="handoff-mark">↓</span><small>01 · INSTALL</small><h3>Put KONA on your phone.</h3><p>If our arrow points somewhere stupid: sorry. Browsers move things.</p><button type="button" class="btn-primary" data-install-app>Install KONA</button></article>'+
        '<article class="onboarding-tip rotate-tip '+(landscape?'is-landscape':'')+'"><div class="phone-rotate" aria-hidden="true"><i></i><b>↻</b></div><small>02 · ROTATE</small><h3>'+(landscape?'Perfect. Keep it sideways.':'Turn your phone sideways.')+'</h3><p>The 3D world is much better there. Sorry. We’re learning to build a real app.</p></article>'+
      '</div>'+
      '<div class="quest-nav"><button type="button" class="btn-primary" data-handoff-continue>Fine. Show me KONA →</button></div>'+
    '</section>';
    host.querySelector('[data-handoff-continue]')?.addEventListener('click',()=>enterApp('home'));
    return;
  }
  if(step==='save'){
    host.innerHTML = `<p class="eyebrow">Sign in or create your account</p><form id="saveForm"><input name="email" type="email" required placeholder="you@example.com" aria-label="Email address" autocomplete="email"><button class="btn-primary" type="submit">Send sign-in link</button></form><button class="btn-text" type="button" id="continueLocal">Continue without account</button><button class="btn-text" type="button" id="backFromSave">Back</button><p class="kona-note" role="status" id="saveNote">New here? Your first link creates your account. No password needed. You can also continue without an account.</p>`;
    host.querySelector('#continueLocal')?.addEventListener('click',()=>enterApp('home'));
    host.querySelector('#backFromSave')?.addEventListener('click',()=>{setEntryMode('landing');host.hidden=true;document.getElementById('entrySignIn')?.focus();});
    host.querySelector('#saveForm')?.addEventListener('submit', async event => {
      event.preventDefault();
      const email = new FormData(event.currentTarget).get('email');
      const note = host.querySelector('#saveNote'),button=event.currentTarget.querySelector('button[type=submit]');
      button.disabled=true;button.textContent='Sending…';
      try {
        const { sendMagicLink } = await import('./cloud/supabase-lite.js');
        await sendMagicLink(email);
        if(note)note.textContent='Check your email. Your Kona is already on this device.';
      } catch (err) {
        if(note)note.textContent=(err?.message||'The link could not be sent.')+' You can continue without an account.';
      } finally { button.disabled=false;button.textContent='Send sign-in link'; }
    });
  }
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

setEntryMode('landing');
const existingIdentity = existingRaceIdentity();
let onboardingSeen=false;try{onboardingSeen=readStorage('onboarding')==='seen';}catch(_){}
const returningVisit=Boolean(existingIdentity||onboardingSeen);
const buildButton = document.getElementById('buildSelf');
if (returningVisit) {
  const lede = document.querySelector('#intro .lede');
  const note = document.querySelector('#intro .kona-note');
  if (lede) lede.textContent = existingIdentity?.goal?.label
    ? `Your Kona is saved. Next: ${existingIdentity.goal.label}.`
    : 'Your athlete is saved. Pick up where you left off.';
  if (buildButton) {
    buildButton.textContent = 'Continue your Kona';
    buildButton.addEventListener('click', () => enterApp());
  }
  if (note) note.textContent = 'Your RaceIdentity stays private on this device unless you choose to save or share it.';
} else {
  buildButton?.addEventListener('click', () => paintQuest(firstRunStep()));
}
renderEntryProductStage(document.getElementById('entryProductStage'), {profile});
entryDataReady.then(data=>{ window.__ENTRY_DATA=data||{}; window.__ENTRY_EVENT=data?.event||{}; paintCount(); }).catch(()=>{});

function paintShared(draft){
  const host=questHost(); if(!host) return;
  const labels=questLabels(draft);
  host.innerHTML=`<p class="eyebrow">A Kona setup</p><h2>${labels.bike}</h2><p>${labels.shoe}</p><p>${labels.goal}</p><p class="kona-note">Someone shared this setup with you. Build yours to make it your own.</p><button class="btn primary" id="buildShared" type="button">Build yours</button>`;
  host.querySelector('#buildShared')?.addEventListener('click',()=>paintQuest(firstRunStep()));
}
const q = new URLSearchParams(location.search);
const shared=decodeShare(q.get('kona'));
if(shared) paintShared(shared);
else if (q.get('room') || q.get('map')) openMuseum();
else if (authReturned && existingRaceIdentity()) enterApp('home');
else if (authReturned) enterApp('me').then(()=>document.querySelector('[data-race-self-action=progress]')?.click());
else if (returningVisit && ['home','garage','collection','discover','plan','me','feed','travel'].includes(q.get('view'))) enterApp(q.get('view'));
