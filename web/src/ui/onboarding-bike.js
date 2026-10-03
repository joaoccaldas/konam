// ui/onboarding-bike.js — first collectible machine, projected through canonical UserEquipment.
// No second ownership or collection database: Garage owns UserEquipment and Collection projects it.
import { addToGarage, readGarage } from '../engine/garage.js';
import { canonicalProductId } from '../engine/identity.js';
import { applyStoredEvent, ensureProgression, LEVELS } from '../engine/progression.js';
import { getPublicProduct } from '../engine/catalog.js';
import { PRODUCT_NAME } from '../product-meta.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function unlockedOnboardingBike(state=ensureProgression()){
  return LEVELS
    .filter(row=>row.level<=state.level)
    .flatMap(row=>row.rewards||[])
    .filter(reward=>reward.type==='bike')
    .at(-1)||null;
}

export async function renderOnboardingBike(host,{onContinue,onSkip}={}){
  const state=ensureProgression();
  const reward=unlockedOnboardingBike(state);
  if(!reward){onContinue?.();return;}

  const product=await getPublicProduct(reward.id).catch(()=>null);
  const productId=canonicalProductId(reward.id);
  const already=readGarage().some(item=>item.product_id===productId);
  const title=[product?.brand,product?.label||product?.name||product?.model||reward.label].filter(Boolean).join(' ');
  const year=product?.year?String(product.year):'LEVEL '+state.level;

  const paint=collected=>{
    host.innerHTML='<section class="onboarding-question" data-onboarding-bike>'+
      '<div class="onboarding-step-mark" aria-hidden="true"><strong>BIKE</strong><span>UNLOCKED</span></div>'+
      '<div class="onboarding-question-copy"><p class="eyebrow">YOUR FIRST MACHINE</p><h2>'+esc(collected?'It is in your collection.':'Want a bike?')+'</h2><p>'+esc(collected?'Garage and Collection now read the same canonical bike record. Nothing duplicated.':'You earned the first bike available at your level. Add it to your Kona and the same record will appear in Garage and Collection.')+'</p></div>'+
      '<div class="onboarding-answer-grid"><button type="button" data-onboarding-bike-collect'+(collected?' disabled':'')+'><small>'+esc(year)+'</small><b>'+esc(title||reward.label||reward.id)+'</b><i aria-hidden="true">'+(collected?'✓':'→')+'</i></button></div>'+
      '<div class="onboarding-reward"><small>'+(collected?'COLLECTED':'COLLECTION REWARD')+'</small><b>'+(collected?'GARAGE + COLLECTION':'+10 XP')+'</b><span>This marks a Kona.m collection choice, not a claim that you own the physical bike.</span></div>'+
      '<div class="onboarding-actions">'+
        (collected?'<button type="button" class="btn-primary" data-onboarding-bike-continue>Meet your athlete →</button>':'<button type="button" class="btn-text" data-onboarding-bike-skip>Not now</button>')+
        '<span>LEVEL '+esc(state.level)+'</span>'+
      '</div>'+
    '</section>';

    host.querySelector('[data-onboarding-bike-skip]')?.addEventListener('click',()=>onSkip?.());
    host.querySelector('[data-onboarding-bike-continue]')?.addEventListener('click',()=>onContinue?.());
    host.querySelector('[data-onboarding-bike-collect]')?.addEventListener('click',()=>{
      const result=addToGarage(reward.id,{relationship:'dream'});
      if(result.locked)return;
      if(result.added){
        applyStoredEvent({
          type:'EQUIPMENT_ADDED',
          id:'onboarding-bike:'+reward.id+':dream',
          subject:reward.id,
          relationship:'dream',
        });
      }
      paint(true);
      host.querySelector('[data-onboarding-bike-continue]')?.focus();
    });
  };

  paint(already);
}
