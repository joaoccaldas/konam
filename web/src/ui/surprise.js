// ui/surprise.js — one sparse collectible layer shared by app surfaces.
import { nextSurprise, markSurpriseShown, collectSurprise } from '../engine/surprise.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function initSurpriseLayer({openProgress,admin=()=>false}={}){
  let active=null;
  const root=document.createElement('div');
  root.className='kona-surprise-layer';root.hidden=true;root.setAttribute('aria-live','polite');
  document.body.append(root);
  const close=()=>{active=null;root.hidden=true;root.innerHTML='';};
  const blocked=()=>Boolean(document.querySelector('.kona-tour')||document.querySelector('.kona-return-moment:not([hidden])')||document.body.classList.contains('settings-open'));

  function maybeShow(surface){
    if(active||blocked())return false;
    const item=nextSurprise({surface,admin:admin()});
    if(!item)return false;
    active=item;markSurpriseShown(item);
    root.dataset.position=item.position||'top-right';
    root.innerHTML='<button type="button" class="surprise-find" data-surprise-find aria-label="Unexpected KONA find">'+
      '<span aria-hidden="true">✦</span><small>THIS WAS NOT HERE BEFORE</small></button>';
    root.hidden=false;
    root.querySelector('[data-surprise-find]')?.addEventListener('click',()=>{
      const result=collectSurprise(item);
      if(!result.ok){close();return;}
      root.innerHTML='<article class="surprise-reward" role="dialog" aria-modal="false" aria-label="Reward found">'+
        '<button type="button" class="surprise-close" data-surprise-close aria-label="Close">×</button>'+
        '<small>'+esc(String(item.rarity||'find').toUpperCase())+' FIND</small>'+
        '<h3>'+esc(item.name)+'</h3>'+
        '<p>You found it because you came back. Slightly suspicious behavior. Rewarded.</p>'+
        '<div class="surprise-payout"><b>+'+result.xp+' XP</b><b>+'+result.credits+' KC</b></div>'+
        '<div class="return-actions"><button type="button" class="btn-secondary" data-surprise-close>Keep wandering</button><button type="button" class="btn-primary" data-surprise-progress>See Progress →</button></div>'+
      '</article>';
      root.querySelectorAll('[data-surprise-close]').forEach(b=>b.addEventListener('click',close));
      root.querySelector('[data-surprise-progress]')?.addEventListener('click',()=>{close();openProgress?.();});
    });
    return true;
  }
  return {maybeShow,close,dispose:()=>root.remove(),get active(){return active;}};
}
