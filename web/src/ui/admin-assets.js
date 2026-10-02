// ui/admin-assets.js — admin-only read-only portfolio over canonical generated asset projection.
import { currentUser, isAdminUser } from '../cloud/supabase-lite.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const titleOf=o=>o?.name||o?.model||o?.label||o?.id||'Untitled asset';
const firstImage=o=>o?.image||o?.thumbnail||o?.poster||o?.preview||'';
const specLine=(k,v)=>v?'<span><i>'+esc(k)+'</i><b>'+esc(v)+'</b></span>':'';

function specs(a){
 const rows=[];
 if(a.family)rows.push(['Family',a.family]);
 if(a.material)rows.push(['Material',a.material]);
 if(a.category)rows.push(['Category',a.category]);
 if(a.glb)rows.push(['3D','GLB']);
 for(const fact of (a.facts||[]).slice(0,2))if(fact?.text)rows.push(['Fact',fact.text]);
 for(const stat of (a.stats||[]).slice(0,3))if(Array.isArray(stat))rows.push([stat[1]||'Spec',stat[0]]);
 return rows.slice(0,4);
}

function generatedPreview(a){
 const p=a.preview;if(!p)return '';
 return '<div class="asset-thumb-generated" style="--preview-floor:'+esc(p.floor||'#12181d')+';--preview-accent:'+esc(p.accent||'#ff6a00')+';--preview-fog:'+esc(p.fog||'#0b1116')+'"><i></i><span>'+esc(a.type||'asset')+'</span></div>';
}
function card(a){
 const loc=a.locations||[],img=firstImage(a);
 return '<article class="asset-card" data-asset-card data-type="'+esc(a.type)+'" data-brand="'+esc(a.brand)+'" data-year="'+esc(a.year)+'">'+
   '<div class="asset-thumb">'+(img?'<img src="'+esc(img)+'" alt="" loading="lazy" decoding="async">':(a.glb?'<div class="asset-thumb-3d" data-admin-3d data-glb="'+esc(a.glb)+'"></div>':generatedPreview(a)))+
    '<div class="asset-thumb-fallback"><small>'+esc(a.type)+'</small><b>'+esc(a.brand||'KONA')+'</b><em>'+(a.glb?'3D asset':'thumbnail pending')+'</em></div></div>'+
   '<div class="asset-card-body">'+
    '<div class="asset-meta"><span>'+esc(a.brand||'Independent')+'</span><span>'+esc(a.year||a.kind)+'</span></div>'+
    '<h5>'+esc(titleOf(a))+'</h5><p>'+esc(a.id)+'</p>'+
    '<div class="asset-locations">'+(loc.length?loc.map(x=>'<span>'+esc((x.floor_name?x.floor_name+' · ':'')+x.name)+'</span>').join(''):'<span>Reusable / unassigned</span>')+'</div>'+
    '<div class="asset-specs">'+specs(a).map(([k,v])=>specLine(k,v)).join('')+'</div>'+
   '</div></article>';
}

export async function renderAdminAssets(root){
 const user=await currentUser().catch(()=>null);
 if(!isAdminUser(user)){
   root.innerHTML='<section class="asset-portfolio"><div class="asset-hero"><small>ADMIN</small><h3>Not for this account.</h3><p>The Asset Library is visible only to KONA administrators.</p></div></section>';
   return;
 }
 root.innerHTML='<section class="asset-portfolio"><div class="asset-hero"><small>KONA · ADMIN</small><h3>Asset Portfolio.</h3><p>Every catalog product, shoe, bike, artwork, sculpture, decoration and installation currently generated from the museum registries.</p><div class="asset-hand">Nothing hiding in a mystery folder.</div></div><p class="kona-source-note" data-asset-status>Reading the world…</p></section>';
 const host=root.querySelector('.asset-portfolio'),status=root.querySelector('[data-asset-status]');
 try{
   const projection=await fetch('app/admin-assets.json',{cache:'no-store',credentials:'same-origin'}).then(r=>r.ok?r.json():Promise.reject(new Error('admin asset projection unavailable')));
   const assets=projection.assets||[];
   const brands=[...new Set(assets.map(a=>a.brand).filter(Boolean))].sort();
   const types=[...new Set(assets.map(a=>a.type).filter(Boolean))].sort();
   const years=[...new Set(assets.map(a=>String(a.year||'')).filter(Boolean))].sort((a,b)=>b.localeCompare(a));
   const imageCount=assets.filter(a=>a.image).length;
   const modelCount=assets.filter(a=>!a.image&&a.glb).length;
   const generatedCount=assets.filter(a=>!a.image&&!a.glb&&a.preview).length;
   const missing=assets.filter(a=>!a.image&&!a.glb&&!a.preview).length;
   const roomCount=new Set(assets.flatMap(a=>(a.locations||[]).map(x=>x.id))).size;
   status.remove();
   host.insertAdjacentHTML('beforeend',
     '<div class="asset-summary"><span>'+assets.length+' assets</span><span>'+roomCount+' rooms</span><span>'+imageCount+' image previews</span><span>'+modelCount+' live 3D previews</span><span>'+generatedCount+' generated previews</span><span>'+missing+' missing previews</span></div>'+
     '<section class="asset-toolbar"><small>FILTER THE WORLD</small><div class="asset-filter-grid">'+
      '<label class="ui-field wide"><span>Search</span><input class="ui-input" data-asset-q type="search" placeholder="Bike, Nike, 2027, sculpture…"></label>'+
      '<label class="ui-field"><span>Type</span><select class="ui-select" data-asset-type><option value="">All types</option>'+types.map(v=>'<option>'+esc(v)+'</option>').join('')+'</select></label>'+
      '<label class="ui-field"><span>Brand</span><select class="ui-select" data-asset-brand><option value="">All brands</option>'+brands.map(v=>'<option>'+esc(v)+'</option>').join('')+'</select></label>'+
      '<label class="ui-field"><span>Year</span><select class="ui-select" data-asset-year><option value="">All years</option>'+years.map(v=>'<option>'+esc(v)+'</option>').join('')+'</select></label>'+
      '<label class="ui-field"><span>Group</span><select class="ui-select" data-asset-group><option value="room">Room / floor</option><option value="brand">Brand</option><option value="type">Type</option></select></label>'+
     '</div></section><div data-asset-results></div>'
   );
   const results=host.querySelector('[data-asset-results]');
   const controls={q:host.querySelector('[data-asset-q]'),type:host.querySelector('[data-asset-type]'),brand:host.querySelector('[data-asset-brand]'),year:host.querySelector('[data-asset-year]'),group:host.querySelector('[data-asset-group]')};
   const render=()=>{
     const q=controls.q.value.trim().toLowerCase(),type=controls.type.value,brand=controls.brand.value,year=controls.year.value,group=controls.group.value;
     const rows=assets.filter(a=>{
       const hay=[a.id,a.name,a.brand,a.type,a.year,a.category,a.material,...(a.locations||[]).flatMap(x=>[x.name,x.floor_name]),...specs(a).flat()].join(' ').toLowerCase();
       return(!q||hay.includes(q))&&(!type||a.type===type)&&(!brand||a.brand===brand)&&(!year||String(a.year)===year);
     });
     const groups=new Map();
     for(const a of rows){
       let keys=[];
       if(group==='brand')keys=[a.brand||'Independent'];
       else if(group==='type')keys=[a.type||'asset'];
       else keys=(a.locations||[]).length?a.locations.map(x=>(x.floor_name||'Unassigned')+' · '+x.name):['Reusable / unassigned'];
       for(const key of [...new Set(keys)]){if(!groups.has(key))groups.set(key,[]);groups.get(key).push(a);}
     }
     results.innerHTML=[...groups.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([label,items])=>
      '<section class="asset-room"><div class="asset-room-title"><div><small>'+esc(group==='room'?'ROOM / FLOOR':group.toUpperCase())+'</small><h4>'+esc(label)+'</h4></div><b>'+items.length+' item'+(items.length===1?'':'s')+'</b></div><div class="asset-grid">'+items.sort((a,b)=>String(b.year||'').localeCompare(String(a.year||''))||String(a.brand||'').localeCompare(String(b.brand||''))||titleOf(a).localeCompare(titleOf(b))).map(card).join('')+'</div></section>'
     ).join('')||'<p class="asset-empty">Nothing here. Which is useful information too.</p>';
   };
   Object.values(controls).forEach(el=>el.addEventListener(el.tagName==='INPUT'?'input':'change',render));render();
   const mount=()=>window.__mountAdminAssetPreviews?.(host);
   if(window.__mountAdminAssetPreviews)mount();
   else{const script=document.createElement('script');script.src='app/admin-asset-preview.js';script.onload=mount;document.body.append(script);}

 }catch(error){
   status.textContent='Asset Portfolio could not load: '+error.message;status.setAttribute('role','alert');
 }
}
