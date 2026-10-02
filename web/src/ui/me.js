// ui/me.js — RaceIdentity + Progress projection.
// Personal truth comes from canonical game state; this surface owns no persistence.
import { readGameState, gameProgress } from '../engine/game-state.js';
import { ensureProgression, LEVELS, COLLECTIONS, COLLECTIBLES } from '../engine/progression.js';
import { levelContent, rankingMetric } from '../engine/access.js';
import { getPublicProduct } from '../engine/catalog.js';
import { sendMagicLink, currentUser, signOut, backupGameState, restoreGameState, cloudAvailable } from '../cloud/supabase-lite.js';
import { renderRaceBadges } from './race-cards.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const legacyId = id => String(id || '').replace(/^product:/,'');
const titleCase = s => String(s || '').replace(/[-_]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase());

async function equipmentProduct(snapshot, equipmentId) {
  const row = (snapshot?.user_equipment || []).find(x => x.id === equipmentId);
  if (!row?.product_id) return null;
  return await getPublicProduct(legacyId(row.product_id)) || { id:legacyId(row.product_id), label:legacyId(row.product_id) };
}

async function raceIdentityMarkup(snapshot) {
  const identity = snapshot?.race_identity;
  if (!identity?.event_id) {
    return '<section class="kona-hero-card artifact artifact--hero"><small>YOUR KONA</small><h3>Your next chapter starts here.</h3><p>Explore the museum to collect discoveries, earn badges and build your Progress. Your progress stays with you on this device.</p></section>';
  }
  const [bike, shoe] = await Promise.all([equipmentProduct(snapshot, identity.setup?.bike), equipmentProduct(snapshot, identity.setup?.shoe)]);
  const gear = [
    bike ? [bike.brand,bike.name||bike.label||bike.model].filter(Boolean).join(' ') : '',
    shoe ? [shoe.brand,shoe.name||shoe.label||shoe.model].filter(Boolean).join(' ') : ''
  ].filter(Boolean).join(' · ');
  const goal = identity.goal?.label || 'No goal set';
  const intent = identity.intent ? titleCase(identity.intent) : titleCase(identity.mode || 'Kona');
  return '<section class="kona-hero-card artifact artifact--hero kona-raceidentity-card">'+
    '<small>YOUR KONA · 2026</small>'+
    '<h3>'+esc(goal)+'</h3>'+
    '<p>'+esc(intent)+(gear?' · '+esc(gear):'')+'</p>'+
    '<span class="kona-source-note">Your race profile stays on this device unless you choose to back it up or share it.</span>'+
  '</section>';
}

export async function renderProgressSurface(root,{settings,admin=false}={}) {
  try { ensureProgression(); } catch (_) { /* Progress remains readable without repair */ }
  const snapshot = readGameState();
  const p = gameProgress(snapshot);
  const current=LEVELS.find(x=>x.level===p.level)||LEVELS[0];
  const next=LEVELS.find(x=>x.level===Math.min(10,p.level+1));
  const from=current.xp,to=next?.xp??current.xp,span=Math.max(1,to-from),pct=next?Math.max(0,Math.min(100,Math.round(((p.xp-from)/span)*100))):100;
  const engine=snapshot.progression_engine||ensureProgression();
  const access=levelContent(engine,{admin});
  const rank=rankingMetric(engine);
  const found=new Set(engine.discoveries||[]);
  const collections=COLLECTIONS.map(collection=>{
    const relics=COLLECTIBLES.filter(x=>x.collection===collection.id);
    const count=relics.filter(x=>found.has(x.id)).length;
    return {...collection,count,complete:count>=collection.required};
  });
  const completedCollections=collections.filter(x=>x.complete).length;
  const ladder=LEVELS.map(row=>{
    const open=admin||row.level<=p.level;
    const rewards=(row.rewards||[]).map(x=>esc(x.label||x.id)).join(' · ');
    return '<article class="progress-level '+(open?'is-open':'is-locked')+'"><div><small>LEVEL '+row.level+'</small><b>'+esc(row.name)+'</b><span>'+esc(row.summary||row.unlock||'')+'</span>'+(rewards?'<span class="progress-level-rewards">'+rewards+'</span>':'')+'</div><em>'+(admin?'VISIBLE':row.level<p.level?'UNLOCKED':row.level===p.level?'YOU ARE HERE':'LEVEL '+row.level)+'</em></article>';
  }).join('');
  root.innerHTML = await raceIdentityMarkup(snapshot)+
    '<section class="kona-section artifact artifact--label"><div class="kona-section-head"><h3>Progress</h3><small>'+(admin?'ADMIN VIEW · ALL CURRENT CONTENT':esc(p.levelName||'Visitor'))+'</small></div>'+
      '<div class="progress-metrics">'+
        '<article><small>LEVEL</small><b>'+p.level+'</b><span>'+esc(p.levelName||'Visitor')+'</span></article>'+
        '<article><small>XP</small><b>'+p.xp+'</b><span>'+(next?Math.max(0,next.xp-p.xp)+' to next level':'max current level')+'</span></article>'+
        '<article><small>KONA CREDITS</small><b>'+p.credits+'</b><span>game currency · not cash</span></article>'+
        '<article><small>RANK</small><b>'+esc(rank.status==='ranked'?'#'+rank.rank:rank.label)+'</b><span>'+(rank.status==='ranked'?'of '+rank.population:'starts with '+rank.minimumPopulation+' verified athletes')+'</span></article>'+
      '</div>'+
      '<div class="kona-list"><article><i>◇</i><div><b>'+p.stamps+' discoveries</b><span>'+p.hidden+' hidden finds · '+p.badges+' badges</span></div></article>'+
      '<article><i>▦</i><div><b>'+completedCollections+' / '+collections.length+' collections</b><span>Complete sets for bigger rewards.</span></div></article>'+
      '<article><i>↗</i><div><b>'+p.streak+' day streak</b><span>Useful context, not a guilt machine.</span></div></article>'+
      '</div><div class="progress-next"><div><small>'+(next?'NEXT · LEVEL '+next.level:'MAX LEVEL')+'</small><b>'+(next?esc(next.summary||next.unlock):'You found the top of this particular mountain.')+'</b></div><span>'+pct+'%</span></div><div class="progress-next-bar"><i style="width:'+pct+'%"></i></div></section>'+
    '<section class="kona-section artifact artifact--label"><div class="kona-section-head"><h3>Level road</h3><small>1 → 10</small></div><div class="progress-levels">'+ladder+'</div></section>'+
    '<section class="kona-section artifact artifact--label"><div class="kona-section-head"><h3>Relic collections</h3><small>'+completedCollections+' COMPLETE</small></div><div class="progress-collections">'+collections.map(x=>'<article class="'+(x.complete?'is-complete':'')+'"><small>'+esc(x.name)+'</small><b>'+x.count+' / '+x.required+'</b><span>'+(x.complete?'Complete · '+x.reward.xp+' XP · '+x.reward.credits+' KC':'Reward: '+x.reward.xp+' XP · '+x.reward.credits+' KC')+'</span></article>').join('')+'</div></section>'+
    '<section class="kona-section artifact artifact--label"><div class="kona-section-head"><h3>Your collection</h3><small>Every discovery counts</small></div><div class="kona-place-grid">'+
      '<article><small>Bikes</small><b>'+p.bikes+'</b><span>visited</span></article>'+
      '<article><small>Kona years</small><b>'+p.konaYears+'</b><span>discovered</span></article>'+
      '<article><small>Parts</small><b>'+p.parts+'</b><span>inspected</span></article>'+
      '<article><small>Garage</small><b>'+p.garage+'</b><span>saved items</span></article>'+
    '</div></section>'+
    '<section class="kona-section artifact artifact--label"><div class="kona-section-head"><h3>Race badges</h3><small>Past & future</small></div><div data-profile-races></div></section>'+
    '<section class="kona-section artifact artifact--label" id="konaAccount"><div class="kona-section-head"><h3>Sync across devices</h3><small>Optional · beta</small></div><p class="kona-source-note" data-status>Checking account…</p></section>'+
    '<section class="kona-section artifact artifact--label"><button class="kona-primary" type="button" data-settings>Profile, privacy & settings <span>→</span></button></section>';

  await renderRaceBadges(root.querySelector('[data-profile-races]'),{limit:20,empty:true});
  root.querySelector('[data-settings]')?.addEventListener('click',()=>settings?.open?.());
  const account=root.querySelector('#konaAccount'), status=account?.querySelector('[data-status]');
  if(!account||!cloudAvailable()){ if(status) status.textContent='Cloud sync unavailable. Local progress still works normally.'; return; }

  const user=await currentUser().catch(()=>null);
  if(!user){
    account.insertAdjacentHTML('beforeend','<form data-login><label class="kona-source-note" for="passportEmail">Email for a one-time sign-in link</label><input id="passportEmail" name="email" type="email" autocomplete="email" required placeholder="you@example.com" class="ui-input passport-email"><button class="kona-primary" type="submit">Send sign-in link</button></form>');
    status.textContent='Play without an account, or sign in only for cross-device backup.';
    account.querySelector('[data-login]')?.addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget;const btn=form.querySelector('button');btn.disabled=true;try{await sendMagicLink(new FormData(form).get('email'));status.textContent='Check your email and open the sign-in link on this device.';form.hidden=true;}catch(err){status.textContent=err.message||'Could not send sign-in link.';btn.disabled=false;}});
    return;
  }

  status.textContent='Signed in as '+(user.email||'beta user')+'. Backup and restore are explicit.';
  account.insertAdjacentHTML('beforeend','<div class="kona-list"><article><i>↑</i><div><b>Back up this device</b><span>Save progress, collection, setup and Garage.</span></div><button type="button" data-backup>Back up</button></article><article><i>↓</i><div><b>Restore from cloud</b><span>Replace this device with your latest backup.</span></div><button type="button" data-restore>Restore</button></article><article><i>↪</i><div><b>Sign out</b><span>Local progress stays on this device.</span></div><button type="button" data-signout>Sign out</button></article></div>');
  account.querySelector('[data-backup]')?.addEventListener('click',async e=>{const button=e.currentTarget;button.disabled=true;try{await backupGameState();status.textContent='Cloud backup saved.';}catch(err){status.textContent=err.message;}finally{button.disabled=false;}});
  account.querySelector('[data-restore]')?.addEventListener('click',async e=>{const button=e.currentTarget;button.disabled=true;try{await restoreGameState();status.textContent='Cloud state restored. Reloading…';location.reload();}catch(err){status.textContent=err.message;button.disabled=false;}});
  account.querySelector('[data-signout]')?.addEventListener('click',async()=>{await signOut();await renderMeSurface(root,{settings});});
}

export async function renderPassportSurface(root,{settings,admin=false}={}) { return renderProgressSurface(root,{settings,admin}); }
export async function renderMeSurface(root,{settings,admin=false}={}) { return renderProgressSurface(root,{settings,admin}); }
