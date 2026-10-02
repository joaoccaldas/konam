// KONA Finds: a projection over the existing registry and personal progression.
import { readGameState } from '../engine/game-state.js';
import { findCollection, findSummary, FIND_METHODS, itemCollection } from '../engine/items.js';
import { collectibleReward } from '../engine/progression.js';
import { findAccess } from '../engine/access.js';
import { getPublicProduct } from '../engine/catalog.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=n=>String(n).padStart(3,'0');
const mark='<svg viewBox="0 0 100 70" aria-hidden="true"><path d="M12 52 24 25 47 12 72 18 89 45 70 60 36 64Z" fill="currentColor"/></svg>';
let stageReady=null;
function loadStage(){
  if(globalThis.__mountCollectibleStage)return Promise.resolve();
  return stageReady||(stageReady=new Promise((resolve,reject)=>{
    const s=document.createElement('script');s.src='app/collectible-stage.js';
    s.onload=resolve;s.onerror=()=>{s.remove();stageReady=null;reject(new Error('Preview unavailable'));};
    document.body.append(s);
  }));
}
export async function renderCollectionSurface(root,{admin=false,onBack}={}){
  let filter='all',selected=null,disposed=false,stage=null,request=0;
  const disposeStage=()=>{request++;stage?.dispose?.();stage=null;};
  const visible=item=>findAccess(item,{collected:item.collected,admin}).detailsVisible;
  const paint=()=>{
    disposeStage();selected=null;
    const snapshot=readGameState(),items=findCollection(snapshot),summary=findSummary(snapshot);
    const tabs=[['all','All'],...Object.entries(FIND_METHODS).map(([id,row])=>[id,row.label])];
    root.innerHTML='<section class="kona-section artifact artifact--label finds-heading"><small>KONA FINDS</small><h3>Small things. Long stories.</h3><p>'+summary.collected+' / '+summary.total+' collected</p><progress aria-label="KONA Finds collected" value="'+summary.collected+'" max="'+summary.total+'"></progress><p class="kona-source-note">Hidden in KONA. Kept here. Trade and Special Event slots preview future ways to collect.</p>'+(onBack?'<button type="button" class="btn-text" data-finds-back>← User Studio</button>':'')+(admin?'<p class="t-data">ADMIN · ALL 100 VISIBLE · PERSONAL OWNERSHIP UNCHANGED</p>':'')+'</section>'+
      '<nav class="ui-cluster finds-filters" aria-label="Find acquisition method">'+tabs.map(([id,label])=>'<button type="button" class="btn-secondary" data-find-filter="'+id+'" aria-pressed="'+(id===filter)+'">'+esc(label)+'</button>').join('')+'</nav>'+
      '<div class="ui-grid finds-grid" aria-label="KONA Finds collection">'+items.filter(x=>filter==='all'||x.acquisition===filter).map(item=>{
        const reveal=visible(item);
        return '<button type="button" class="kona-item-card artifact artifact--spec find-card '+(item.collected?'is-collected':'is-locked')+'" data-find="'+esc(item.id)+'" aria-label="Find '+number(item.number)+' · '+esc(reveal?item.name:'Not found yet')+'"><small>'+number(item.number)+' / 100</small><i class="find-mark">'+(item.model?mark:'◇')+'</i><b>'+esc(reveal?item.name:'Something to find')+'</b><span>'+esc(item.collected?'Collected · '+item.rarity:admin?'Admin preview · '+item.rarity:'Not found yet')+'</span><small>'+esc(FIND_METHODS[item.acquisition]?.label||item.acquisition)+'</small></button>';
      }).join('')+'</div><section class="kona-section artifact artifact--label" data-other-collection><h3>Your other stories</h3><div class="ui-grid" data-other-items></div></section>';
    root.querySelector('[data-finds-back]')?.addEventListener('click',()=>onBack?.());
    root.querySelectorAll('[data-find-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.findFilter;paint();root.querySelector('[data-find-filter="'+filter+'"]')?.focus({preventScroll:true});});
    root.querySelectorAll('[data-find]').forEach(b=>b.onclick=()=>detail(items.find(x=>x.id===b.dataset.find)));
    const host=root.querySelector('[data-other-items]');
    for(const item of itemCollection(snapshot).filter(x=>x.kind!=='find')){
      const card=document.createElement('article');card.className='kona-item-card artifact artifact--label';card.innerHTML='<small>'+esc(item.kind)+'</small><b>'+esc(item.label)+'</b><span>'+esc(item.relationship)+'</span>';host.append(card);
      if(item.kind==='equipment')getPublicProduct(String(item.entity_id).replace(/^product:/,'')).then(p=>{if(p&&card.isConnected)card.querySelector('b').textContent=[p.brand,p.name||p.label||p.model].filter(Boolean).join(' ');}).catch(()=>{});
    }
    if(!host.children.length)root.querySelector('[data-other-collection]').hidden=true;
  };
  const detail=item=>{
    if(!item)return;disposeStage();selected=item.id;const reveal=visible(item),pay=collectibleReward(item);
    root.innerHTML='<article class="find-studio"><button type="button" class="btn-text" data-find-return>← KONA Finds</button><header><small class="t-data">FIND '+number(item.number)+' / 100 · '+esc(reveal?item.rarity:'UNDISCOVERED')+'</small><h3>'+esc(reveal?item.name:'A story still waiting.')+'</h3><p>'+esc(reveal?item.tagline:'Keep wandering. This slot will remember what you find.')+'</p></header>'+
      (reveal&&item.model?'<section class="artifact artifact--spec find-preview"><div data-find-stage><i class="find-mark">'+mark+'</i><button type="button" class="btn-primary" data-view-find>Explore in 3D</button></div><p class="kona-source-note" data-find-stage-status>3D loads when you ask. Drag to rotate; pinch to zoom.</p></section>':'<div class="artifact artifact--label find-data-only"><i class="find-mark">◇</i><p>'+esc(reveal?'A story collectible. No 3D model.':'Not found yet.')+'</p></div>')+
      (reveal?'<section class="kona-section artifact artifact--label"><h3>Its story</h3><p>'+esc(item.lore)+'</p></section>':'')+
      '<dl class="find-facts artifact artifact--spec"><div><dt>Collection position</dt><dd>'+number(item.number)+' / 100</dd></div><div><dt>Acquisition</dt><dd>'+esc(FIND_METHODS[item.acquired?.method||item.acquisition]?.label||item.acquisition)+'</dd></div><div><dt>Status</dt><dd>'+esc(item.collected?'Collected on this device':admin?'Admin preview. Not owned.':'Not collected')+'</dd></div>'+(reveal?'<div><dt>Discovery reward</dt><dd>'+pay.xp+' XP · '+pay.credits+' KC</dd></div><div><dt>Place</dt><dd>'+esc(item.place)+'</dd></div>':'')+'</dl>'+
      '<p class="kona-source-note">'+esc(item.acquisition==='trade'?'Trading is planned. No exchange is available yet.':item.acquisition==='event'?'Event distribution is planned. This is not an active reward.':item.tradeable?'Trading is planned. For now, this Find stays in your collection.':'This Find stays in your collection.')+'</p></article>';
    root.querySelector('[data-find-return]').onclick=()=>{paint();root.querySelector('[data-find="'+CSS.escape(item.id)+'"]')?.focus({preventScroll:true});};
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
