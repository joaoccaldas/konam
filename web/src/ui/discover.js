import previews from '../../../museum/entry-catalog.json' with {type:'json'};
import { loadPublicCatalog } from '../engine/catalog.js';
// ui/discover.js — lightweight editorial discovery. Loads public JSON only on intent.
// 3D remains an explicit deeper action.
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const category=(name,sub)=>'<article class="discover-category artifact artifact--label"><small>'+esc(name)+'</small><b>'+esc(sub)+'</b></article>';

export async function renderDiscoverSurface(root,{enter}={}){
  root.innerHTML=
    '<section class="kona-hero-card artifact artifact--hero"><small>DISCOVER</small><h3>Interesting things.<br>Not a floor plan.</h3>'+
    '<p>Machines, people, stories, places and rooms. The 3D world is one way deeper, not the front door.</p></section>'+
    '<section class="kona-discover-categories">'+
      category('Machines','How things are made and raced.')+
      category('People','The humans behind the equipment.')+
      category('Stories','What changed, failed, won or mattered.')+
      category('Places','Where the sport becomes real.')+
      category('Rooms','Enter the immersive world when you want it.')+
    '</section>'+
    '<section class="kona-section artifact artifact--label" data-discover-feed><div class="kona-section-head"><h3>Loading the interesting bits</h3><small>PUBLIC DATA</small></div></section>'+
    '<section class="kona-section artifact artifact--label"><div class="kona-section-head"><h3>Go deeper</h3><small>OPTIONAL 3D</small></div>'+
      '<button class="kona-primary" type="button" data-enter-world>Enter the world <span>→</span></button></section>';
  root.querySelector('[data-enter-world]')?.addEventListener('click',()=>enter?.());

  const data=await loadPublicCatalog();
  const products=(data.products||[]).filter(x=>x.public!==false).slice(0,4);
  const places=(data.places||[]).slice(0,3);
  const feed=root.querySelector('[data-discover-feed]');
  if(!feed)return;
  const items=[
    ...products.map(p=>({kicker:p.product_type||'Machine',title:[p.brand,p.label||p.model].filter(Boolean).join(' '),sub:p.year?String(p.year):p.representation||'',image:previews.bikes.find(x=>x.id===p.id)?.image,href:'Studio.html?p='+encodeURIComponent(p.id),action:'Inspect the machine'})),
    ...places.map(p=>({kicker:'Place',title:p.label||p.name,sub:p.region||p.purpose||'',image:'assets/kona-years/kailua-bay.jpg',href:(p.source_records||[]).find(x=>/^https:\/\//.test(x)),action:'Read the source'}))
  ];
  feed.innerHTML='<div class="kona-section-head"><h3>Start anywhere</h3><small>'+items.length+' THINGS</small></div>'+
    '<div class="kona-discover-feed">'+items.map(x=>'<article class="artifact artifact--label">'+(x.image?'<img class="discover-thumb" loading="lazy" src="'+esc(x.image)+'" alt="">':'')+'<small>'+esc(x.kicker)+'</small><b>'+esc(x.title)+'</b><span>'+esc(x.sub)+'</span>'+(x.href?'<a class="btn-secondary" href="'+esc(x.href)+'">'+esc(x.action)+' →</a>':'')+'</article>').join('')+'</div>';
}
