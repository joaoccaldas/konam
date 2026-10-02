const qs=(s,r=document)=>r.querySelector(s);
const qsa=(s,r=document)=>[...r.querySelectorAll(s)];

const worldData={
  kona:{title:'Kona',body:'The emotional and geographic center of the experiment. Race week, equipment, memory, discovery and the question that started the whole thing.',href:'./'},
  vegas:{title:'Las Vegas',body:'A deliberately excessive test bed for spatial UI, recognizable places and moving through a browser-built world.',href:'https://joaoccaldas.github.io/studio-kona/preview-v2/'},
  stgeorge:{title:'St. George · 2022',body:'A race-week memory experiment: reconstructing place and atmosphere rather than treating an event as a static result.',href:'https://joaoccaldas.github.io/studio-kona/preview-v2/'},
  nice:{title:'Nice',body:'A Mediterranean endurance world for route context, travel, race memory and future event experiences.',href:'https://joaoccaldas.github.io/studio-kona/preview-v2/'}
};
qsa('[data-world]').forEach(btn=>btn.addEventListener('click',()=>{
  qsa('[data-world]').forEach(x=>x.classList.remove('is-active')); btn.classList.add('is-active');
  const d=worldData[btn.dataset.world]; const box=qs('[data-world-info]'); if(!d||!box)return;
  box.innerHTML='<p class="t-label">ACTIVE WORLD</p><h3>'+d.title+'</h3><p>'+d.body+'</p><a href="'+d.href+'" '+(d.href.startsWith('http')?'target="_blank" rel="noopener"':'')+'>Open world <span>↗</span></a>';
}));

const archData={
  kona:['SYSTEM / KONA.M','The public experience','The layer where worlds, identity, equipment, stories, progression and experiments meet.'],
  world:['SYSTEM / WORLD ENGINE','Spatial interfaces','Browser-native 3D places, streaming regions, route memory and experiments in moving through information rather than only reading it.'],
  progress:['SYSTEM / PROGRESSION','Reasons to return','Finds, keys, stamps, badges and access rules that turn browsing into a light game without making training feel like homework.'],
  performance:['SYSTEM / PERFORMANCE','Signals into decisions','A separate authenticated system exploring training, health signals, forecasts and feedback. Public visuals here use synthetic demo data only.'],
  agents:['SYSTEM / AGENTS','Software that can act','Experiments in orchestration, tools, memory and autonomous workflows that support the systems rather than becoming the interface itself.'],
  assets:['SYSTEM / 3D ASSETS','Objects with provenance','Bikes, equipment and world objects produced through repeatable pipelines with performance budgets for browser delivery.'],
  knowledge:['SYSTEM / KNOWLEDGE','Context that survives','Research, source material, project history and structured context designed to remain useful across experiments.']
};
qsa('[data-arch]').forEach(btn=>btn.addEventListener('click',()=>{
  qsa('[data-arch]').forEach(x=>x.classList.remove('is-active')); btn.classList.add('is-active');
  const d=archData[btn.dataset.arch]; if(!d)return;
  qs('[data-arch-label]').textContent=d[0]; qs('[data-arch-title]').textContent=d[1]; qs('[data-arch-body]').textContent=d[2];
}));

qsa('[data-door-button]').forEach(b=>b.addEventListener('click',()=>{
  const door=b.closest('[data-door]'); door?.classList.toggle('is-open');
  b.textContent=door?.classList.contains('is-open')?'Close it before someone notices':'Try the door';
}));

const panel=qs('[data-system-panel]');
const openPanel=()=>{if(!panel)return;panel.hidden=false;document.body.style.overflow='hidden';qsa('[data-system-open]').forEach(x=>x.setAttribute('aria-expanded','true'));};
const closePanel=()=>{if(!panel)return;panel.hidden=true;document.body.style.overflow='';qsa('[data-system-open]').forEach(x=>x.setAttribute('aria-expanded','false'));};
qsa('[data-system-open]').forEach(b=>b.addEventListener('click',openPanel));
qsa('[data-system-close]').forEach(b=>b.addEventListener('click',closePanel));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel?.hidden)closePanel();});

const onboarding=qs('[data-onboarding-card]');
qs('[data-onboarding-start]')?.addEventListener('click',()=>{
  if(!onboarding)return; onboarding.hidden=false; onboarding.scrollIntoView({behavior:'smooth',block:'center'});
});
const paths={
 race:{title:'You have a race.',copy:'Good. Start with your athlete, add the race, then use Plan for the serious bits. Visit Discover when your brain needs to remember why endurance sport is fun.',cta:'Build my athlete',href:'./'},
 dream:{title:'You are dreaming of Kona.',copy:'Excellent. No qualification paperwork required here. Start in Discover, visit Kona, collect something unnecessary, then build the version of yourself who might go there one day.',cta:'Start dreaming',href:'./'},
 bikes:{title:'You came for the bikes.',copy:'Correct answer according to the intern. Go straight to the Garage or museum. Rotate everything. Form strong opinions about equipment you may not own.',cta:'Show me bikes',href:'Canyon_Collection.html'},
 wander:{title:'No idea is a valid plan.',copy:'Enter Kona.m and click whatever has the most suspicious label. If confused, Home will recover you. If still confused, the intern probably shipped something late at night.',cta:'Drop me in',href:'./'}
};
qsa('[data-path]').forEach(b=>b.addEventListener('click',()=>{
  const d=paths[b.dataset.path], out=qs('[data-onboarding-result]'); if(!d||!out)return;
  qsa('[data-path]').forEach(x=>x.classList.remove('is-active')); b.classList.add('is-active');
  out.hidden=false; out.innerHTML='<h3>'+d.title+'</h3><p>'+d.copy+'</p><a class="promo-button primary" href="'+d.href+'">'+d.cta+' <span>→</span></a>';
}));

const hour=new Date().getHours();
const coffee=qs('[data-coffee-status]'), training=qs('[data-training-status]');
if(coffee) coffee.textContent=hour<10?'CRITICAL':'ADEQUATE';
if(training) training.textContent=hour<12?'PLANNED, APPARENTLY':hour<19?'STILL POSSIBLE':'TOMORROW IS ALSO A DAY';

const stage=qs('[data-parallax-stage]');
if(stage && matchMedia('(pointer:fine)').matches && !matchMedia('(prefers-reduced-motion:reduce)').matches){
  stage.addEventListener('pointermove',e=>{
    const r=stage.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
    stage.style.transform='perspective(1000px) rotateY('+(x*4-2)+'deg) rotateX('+(-y*3)+'deg)';
  });
  stage.addEventListener('pointerleave',()=>stage.style.transform='perspective(1000px) rotateY(-2deg)');
}

const header=qs('[data-header]');
let lastY=0;
addEventListener('scroll',()=>{
  const y=scrollY;
  if(header){header.style.transform=(y>lastY&&y>180)?'translateY(-125%)':'translateY(0)';header.style.transition='transform .25s ease';}
  lastY=y;
},{passive:true});

const tourFrame=qs('[data-tour-frame]');
const tourOpen=qs('[data-tour-open]');
const tourUrl=qs('[data-tour-url]');
const tourKicker=qs('[data-tour-kicker]');
const tourTitle=qs('[data-tour-title]');
const tourCopy=qs('[data-tour-copy]');
let tourTimer=null;
const tourButtons=qsa('[data-tour-src]');
function setTour(btn){
  tourButtons.forEach(x=>x.classList.toggle('is-active',x===btn));
  if(tourFrame) tourFrame.src=btn.dataset.tourSrc;
  if(tourOpen) tourOpen.href=btn.dataset.tourHref;
  if(tourUrl) tourUrl.textContent=btn.dataset.tourUrlLabel||'konam';
  if(tourKicker) tourKicker.textContent=btn.dataset.tourKickerLabel||'REAL APP';
  if(tourTitle) tourTitle.textContent=btn.dataset.tourTitleLabel||'Kona.m';
  if(tourCopy) tourCopy.textContent=btn.dataset.tourCopyLabel||'';
}
tourButtons.forEach(btn=>btn.addEventListener('click',()=>{setTour(btn); if(tourTimer){clearInterval(tourTimer);tourTimer=null;}}));
if(tourButtons.length>1 && !matchMedia('(prefers-reduced-motion:reduce)').matches){
  let i=0;
  tourTimer=setInterval(()=>{i=(i+1)%tourButtons.length;setTour(tourButtons[i]);},9000);
}
