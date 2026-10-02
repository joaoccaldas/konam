import { currentUser, isAdminUser } from '../cloud/supabase-lite.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export async function renderAdminMerch(root){
  const user=await currentUser().catch(()=>null);
  if(!isAdminUser(user)){
    root.innerHTML='<section class="asset-portfolio"><div class="asset-hero"><small>ADMIN</small><h3>Not for this account.</h3><p>Merch Studio is visible only to KONA administrators.</p></div></section>';
    return;
  }
  root.innerHTML='<section class="asset-portfolio merch-studio"><div class="asset-hero"><small>KONA · ADMIN · MERCH</small><h3>Merch Studio.</h3><p>Generated concepts from approved Kona.m brand ingredients. Nothing here is sellable until rights, print feasibility, a physical sample and fulfillment economics pass.</p><div class="asset-hand">Pixels first. Cardboard box later.</div></div><p class="kona-source-note" data-merch-status>Generating the rack…</p></section>';
  const host=root.querySelector('.merch-studio'),status=root.querySelector('[data-merch-status]');
  try{
    const data=await fetch('app/admin-merch-concepts.json',{cache:'no-store',credentials:'same-origin'}).then(r=>r.ok?r.json():Promise.reject(new Error('merch concept projection unavailable')));
    status.remove();
    host.insertAdjacentHTML('beforeend','<div class="asset-summary"><span>'+data.concepts.length+' concepts</span><span>'+data.concepts.filter(x=>x.sellable).length+' sellable</span><span>'+data.concepts.filter(x=>!x.sellable).length+' sample gates pending</span></div><div class="merch-grid">'+data.concepts.map(c=>'<article class="merch-card"><img src="'+esc(c.visual)+'" alt="'+esc(c.name)+' concept visual" loading="lazy"><div><small>'+esc(c.product)+' · '+esc(c.status)+'</small><h4>'+esc(c.name)+'</h4><p>'+esc(c.headline)+'</p><dl><div><dt>Rights</dt><dd>'+esc(c.rights)+'</dd></div><div><dt>Provider</dt><dd>'+(c.provider?esc(c.provider):'Not selected')+'</dd></div><div><dt>Sale status</dt><dd>'+(c.sellable?'Approved':'Concept only')+'</dd></div></dl></div></article>').join('')+'</div><p class="kona-source-note">Rebuild with <code>node tools/build_merch_concepts.mjs</code>. Provider listing, payments and fulfillment are intentionally not wired yet.</p>');
  }catch(error){status.textContent='Merch Studio could not load: '+error.message;status.setAttribute('role','alert');}
}
