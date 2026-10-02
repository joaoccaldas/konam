// ui/return-journey.js — sparse, respectful surprises for returning visitors.
import { nextReturnMoment, readReturnJourney, recordReturnMoment, registerVisit } from '../engine/return-journey.js';

const installed=()=>matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches||navigator.standalone===true;
const native=()=>Boolean(window.Capacitor?.isNativePlatform?.());

function shell(){
  let root=document.getElementById('konaReturnMoment');
  if(root)return root;
  root=document.createElement('div');
  root.id='konaReturnMoment';
  root.className='kona-return-moment';
  root.hidden=true;
  root.setAttribute('role','dialog');
  root.setAttribute('aria-modal','true');
  root.setAttribute('aria-labelledby','konaReturnTitle');
  document.body.append(root);
  return root;
}

export function initReturnJourney({openProgress}={}){
  const {state:initial}=registerVisit();
  let state=initial;
  let active=null;
  let root=null;
  const close=()=>{if(!root)return;root.hidden=true;root.innerHTML='';document.body.classList.remove('return-moment-open');active=null;};
  const save=(moment,action)=>{state=recordReturnMoment(state,moment,action);};

  function actions(moment){
    const dismiss=()=>{
      if(moment==='install-teaser'||moment==='install-reminder')save(moment,'dismiss-install');
      else save(moment,'dismiss');
      close();
    };
    root.querySelectorAll('[data-return-close]').forEach(button=>button.addEventListener('click',dismiss));
    root.onclick=e=>{if(e.target===root)dismiss();};
    root.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();dismiss();}};
  }
  function showRewards(){
    const moment='rewards';active=moment;save(moment,'shown');
    root=shell();root.innerHTML='<section class="return-card reward-card"><button type="button" class="return-x" data-return-close aria-label="Close">×</button><small>SURPRISE · YOUR CURIOSITY HAS A BALANCE SHEET</small><h3 id="konaReturnTitle">Apparently, wandering pays.</h3><p>KONA quietly rewards the things that make the world more interesting.</p><div class="return-reward-grid"><article><b>XP</b><span>Earn it by answering, exploring and discovering.</span></article><article><b>Levels</b><span>Unlock new Garage, avatar and world possibilities.</span></article><article><b>Kona Credits</b><span>In-app game currency. Not cash. Sadly.</span></article></div><p class="return-foot">Track the whole ridiculous economy in <b>User Studio → Progress</b>.</p><div class="return-actions"><button type="button" class="btn-secondary" data-return-close>Got it</button><button type="button" class="btn-primary" data-open-progress>Show my Progress →</button></div></section>';
    root.querySelector('[data-open-progress]')?.addEventListener('click',()=>{close();openProgress?.();});
    actions(moment);root.hidden=false;document.body.classList.add('return-moment-open');root.querySelector('[data-open-progress]')?.focus();
  }
  function showInstallTeaser(){
    const moment='install-teaser';active=moment;save(moment,'shown');root=shell();
    root.innerHTML='<section class="return-card install-teaser"><button type="button" class="return-x" data-return-close aria-label="Close">×</button><small>UNEXPECTED QUESTION</small><h3 id="konaReturnTitle">Want to see something cool?</h3><p>KONA can stop behaving like a browser tab.</p><div class="return-actions"><button type="button" class="btn-secondary" data-return-close>Not today</button><button type="button" class="btn-primary" data-show-install>Obviously →</button></div></section>';
    root.querySelector('[data-show-install]')?.addEventListener('click',()=>{
      root.querySelector('section').innerHTML='<button type="button" class="return-x" data-return-close aria-label="Close">×</button><small>THE TRICK</small><h3 id="konaReturnTitle">Put KONA on your home screen.</h3><p>It opens like an app, keeps the lightweight shell available offline, and the heavy 3D world still waits until you ask for it.</p><div class="return-actions"><button type="button" class="btn-secondary" data-return-close>Maybe later</button><button type="button" class="btn-primary" data-install-app>Install KONA</button></div>';
      root.querySelector('[data-install-app]')?.addEventListener('click',()=>{save(moment,'engage-install');queueMicrotask(close);});
      actions(moment);
    });
    actions(moment);root.hidden=false;document.body.classList.add('return-moment-open');root.querySelector('[data-show-install]')?.focus();
  }
  function showInstallReminder(){
    const moment='install-reminder';active=moment;save(moment,'shown');root=shell();
    root.innerHTML='<section class="return-card"><button type="button" class="return-x" data-return-close aria-label="Close">×</button><small>HELLO AGAIN · TINY RECURRING QUESTION</small><h3 id="konaReturnTitle">Still living in a browser tab?</h3><p>Bold choice. Want the one-tap home-screen version now?</p><div class="return-actions"><button type="button" class="btn-secondary" data-return-close>Still no</button><button type="button" class="btn-primary" data-install-app>Fine. Install it.</button></div></section>';
    root.querySelector('[data-install-app]')?.addEventListener('click',()=>{save(moment,'engage-install');queueMicrotask(close);});
    actions(moment);root.hidden=false;document.body.classList.add('return-moment-open');root.querySelector('[data-install-app]')?.focus();
  }
  function showAnnoyanceCheck(){
    const moment='annoyance-check';active=moment;save(moment,'shown');root=shell();
    root.innerHTML='<section class="return-card annoyance-card"><button type="button" class="return-x" data-return-close aria-label="Close">×</button><small>IMPORTANT USER RESEARCH</small><h3 id="konaReturnTitle">Is this install question getting annoying?</h3><p>Be honest. We can take it.</p><div class="return-actions return-actions-stack"><button type="button" class="btn-secondary" data-stop-install>Yes. Please stop asking.</button><button type="button" class="btn-secondary" data-return-close>Not annoying. Just stubborn.</button><button type="button" class="btn-primary" data-install-app>No. Show me the button.</button></div></section>';
    root.querySelector('[data-stop-install]')?.addEventListener('click',()=>{save(moment,'opt-out-install');close();});
    root.querySelector('[data-install-app]')?.addEventListener('click',()=>{save(moment,'engage-install');queueMicrotask(close);});
    actions(moment);root.hidden=false;document.body.classList.add('return-moment-open');root.querySelector('[data-stop-install]')?.focus();
  }
  const painters={rewards:showRewards,'install-teaser':showInstallTeaser,'install-reminder':showInstallReminder,'annoyance-check':showAnnoyanceCheck};
  const maybeShow=()=>{
    if(active)return;
    state=readReturnJourney();
    const moment=nextReturnMoment(state,{standalone:installed(),native:native()});
    if(moment&&painters[moment])painters[moment]();
  };
  return {maybeShow,close,state:()=>state};
}
