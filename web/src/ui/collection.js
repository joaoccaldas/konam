// KONA Finds: a projection over the existing registry and personal progression.
import { readGameState } from '../engine/game-state.js';
import { findCollection, findSummary, FIND_METHODS, itemCollection } from '../engine/items.js';
import { collectibleReward } from '../engine/progression.js';
import { findAccess } from '../engine/access.js';
import { getPublicProduct } from '../engine/catalog.js';
import previews from '../../../museum/entry-catalog.json' with {type:'json'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=n=>String(n).padStart(3,'0');
let stageReady=null;
function loadStage(){
  if(globalThis.__mountCollectibleStage)return Promise.resolve();
  return stageReady||(stageReady=new Promise((resolve,reject)=>{
    const s=document.createElement('script');s.src='app/collectible-stage.js';
    s.onload=resolve;s.onerror=()=>{s.remove();stageReady=null;reject(new Error('Preview unavailable'));};
    document.body.append(s);
  }));
}
const preview=item=>item.thumbnail?'<img class="find-thumbnail" src="'+esc(item.thumbnail)+'" alt="" loading="lazy" decoding="async" width="320" height="240">':'<span class="find-story-cover"><small>'+esc(item.category||'KONA')+'</small><strong>'+number(item.number)+'</strong><span>STORY CARD</span></span>';
export async function renderCollectionSurface(root,{admin=false,onBack,backLabel='User Studio',openWorld}={}){
  let filter=findSummary(readGameState()).collected?'collected':'hidden',limit=12,selected=null,disposed=false,stage=null,request=0,listScrollTop=0;
  const panel=root.closest('#konaPanel');
  const disposeStage=()=>{request++;stage?.dispose?.();stage=null;};
  const visible=item=>findAccess(item,{collected:item.collected,admin}).detailsVisible;
  const paint=()=>{
    disposeStage();selected=null;
    const snapshot=readGameState(),items=findCollection(snapshot),summary=findSummary(snapshot);
    const tabs=[['collected','Collected · '+summary.collected],['hidden','Hidden Finds'],['all','Full catalog']];
    const shore=items.filter(i=>i.model),shoreCount=shore.filter(i=>i.collected).length;
    const rows=items.filter(x=>filter==='collected'?x.collected:filter==='all'||x.acquisition===filter).sort((a,b)=>Number(b.collected)-Number(a.collected)||(b.acquired?.at||'').localeCompare(a.acquired?.at||'')||a.number-b.number);
    const nextCard='<section class="artifact artifact--spec finds-next"><div><small>SHORELINE SET · '+shoreCount+' / '+shore.length+'</small><h4>'+(shoreCount===shore.length?'A little piece of Kona, complete.':shoreCount?'Keep your shoreline story going.':'Start with something small.')+'</h4><p>'+(shoreCount===shore.length?'Revisit your Finds for their stories and real 3D objects.':'Look for the flower near the hall entrance, a shell on the pier, and a race bib in Champions. Tap an object to keep it.')+'</p></div>'+(openWorld?'<button type="button" class="btn-secondary" data-finds-explore>Explore in 3D →</button>':'')+'</section>';
    root.innerHTML=(onBack?'<button type="button" class="btn-text" data-finds-back>← '+esc(backLabel)+'</button>':'')+'<section class="kona-section artifact artifact--label finds-heading"><small>YOUR COLLECTION</small><h3>Your Kona shelf.</h3><p>'+summary.collected+' Finds kept · Shoreline set '+shoreCount+' / '+shore.length+'</p><progress aria-label="Shoreline Finds collected" value="'+shoreCount+'" max="'+shore.length+'"></progress>'+(admin?'<p class="t-data">ADMIN · ALL 100 VISIBLE · PERSONAL OWNERSHIP UNCHANGED</p>':'')+'</section>'+
      '<nav class="ui-cluster finds-filters" aria-label="Find acquisition method">'+tabs.map(([id,label])=>'<button type="button" class="btn-secondary" data-find-filter="'+id+'" aria-pressed="'+(id===filter)+'">'+esc(label)+'</button>').join('')+'</nav>'+
      '<div class="ui-grid finds-grid" aria-label="KONA Finds collection">'+rows.slice(0,limit).map(item=>{
        const reveal=visible(item);
        return '<button type="button" class="kona-item-card artifact artifact--spec find-card '+(item.collected?'is-collected':'is-locked')+'" data-find="'+esc(item.id)+'" aria-label="Find '+number(item.number)+' · '+esc(reveal?item.name:'Not found yet')+'"><small>'+number(item.number)+' / 100 <span>'+(item.collected?'✓ KEPT':'UNDISCOVERED')+'</span></small>'+(reveal?preview(item):'<span class="find-story-cover is-mystery" aria-hidden="true"><strong>?</strong></span>')+'<b>'+esc(reveal?item.name:'A story waiting')+'</b><span>'+esc(item.collected?item.rarity:admin?'Admin preview · '+item.rarity:'Not found yet')+'</span></button>';
      }).join('')+'</div>'+(!rows.length?'<p class="kona-source-note">Your shelf is ready. Find your first volcanic rock on Now, or explore the shoreline in 3D.</p>':'')+(rows.length>limit?'<button type="button" class="btn-secondary" data-finds-more>Show more · '+Math.min(limit,rows.length)+' of '+rows.length+'</button>':'')+nextCard+'<details class="finds-future"><summary>How collecting works</summary><p>Find an object and tap it. Its story is saved on this device, with XP and Kona Credits awarded once. Model previews appear after discovery; story cards use a printed cover.</p><p>Trade and Special Events are planned. Their catalog slots are not active offers or rewards.</p></details><section class="kona-section artifact artifact--label" data-other-collection><h3>Your bikes & stories</h3><div class="ui-grid" data-other-items></div></section>';
    root.querySelector('[data-finds-back]')?.addEventListener('click',()=>onBack?.());
    root.querySelector('[data-finds-explore]')?.addEventListener('click',()=>openWorld?.());
    root.querySelector('[data-finds-more]')?.addEventListener('click',()=>{limit+=12;const top=panel?.scrollTop;paint();if(panel)panel.scrollTop=top;});
    root.querySelectorAll('[data-find-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.findFilter;limit=12;paint();root.querySelector('[data-find-filter="'+filter+'"]')?.focus({preventScroll:true});});
    root.querySelectorAll('[data-find]').forEach(b=>b.onclick=()=>{listScrollTop=panel?.scrollTop||0;detail(items.find(x=>x.id===b.dataset.find));});
    const host=root.querySelector('[data-other-items]');
    for(const item of itemCollection(snapshot).filter(x=>x.kind!=='find')){
      const id=String(item.entity_id).replace(/^(?:product|bike):/,''),bike=previews.bikes.find(p=>p.id===id);
      const card=document.createElement('article');card.className='kona-item-card artifact artifact--label';card.innerHTML=(bike?'<img class="find-thumbnail" src="'+esc(bike.image)+'" alt="" loading="lazy" decoding="async">':'')+'<small>'+esc(item.kind)+'</small><b>'+esc(bike?[bike.brand,bike.label].filter(Boolean).join(' '):item.label)+'</b><span>'+esc(item.relationship)+'</span>';host.append(card);
      if(item.kind==='equipment')getPublicProduct(id).then(p=>{if(p&&card.isConnected)card.querySelector('b').textContent=[p.brand,p.name||p.label||p.model].filter(Boolean).join(' ');}).catch(()=>{});
    }
    if(!host.children.length)root.querySelector('[data-other-collection]').hidden=true;
  };
  const detail=item=>{
    if(!item)return;disposeStage();selected=item.id;const reveal=visible(item),pay=collectibleReward(item);
    root.innerHTML='<article class="find-studio"><button type="button" class="btn-text" data-find-return>← KONA Finds</button><header><small class="t-data">FIND '+number(item.number)+' / 100 · '+esc(reveal?item.rarity:'UNDISCOVERED')+'</small><h3>'+esc(reveal?item.name:'A story still waiting.')+'</h3><p>'+esc(reveal?item.tagline:'Keep wandering. This slot will remember what you find.')+'</p></header>'+
      (reveal&&item.model?'<section class="artifact artifact--spec find-preview"><div data-find-stage>'+preview(item)+'<button type="button" class="btn-primary" data-view-find>Explore in 3D</button></div><p class="kona-source-note" data-find-stage-status>Drag to rotate; pinch to zoom.</p></section>':'<div class="artifact artifact--label find-data-only">'+(reveal?preview(item):'<i class="find-mark">?</i>')+'<p>'+esc(reveal?'A story collectible.':'Not found yet.')+'</p></div>')+
      (reveal?'<section class="kona-section artifact artifact--label"><h3>Its story</h3><p>'+esc(item.lore)+'</p></section>':'')+
      '<dl class="find-facts artifact artifact--spec"><div><dt>Collection position</dt><dd>'+number(item.number)+' / 100</dd></div><div><dt>Acquisition</dt><dd>'+esc(FIND_METHODS[item.acquired?.method||item.acquisition]?.label||item.acquisition)+'</dd></div><div><dt>Status</dt><dd>'+esc(item.collected?'Collected on this device':admin?'Admin preview. Not owned.':'Not collected')+'</dd></div>'+(reveal?'<div><dt>Discovery reward</dt><dd>'+pay.xp+' XP · '+pay.credits+' KC</dd></div><div><dt>Place</dt><dd>'+esc(item.place)+'</dd></div>':'')+'</dl>'+
      '<p class="kona-source-note">'+esc(item.acquisition==='trade'?'Trading is planned. No exchange is available yet.':item.acquisition==='event'?'Event distribution is planned. This is not an active reward.':item.tradeable?'Trading is planned. For now, this Find stays in your collection.':'This Find stays in your collection.')+'</p></article>';
    if(panel)panel.scrollTop=0;
    root.querySelector('[data-find-return]').onclick=()=>{paint();if(panel)panel.scrollTop=listScrollTop;root.querySelector('[data-find="'+CSS.escape(item.id)+'"]')?.focus({preventScroll:true});};
    root.querySelector('[data-view-find]')?.addEventListener('click',async e=>{
      const button=e.currentTarget,token=++request,status=root.querySelector('[data-find-stage-status]');button.disabled=true;status.textContent='Preparing the real collectible…';
      try{
        await loadStage();if(disposed||token!==request||selected!==item.id)return;
        const host=root.querySelector('[data-find-stage]');host.innerHTML='<canvas class="find-canvas" aria-label="Interactive '+esc(item.name)+'"></canvas>';
        const mounted=await globalThis.__mountCollectibleStage(host.querySelector('canvas'),{model:item.model,motion:readGameState().profile?.motion});
        if(disposed||token!==request){mounted.dispose();return;}stage=mounted;status.textContent='Drag to rotate · Pinch to zoom';
      }catch{if(!disposed&&token===request)status.textContent='3D preview unavailable. The story and collection are still here.';}
    });
    root.querySelector('[data-find-return]').focus();
  };
  paint();
  return()=>{disposed=true;disposeStage();};
}
