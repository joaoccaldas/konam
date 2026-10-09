import { openInviteDialog } from './invite.js';
// ui/home.js: calm daily/personal Home. No Three.js or world runtime.
// Home is the shell's navigation surface. Race Self is entered explicitly.
import { photoCredit } from './photo-credit.js';
import { mountCountdown } from './countdown.js';
import { readGameState } from '../engine/game-state.js';
import { collectionSummary,findCollection } from '../engine/items.js';
import { loadCompanion,internEditions,formatDate,sourceState } from './companion-data.js';
import { avatarItem, normaliseAvatarStyle } from '../engine/avatar.js';
import { ensureProgression, applyStoredEvent, readProgression, LEVELS } from '../engine/progression.js';
import { discoveryHorizon } from '../engine/discovery.js';
import { PRODUCT_NAME } from '../product-meta.js';

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

export function renderHomeSurface(root,{event={},profile,openRaceSelf,openGarage,openDiscover,openPlan,openCollection,openWorld,openFeed,openTravel,onStateChange,admin=false}={}){
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
  const shoreline=findCollection(snapshot).filter(i=>i.model),shoreCount=shoreline.filter(i=>i.collected).length;
  const nextLevel=LEVELS.find(row=>row.xp>Number(progression.xp||0));
  const meaningfulDiscovery=(progression.discoveries||[]).some(id=>!/^bike:/.test(id));
  const showWorldDepth=admin||meaningfulDiscovery;
  const showHorizon=admin||Number(progression.level||1)>=3;
  const showInvite=admin||meaningfulDiscovery;
  const horizon=showHorizon?discoveryHorizon(progression,4,{admin}):[];
  const nudges=['A bike in the archive is judging your tyre pressure.','Imagine an easy spin. Now imagine agreeing on what easy means.','Today’s detour: learn one thing you did not come here for.','An empty display shelf is a perfectly respectable beginning.'];
  const dayKey=new Date().toISOString().slice(0,10),nudge=nudges[Math.abs([...dayKey].reduce((a,c)=>a+c.charCodeAt(0),0))%nudges.length];
  const nudgesEnabled=!!profile?.get?.().notifications?.enabled;
  const horizonHtml=horizon.map(item=>'<article class="home-horizon-card '+(item.unlocked?'is-revealed':'is-locked')+'"><div class="home-horizon-silhouette"><span>'+esc(item.silhouette)+'</span></div><small>'+(item.unlocked?'MILESTONE REACHED':'LEVEL '+item.level)+'</small><h4>'+esc(item.unlocked?item.reveal:item.tease)+'</h4><p>Reward preview. Availability is shown in Progress.</p></article>').join('');

  root.innerHTML=
    '<section class="kona-hero-card artifact artifact--hero home-today">'+
      '<small>YOUR RACE WEEK · TODAY</small>'+
      '<h3 data-countdown-value>'+esc(headline)+'</h3>'+
      '<p class="home-purpose"><strong>Your race-week cockpit.</strong> '+esc(note)+' Live Kona, your athlete and your setup stay one tap away.</p>'+
      '<button class="kona-primary" type="button" data-home-plan>Open today\'s plan <span>→</span></button>'+
    '</section>'+
    '<section class="kona-section artifact artifact--label home-kona-now">'+
      '<div class="kona-section-head"><div><small>KONA NOW · RACE WEEK</small><h3>What is happening?</h3></div><span class="t-data">LIVE + LOCAL</span></div>'+
      '<div class="kona-list">'+
        '<article><i>READ</i><div><b data-home-feed-title>The Intern’s reading room.</b><span data-home-feed-note>A dated digest of triathlon, athlete videos and island news.</span></div><button type="button" class="btn-text" data-home-feed>Read the brief →</button></article>'+
        '<article><i>KOA</i><div><b>Just landed?</b><span>Flights, roads, race-week essentials, bike help, coffee and useful island stops.</span></div><button type="button" class="btn-text" data-home-travel>Plan Kona →</button></article>'+

      '</div><p class="kona-source-note">Freshness and source status are shown inside the Feed. Local listings are independent, not endorsements.</p>'+
    '</section>'+
    '<section class="artifact artifact--spec home-next"><div><small>YOUR NEXT CHAPTER</small><h3>'+(firstFound?'The shoreline set.':'Your first Find.')+'</h3><p>'+(firstFound?shoreCount+' / '+shoreline.length+' shoreline objects kept. Find the flower, shell and race bib as you explore.':'There’s a small volcanic rock below. Tap it to begin a collection of Kona stories.')+'</p><span class="t-data">LEVEL '+progression.level+' · '+Number(progression.xp||0)+' XP'+(nextLevel?' · '+Math.max(0,nextLevel.xp-Number(progression.xp||0))+' XP TO LEVEL '+nextLevel.level:' · TOP LEVEL')+'</span></div><button type="button" class="btn-secondary" data-home-finds>See your collection →</button></section>'+
    '<section class="home-race-self artifact artifact--label">'+
      '<div class="home-race-self-visual">'+avatarPreview(style)+'</div>'+
      '<div class="home-race-self-copy"><small>YOUR RACE SELF</small><h3>'+esc(goal)+'</h3>'+
        '<p>'+collection.total+' collected · '+races+' race'+(races===1?'':'s')+'</p>'+
        '<div class="home-race-self-actions"><button type="button" class="kona-primary" data-home-self>Open User Studio <span>→</span></button><button type="button" class="kona-link-btn" data-home-garage>Open Garage</button></div>'+
      '</div>'+
    '</section>'+
    '<section class="kona-section artifact artifact--label home-first-find"><small>'+(firstFound?'YOUR FIRST FIND · KEPT':'YOUR FIRST DETOUR')+'</small><h3>'+(firstFound?'Built by fire. Found by you.':'Something small is hiding here.')+'</h3><p>'+(firstFound?'The volcanic rock is saved. Open your shelf to read its story or keep exploring for the rest of the set.':'Spot the volcanic rock. Tap it. '+PRODUCT_NAME+' Finds will keep the story.')+'</p><div class="ui-cluster"><span class="t-hand" aria-hidden="true">'+(firstFound?'One small story, kept.':'That suspicious little rock →')+'</span><button type="button" class="btn-icon" data-first-find aria-label="Collect Perfect Volcanic Rock"'+(firstFound?' disabled':'')+'><svg viewBox="0 0 100 70" aria-hidden="true"><path d="M12 52 24 25 47 12 72 18 89 45 70 60 36 64Z" fill="currentColor"/></svg></button></div><p class="kona-source-note" role="status" data-first-find-status>'+(firstFound?'Perfect Volcanic Rock is saved in '+PRODUCT_NAME+' Finds.':'Your first Find is waiting.')+'</p><button type="button" class="btn-text" data-home-finds>Open '+PRODUCT_NAME+' Finds →</button></section>'+
    (showWorldDepth?'<section class="home-world-hero artifact artifact--photo"><div class="home-world-hero-media"><img src="assets/share/museum.jpg" alt="Kona.m 3D world preview" loading="lazy" decoding="async"></div><div class="home-world-hero-copy"><small>KONA.M · 3D WORLD</small><h3>Then go deeper.</h3><p>The museum, rooms, bikes and hidden details are still here. Enter when you want the world underneath the useful stuff.</p><button type="button" class="kona-primary" data-home-world>Enter the 3D world <span>→</span></button></div></section>':'')+
    (showWorldDepth?'<section class="home-postcard artifact artifact--photo">'+
      '<div class="home-postcard-photo" aria-hidden="true"><img src="assets/kona-years/queen-k.jpg" alt="" loading="lazy" decoding="async"></div>'+
      '<div class="home-postcard-copy"><small>KAILUA-KONA · HAWAIʻI</small><h3>Not just a race.</h3><p>Roads, lava, people, machines and strange little details worth finding.</p><button type="button" class="kona-link-btn" data-home-discover>Discover something →</button></div>'+
    '</section>'+photoCredit():'')+
    (showInvite?'<section class="home-invite kona-section artifact artifact--label"><small>KONA.M · BRING YOUR PEOPLE</small><h3>A good detour deserves company.</h3><p>Invite a friend to build their athlete and explore Kona. No account needed.</p><button type="button" class="kona-primary" data-invite-friends>Invite friends ↗</button></section>':'')+
    (nudgesEnabled?'<section class="home-nudge artifact artifact--label"><div><small>'+PRODUCT_NAME+' NUDGE · +5 XP</small><h3>'+esc(nudge)+'</h3><p>No urgency. No streak panic. Just a small reason to look around.</p></div><button type="button" class="kona-link-btn" data-home-nudge>Read it. Apparently this counts.</button></section>':'')+
    (showHorizon?'<section class="home-horizon artifact artifact--label"><div class="home-horizon-head"><div><small>OVER THE HORIZON</small><h3>There is always something else.</h3></div><span class="t-data">'+(admin?'ADMIN · ALL LEVELS':'LVL '+esc(progression.level))+'</span></div><div class="home-horizon-grid">'+horizonHtml+'</div><p class="t-hand">Curiosity is a training plan too.</p></section>':'');

  root.querySelector('[data-home-world]')?.addEventListener('click',()=>openWorld?.());
  root.querySelector('[data-invite-friends]')?.addEventListener('click',openInviteDialog);
  const disposeCount=mountCountdown(root.querySelector('.home-today'),event);
  const controller=new AbortController();
  loadCompanion('feed',{signal:controller.signal}).then(data=>{
    if(controller.signal.aborted)return;const edition=internEditions(data,{limit:1})[0];if(!edition)return;
    const title=root.querySelector('[data-home-feed-title]'),note=root.querySelector('[data-home-feed-note]');
    if(title)title.textContent='The Intern · '+formatDate(edition.date);
    if(note)note.textContent=(data.sources.some(s=>sourceState(s)!=='ok')?'Saved edition · ':'')+edition.story_count+' stories · '+(edition.picks[0]?.title||'A few threads worth following.');
  }).catch(()=>{});
  root.querySelectorAll('[data-home-finds]').forEach(button=>button.addEventListener('click',()=>openCollection?.()));
  root.querySelector('[data-first-find]')?.addEventListener('click',e=>{
    const button=e.currentTarget,status=root.querySelector('[data-first-find-status]');
    try{
      const before=ensureProgression();
      const after=applyStoredEvent({type:'FIND_DISCOVERED',id:'first-find:lava',subject:'find:shore:lava'});
      if(!readProgression()?.discoveries.includes('find:shore:lava'))throw new Error('save-failed');
      button.disabled=true;status.textContent='Perfect Volcanic Rock saved in '+PRODUCT_NAME+' Finds. +'+(after.xp-before.xp)+' XP · +'+(after.credits-before.credits)+' KC';
      const count=shoreline.filter(i=>after.discoveries.includes(i.id)).length,next=LEVELS.find(row=>row.xp>after.xp);
      root.querySelector('.home-next h3').textContent='The shoreline set.';
      root.querySelector('.home-next p').textContent=count+' / '+shoreline.length+' shoreline objects kept. Find the flower, shell and race bib as you explore.';
      root.querySelector('.home-next .t-data').textContent='LEVEL '+after.level+' · '+after.xp+' XP'+(next?' · '+(next.xp-after.xp)+' XP TO LEVEL '+next.level:' · TOP LEVEL');
      root.querySelector('.home-race-self-copy p').textContent=collectionSummary(readGameState()).total+' collected · '+races+' race'+(races===1?'':'s');
      onStateChange?.();
    }catch{status.textContent='Could not save your Find. Tap the rock to try again.';}
  });
  root.querySelector('[data-home-self]')?.addEventListener('click',()=>openRaceSelf?.());
  root.querySelector('[data-home-garage]')?.addEventListener('click',()=>openGarage?.());
  root.querySelector('[data-home-discover]')?.addEventListener('click',()=>openDiscover?.());
  root.querySelectorAll('[data-home-plan]').forEach(button=>button.addEventListener('click',()=>openPlan?.()));
  root.querySelector('[data-home-feed]')?.addEventListener('click',()=>openFeed?.());
  root.querySelector('[data-home-travel]')?.addEventListener('click',()=>openTravel?.());
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
  return ()=>{controller.abort();disposeCount?.();};
}
