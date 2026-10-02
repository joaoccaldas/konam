// ui/home.js: calm daily/personal Home. No Three.js or world runtime.
// Home is the shell's navigation surface. Race Self is entered explicitly.
import { mountCountdown } from './countdown.js';
import { readGameState } from '../engine/game-state.js';
import { collectionSummary } from '../engine/items.js';
import { avatarItem, normaliseAvatarStyle } from '../engine/avatar.js';
import { ensureProgression, applyStoredEvent, readProgression } from '../engine/progression.js';
import { discoveryHorizon } from '../engine/discovery.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const daysUntil=iso=>{const n=Math.ceil((new Date(iso+'T12:00:00')-Date.now())/86400000);return Number.isFinite(n)?Math.max(0,n):null};

function avatarPreview(styleInput){
  const s=normaliseAvatarStyle(styleInput);
  const skin=avatarItem(s,'skin').color,hair=avatarItem(s,'hair').color,tri=avatarItem(s,'trisuit'),shoes=avatarItem(s,'shoes').color;
  const top=tri.layout==='separates'?avatarItem(s,'top').color:tri.color,bottoms=tri.layout==='separates'?avatarItem(s,'bottoms').color:tri.color;
  return '<div class="home-avatar" style="--skin:'+skin+';--hair:'+hair+';--top:'+top+';--bottoms:'+bottoms+';--shoes:'+shoes+';--kit-accent:'+tri.accentColor+'">'+
    '<i class="ha-hair"></i><i class="ha-head"></i><i class="ha-body"></i><i class="ha-arm l"></i><i class="ha-arm r"></i><i class="ha-leg l"></i><i class="ha-leg r"></i><i class="ha-shoe l"></i><i class="ha-shoe r"></i>'+
  '</div>';
}

export function renderHomeSurface(root,{event={},profile,openRaceSelf,openGarage,openDiscover,openPlan,openCollection,admin=false}={}){
  const snapshot=readGameState();
  const identity=snapshot.race_identity||{};
  const collection=collectionSummary(snapshot);
  const raceDays=event.date?daysUntil(event.date):null;
  const headline=raceDays==null?'Today.':raceDays===0?'Race day.':raceDays===1?'1 day.':raceDays+' days.';
  const note=raceDays==null?'Something worth doing today.':raceDays>30?'Plenty of time. One useful choice is enough.':'Something worth doing today.';
  const style=profile?.get?.().avatarStyle;
  const goal=identity.goal?.label||identity.goal||'Build the version of you that shows up.';
  const races=Array.isArray(snapshot.race_history)?snapshot.race_history.length:0;
  let progression={level:1,level_name:'Visitor'};try{progression=ensureProgression();}catch(_){ }
  const firstFound=(progression.discoveries||[]).includes('find:shore:lava');
  const horizon=discoveryHorizon(progression,4,{admin});
  const nudges=['A bike in the archive is judging your tyre pressure.','Imagine an easy spin. Now imagine agreeing on what easy means.','Today’s detour: learn one thing you did not come here for.','An empty display shelf is a perfectly respectable beginning.'];
  const dayKey=new Date().toISOString().slice(0,10),nudge=nudges[Math.abs([...dayKey].reduce((a,c)=>a+c.charCodeAt(0),0))%nudges.length];
  const nudgesEnabled=!!profile?.get?.().notifications?.enabled;
  const horizonHtml=horizon.map(item=>'<article class="home-horizon-card '+(item.unlocked?'is-revealed':'is-locked')+'"><div class="home-horizon-silhouette"><span>'+esc(item.silhouette)+'</span></div><small>'+(item.unlocked?'MILESTONE REACHED':'LEVEL '+item.level)+'</small><h4>'+esc(item.unlocked?item.reveal:item.tease)+'</h4><p>Reward preview. Availability is shown in Progress.</p></article>').join('');

  root.innerHTML=
    '<section class="kona-hero-card artifact artifact--hero home-today">'+
      '<small>'+esc(event.name||'KONA · TODAY')+'</small>'+
      '<h3 data-countdown-value>'+esc(headline)+'</h3><p>'+esc(note)+'</p>'+
      '<button class="kona-primary" type="button" data-home-plan>What matters next <span>→</span></button>'+
    '</section>'+
    '<section class="home-race-self artifact artifact--label">'+
      '<div class="home-race-self-visual">'+avatarPreview(style)+'</div>'+
      '<div class="home-race-self-copy"><small>YOUR RACE SELF</small><h3>'+esc(goal)+'</h3>'+
        '<p>'+collection.total+' collected · '+races+' race'+(races===1?'':'s')+'</p>'+
        '<div class="home-race-self-actions"><button type="button" class="kona-primary" data-home-self>Open User Studio <span>→</span></button><button type="button" class="kona-link-btn" data-home-garage>Open Garage</button></div>'+
      '</div>'+
    '</section>'+
    '<section class="kona-section artifact artifact--label home-first-find"><small>YOUR FIRST DETOUR</small><h3>Something small is hiding here.</h3><p>Spot the volcanic rock. Tap it. KONA Finds will keep the story.</p><div class="ui-cluster"><span class="t-hand" aria-hidden="true">That suspicious little rock →</span><button type="button" class="btn-icon" data-first-find aria-label="Collect Perfect Volcanic Rock"'+(firstFound?' disabled':'')+'><svg viewBox="0 0 100 70" aria-hidden="true"><path d="M12 52 24 25 47 12 72 18 89 45 70 60 36 64Z" fill="currentColor"/></svg></button></div><p class="kona-source-note" role="status" data-first-find-status>'+(firstFound?'Perfect Volcanic Rock is saved in KONA Finds.':'Your first Find is waiting.')+'</p><button type="button" class="btn-text" data-home-finds>Open KONA Finds →</button></section>'+
    '<section class="home-postcard artifact artifact--photo">'+
      '<div class="home-postcard-photo" aria-hidden="true"><img src="assets/kona-years/queen-k.jpg" alt="" loading="lazy" decoding="async"></div>'+
      '<div class="home-postcard-copy"><small>KAILUA-KONA · HAWAIʻI</small><h3>Not just a race.</h3><p>Roads, lava, people, machines and strange little details worth finding.</p><button type="button" class="kona-link-btn" data-home-discover>Discover something →</button></div>'+
    '</section>'+
    (nudgesEnabled?'<section class="home-nudge artifact artifact--label"><div><small>KONA NUDGE · +5 XP</small><h3>'+esc(nudge)+'</h3><p>No urgency. No streak panic. Just a small reason to look around.</p></div><button type="button" class="kona-link-btn" data-home-nudge>Read it. Apparently this counts.</button></section>':'')+
    '<section class="home-horizon artifact artifact--label"><div class="home-horizon-head"><div><small>OVER THE HORIZON</small><h3>There is always something else.</h3></div><span class="t-data">'+(admin?'ADMIN · ALL LEVELS':'LVL '+esc(progression.level))+'</span></div><div class="home-horizon-grid">'+horizonHtml+'</div><p class="t-hand">Curiosity is a training plan too.</p></section>';

  const disposeCount=mountCountdown(root.querySelector('.home-today'),event);
  root.querySelector('[data-home-finds]')?.addEventListener('click',()=>openCollection?.());
  root.querySelector('[data-first-find]')?.addEventListener('click',e=>{
    const button=e.currentTarget,status=root.querySelector('[data-first-find-status]');
    try{
      const before=ensureProgression();
      const after=applyStoredEvent({type:'FIND_DISCOVERED',id:'first-find:lava',subject:'find:shore:lava'});
      if(!readProgression()?.discoveries.includes('find:shore:lava'))throw new Error('save-failed');
      button.disabled=true;status.textContent='Perfect Volcanic Rock saved in KONA Finds. +'+(after.xp-before.xp)+' XP · +'+(after.credits-before.credits)+' KC';
    }catch{status.textContent='Could not save your Find. Tap the rock to try again.';}
  });
  root.querySelector('[data-home-self]')?.addEventListener('click',()=>openRaceSelf?.());
  root.querySelector('[data-home-garage]')?.addEventListener('click',()=>openGarage?.());
  root.querySelector('[data-home-discover]')?.addEventListener('click',()=>openDiscover?.());
  root.querySelector('[data-home-plan]')?.addEventListener('click',()=>openPlan?.());
  root.querySelector('[data-home-nudge]')?.addEventListener('click',e=>{
    const button=e.currentTarget,id='nudge:'+dayKey;
    try {
      const already=ensureProgression().seen.includes(id);
      applyStoredEvent({type:'NUDGE_OPENED',id,subject:dayKey});
      if(!readProgression()?.seen.includes(id)) throw new Error('save-failed');
      button.textContent=already?'Already collected. Still weird.':'5 XP. Saved on this device.';
      button.disabled=true;
    } catch {
      button.textContent='Could not save the reward. Tap to try again.';
    }
  });
  return disposeCount;
}
