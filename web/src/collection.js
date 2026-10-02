import {DEFAULT_AIR,STOCK,forces} from './aero.mjs';
const bikes=window.__COLLECTION,selected=new Set(bikes.map(b=>b.key)),$=id=>document.getElementById(id),esc=s=>String(s??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),money=n=>new Intl.NumberFormat('sv-SE',{maximumFractionDigits:0}).format(n)+' SEK';let tab='overview';
$('collection-count').textContent=`${String(bikes.filter(b=>!b.notModelled).length).padStart(2,'0')} 3D EXHIBITS · ${String(bikes.length).padStart(2,'0')} MODELS · MY2027`;
for(const [i,b] of bikes.entries()){
  const card=document.createElement('article');card.className='bike-card'+(b.notModelled?' not-modelled':'');
  const actions=b.notModelled
    ?`<div class="card-actions"><span class="primary disabled">Not yet modelled</span><a class="secondary" href="https://www.canyon.com/en-se/road-bikes/triathlon-bikes/speedmax/" target="_blank" rel="noopener">View at Canyon ↗</a></div>`
    :`<div class="card-actions"><a class="primary" href="${esc(b.viewer)}">Enter 3D studio →</a><button class="secondary" data-spec="${b.key}">Full specification</button></div>`;
  const img=b.image
    ?`<img class="bike-image" src="${b.image}" alt="${esc(b.name)} official side reference">`
    :`<div class="bike-image placeholder" aria-hidden="true"><span>3D exhibit<br>coming soon</span></div>`;
  card.innerHTML=`<div class="card-top"><div><span>MY${esc(b.year||'2027')} · SIZE ${esc(b.size||'M')} · ${esc(b.series)}</span><h2>${esc(b.name)}</h2></div><div class="card-number">${String(i+1).padStart(2,'0')}</div></div>${img}<div class="card-stats"><div><b>${b.weightKg??'—'} kg</b><small>Complete bike · ${esc(b.size||'M')}</small></div><div><b>${esc(b.gear)}</b><small>Chainrings</small></div>${b.priceSEK==null?`<div><b>${esc(b.era||'Archive')}</b><small>In production</small></div>`:`<div><b>${money(b.priceSEK)}</b><small>Canyon Sweden · from</small></div>`}</div>${actions}${b.notModelled?'':`<label class="compare-check"><input type="checkbox" checked data-select="${b.key}">Compare this bike</label>`}`;
  $('carousel').append(card);
}
function scroll(dir){$('carousel').scrollBy({left:dir*($('carousel').firstElementChild.getBoundingClientRect().width+22),behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});} $('previous').onclick=()=>scroll(-1);$('next').onclick=()=>scroll(1);$('carousel').onkeydown=e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();scroll(e.key==='ArrowRight'?1:-1);}};
const specCards=items=>items.map(c=>`<article class="spec-card"><small>${esc(c.type)}</small><b>${esc(c.name)}</b><dl>${Object.entries(c.features).map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl></article>`).join('');
function specs(b){
  if(!b.components){$('dialog-content').innerHTML=`<div class="eyebrow">Canyon listing</div><h2>${esc(b.name)}</h2><p class="source-note">Size M · ${b.weightKg} kg · ${money(b.priceSEK)}<br>Drivetrain: ${esc(b.groupset)} · Chainrings: ${esc(b.gear)} / ${esc(b.cassette)}<br>Components: not yet captured.</p>`;$('spec-dialog').showModal();return;}
  const groups=[...new Set(b.components.map(c=>c.group))];$('dialog-content').innerHTML=`<div class="eyebrow">Complete Canyon specification</div><h2>${esc(b.name)}</h2><p class="source-note">Size M · ${b.weightKg} kg · ${money(b.priceSEK)}<br>Checked ${b.checkedAt.slice(0,10)} · <a href="${esc(b.source)}" target="_blank" rel="noopener">Official Canyon listing ↗</a></p>${groups.map((g,i)=>`<details ${i===0?'open':''}><summary>${esc(g)}</summary>${specCards(b.components.filter(c=>c.group===g))}</details>`).join('')}<details><summary>Source discrepancies</summary>${b.discrepancies.map(d=>`<p class="source-note">${esc(d)}</p>`).join('')}</details><p><a class="primary" href="${esc(b.viewer)}">Explore this bike in 3D →</a></p>`;$('spec-dialog').showModal();}
document.querySelectorAll('[data-spec]').forEach(b=>b.onclick=()=>specs(bikes.find(x=>x.key===b.dataset.spec)));$('spec-dialog').querySelector('.close').onclick=()=>$('spec-dialog').close();$('spec-dialog').onclick=e=>{if(e.target===$('spec-dialog'))$('spec-dialog').close();};
function table(rows,list){$('comparison').innerHTML=`<table><thead><tr><th>Specification · size M</th>${list.map(b=>`<th>${esc(b.name)}</th>`).join('')}</tr></thead><tbody>${rows.map(([label,...values])=>`<tr><td>${esc(label)}</td>${values.map(v=>`<td class="${new Set(values).size>1?'different':''}">${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;}
function render(){const list=bikes.filter(b=>selected.has(b.key)&&!b.notModelled);$('comparison').hidden=tab==='aero';$('aero-compare').hidden=tab!=='aero';if(!list.length){$('comparison').hidden=false;$('comparison').textContent='Select at least one bike in the collection above.';$('aero-compare').hidden=true;return;}if(tab==='aero'){aero(list);return;}let rows=[];if(tab==='overview')rows=[['Complete weight',...list.map(b=>b.weightKg!=null?b.weightKg+' kg':'Not listed')],['Canyon Sweden price',...list.map(b=>b.priceSEK!=null?money(b.priceSEK):'Not listed')],['Drivetrain',...list.map(b=>b.groupset||'Not listed')],['Chainrings / cassette',...list.map(b=>[b.gear,b.cassette].filter(Boolean).join(' / ')||'Not listed')],['Wheels · front / rear',...list.map(b=>b.wheels||'Not listed')],['Seatpost',...list.map(b=>b.post||'Not listed')],['Saddle',...list.map(b=>b.saddle||'Not listed')]];
 else if(tab==='geometry'){
   const keys=[...new Set(list.flatMap(b=>Object.keys(b.geometryBySize?.M||{})))];
   rows=keys.length?keys.map(k=>[k,...list.map(b=>{const d=b.geometryBySize?.M?.[k];return d?d.value+' '+d.unit:'Not listed';})]):[['Geometry',...list.map(()=>'Not listed')]];
 }else{
   const mapped=list.map(b=>{const seen={},m=new Map();for(const comp of (Array.isArray(b.components)?b.components:[])){const base=(comp.group||'Component')+' / '+(comp.type||'Item'),count=seen[base]=(seen[base]||0)+1;const features=comp.features&&typeof comp.features==='object'?comp.features:{};m.set(base+(count>1?' '+count:''),(comp.name||'Unnamed component')+(Object.keys(features).length?' · '+Object.entries(features).map(([k,v])=>k+': '+v).join('; '):''));}return m;});
   const keys=[...new Set(mapped.flatMap(m=>[...m.keys()]))];
   rows=keys.length?keys.map(k=>[k,...mapped.map(m=>m.get(k)||'Not listed')]):[['Components',...list.map(()=>'Not listed')]];
 }table(rows,list);}
const drag=new Map(bikes.filter(b=>!b.notModelled).map(b=>[b.key,.23]));
function aero(list){$('drag-inputs').innerHTML=list.map(b=>`<label class="field">${esc(b.name)} · CdAx m²<input data-drag="${b.key}" type="number" min="0.05" max="0.6" step="0.001" value="${drag.get(b.key)}"></label>`).join('');document.querySelectorAll('[data-drag]').forEach(e=>e.oninput=()=>{if(e.checkValidity()&&e.value){drag.set(e.dataset.drag,+e.value);calculate(list);}});calculate(list);}
function calculate(list){const fields=['compare-speed','compare-mass','compare-wind','compare-grade'];if(fields.some(id=>!$(id).checkValidity()||!$(id).value))return;const env={...DEFAULT_AIR,speed:+$('compare-speed').value,mass:+$('compare-mass').value,headwind:+$('compare-wind').value,grade:+$('compare-grade').value};const results=list.map(b=>({b,f:forces({...env,mass:env.mass+b.weightKg},{base:drag.get(b.key),deltas:{}},STOCK)}));const base=results[0].f;$('aero-cards').innerHTML=results.map(({b,f})=>`<article class="aero-card"><div class="eyebrow">${esc(b.name)}</div><strong>${f?f.power.toFixed(1)+' W':'Unsupported'}</strong><small>${f?`${f.aero.toFixed(1)} W aero · ${f.rolling.toFixed(1)} W rolling<br>${base?(f.power-base.power>=0?'+':'')+(f.power-base.power).toFixed(2)+' W versus first selected bike':''}`:'Wind/speed outside this model.'}</small></article>`).join('');const curves=list.map(b=>Array.from({length:31},(_,i)=>forces({...env,speed:20+i,mass:env.mass+b.weightKg},{base:drag.get(b.key),deltas:{}},STOCK)?.power));const max=Math.max(300,...curves.flat().filter(Number.isFinite)),colors=['#138a8f','#6b4fa0','#1f6fb2','#e8471c'];$('aero-chart').innerHTML=`<path d="M25 10V155H780" fill="none" stroke="#8e979d"/><text x="30" y="175" fill="#5f6a72" font-size="11">20 → 50 km/h · required crank power · top ${Math.ceil(max)} W</text>`+curves.map((v,i)=>`<polyline points="${v.map((w,j)=>w===null?'':`${25+j*25},${155-w/max*140}`).join(' ')}" fill="none" stroke="${colors[i%colors.length]}" stroke-width="2"/>`).join('');window.__comparison={env,results:results.map(({b,f})=>({bike:b.key,...f}))};}
for(const id of ['compare-speed','compare-mass','compare-wind','compare-grade'])$(id).oninput=()=>calculate(bikes.filter(b=>selected.has(b.key)));
document.querySelectorAll('[data-select]').forEach(e=>e.onchange=()=>{e.checked?selected.add(e.dataset.select):selected.delete(e.dataset.select);render();});document.querySelectorAll('[data-compare]').forEach(e=>e.onclick=()=>{tab=e.dataset.compare;document.querySelectorAll('[data-compare]').forEach(x=>x.classList.toggle('active',x===e));render();});render();
// ---- Museum wings: every bike, grouped by era ----
const heritageSet=new Set(['speedmax-three-2005','speedmax-2007','speedmax-al-2011','speedmax-cf-2011']);
function wingCard(b,i){
  const img=b.image?`<img src="${b.image}" alt="${esc(b.name)} reference" loading="lazy">`:`<div class="wc-soon-img"></div>`;
  return `<a class="wing-card${b.notModelled?' wc-soon':''}" ${b.notModelled?'':`href="${esc(b.viewer)}"`}>${img}<span class="wc-info"><h3>${esc(b.name)}</h3><small>${esc(b.era||b.series||'')}</small></span><span class="wc-go">${b.notModelled?'Coming soon':'Enter exhibit →'}</span></a>`;
}
if($('wing-modern-body')){
  const modern=bikes.filter(b=>!heritageSet.has(b.key||b.id)&&!b.notModelled);
  const heritage=bikes.filter(b=>heritageSet.has(b.key||b.id));
  $('wing-modern-body').innerHTML=modern.map(wingCard).join('');
  $('wing-heritage-body').innerHTML=heritage.map(wingCard).join('');
}
// hero metrics: real counts
(function(){const m=document.createElement('div');m.className='hero-metrics';
 const ex=bikes.filter(b=>!b.notModelled).length,total=bikes.length;
 m.innerHTML=`<div><b>${String(ex).padStart(2,'0')}</b><small>Interactive exhibits</small></div><div><b>1999</b><small>First Speedmax</small></div><div><b>2027</b><small>Latest CFR AXS</small></div><div><b>${(total-ex).toString().padStart(2,'0')}</b><small>Awaiting research</small></div>`;
 document.querySelector('.intro')?.append(m);})();

// ---- Archive: every Speedmax generation, modelled or documented only ----
(function(){const A=window.__ARCHIVE||[],tl=$('timeline');if(!tl||!A.length)return;
 tl.innerHTML=A.map(h=>{const live=h.status==='reference-study'&&h.viewer;
  const act=live?`<a class="tl-enter" href="${esc(h.viewer)}">Enter exhibit →</a>`:`<span class="tl-muted">${esc(h.why||'Not yet modelled')}</span>`;
  const src=h.source?`<a href="${esc(h.source)}" target="_blank" rel="noopener">Archive source ↗</a>`:'';
  return `<article class="tl-item${live?'':' tl-soon'}"><div class="tl-years">${esc(h.years)}</div><h3>${esc(h.name)}</h3><div class="tl-mat">${esc(h.material)}</div><p>${esc(h.note)}</p><div class="tl-actions">${act}${src}</div></article>`;}).join('');})();

window.__collection={bikes,selected};
