import { photoCredit } from './photo-credit.js';
import previews from '../../../museum/entry-catalog.json' with {type:'json'};
import roomRegistry from '../../../world/konam/rooms-v1.json' with {type:'json'};
import roomRuntime from '../../../world/konam/founding-runtime-v1.json' with {type:'json'};
import { loadPublicCatalog } from '../engine/catalog.js';
// ui/discover.js — lightweight editorial discovery. Loads public JSON only on intent.
// Canonical founding-room identity comes from world/konam/rooms-v1.json.
// 3D remains explicit optional depth; this surface must never create a second room or style authority.
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const category=(name,sub)=>'<article class="discover-category artifact artifact--label"><small>'+esc(name)+'</small><b>'+esc(sub)+'</b></article>';
const routeByRoom=new Map((roomRuntime.routes||[]).map(route=>[route.room_id,route]));
const foundingRooms=(roomRegistry.rooms||[]).filter(room=>room.group==='foundation'&&room.launch_visible===true).map((room,index)=>({
  ...room,
  ordinal:String(index+1).padStart(2,'0'),
  route:routeByRoom.get(room.id)||null,
}));
const themeLabel=theme=>String(theme||'world').replaceAll('-',' ');
let foundingCollectionPromise=null;
const loadFoundingCollection=()=>foundingCollectionPromise||(foundingCollectionPromise=fetch('collections/kona-141-v1.json',{credentials:'omit'})
  .then(response=>{if(!response.ok)throw new Error('Founding collection unavailable');return response.json();})
  .then(data=>{if(data?.items?.length!==141)throw new Error('Founding collection is incomplete');return data;})
  .catch(error=>{foundingCollectionPromise=null;throw error;}));

export async function renderDiscoverSurface(root,{enter,openSurface}={}){
  const roomRows=foundingRooms.map(room=>
    '<article data-canonical-room="'+esc(room.id)+'"><i>'+esc(room.ordinal)+'</i><div><b>'+esc(room.name)+'</b><span>'+esc(themeLabel(room.theme))+' · '+esc(room.founding_slots)+' founding items</span></div><button class="btn-text" type="button" data-open-canonical-room="'+esc(room.id)+'">Open room →</button></article>'
  ).join('');
  root.innerHTML=
    '<section class="kona-hero-card artifact artifact--hero"><small>DISCOVER</small><h3>Interesting things.<br>Not a floor plan.</h3>'+
    '<p>Machines, people, stories, places and rooms. The 3D world is one way deeper, not the front door.</p></section>'+
    '<section class="kona-discover-categories">'+
      category('Machines','How things are made and raced.')+
      category('People','The humans behind the equipment.')+
      category('Stories','What changed, failed, won or mattered.')+
      category('Places','Where the sport becomes real.')+
      category('Rooms','Fourteen founding rooms. Open from launch; deeper contents reveal over time.')+
    '</section>'+
    '<section class="kona-section artifact artifact--label" data-discover-feed><div class="kona-section-head"><h3>Loading the interesting bits</h3><small>PUBLIC DATA</small></div></section>'+
    '<section class="kona-section artifact artifact--label" data-discover-live><div class="kona-section-head"><div><small>PEOPLE + STORIES</small><h3>Current humans. Current signals.</h3></div><span class="t-data">SOURCE-GROUNDED</span></div>'+
      '<p>Athlete channels, triathlon reporting and island updates stay in The Feed. Kona places and practical local context stay in Travel. Discover links to those authorities instead of cloning their content.</p>'+
      '<div class="ui-cluster"><button class="btn-secondary" type="button" data-discover-surface="feed">People & stories →</button><button class="btn-secondary" type="button" data-discover-surface="travel">Places & island →</button></div></section>'+
    '<section class="kona-section artifact artifact--label" data-canonical-rooms><div class="kona-section-head"><div><small>THE FOUNDING WORLD</small><h3>14 rooms. All open.</h3></div><span class="t-data">14/14 OPEN</span></div>'+
      '<p>Room identity is canonical. Some rooms already have immersive depth; others use the useful 2D surface while their spatial version matures. You never need 3D to understand where you are.</p>'+
      '<div class="kona-list">'+roomRows+'</div></section>'+
    '<section class="kona-section artifact artifact--label" data-canonical-room-detail hidden aria-live="polite"></section>'+
    '<section class="kona-section artifact artifact--label"><div class="kona-section-head"><h3>Go deeper</h3><small>OPTIONAL 3D</small></div>'+
      '<button class="kona-primary" type="button" data-enter-world>Enter the world <span>→</span></button></section>';
  root.querySelector('[data-enter-world]')?.addEventListener('click',()=>enter?.());

  const detail=root.querySelector('[data-canonical-room-detail]');
  const openRoom=id=>{
    const room=foundingRooms.find(item=>item.id===id),route=room?.route;
    if(!room||!route||!detail)return;
    detail.hidden=false;
    detail.dataset.roomId=room.id;
    detail.innerHTML=
      '<button class="btn-text" type="button" data-close-canonical-room>← All 14 rooms</button>'+
      '<div class="kona-section-head"><div><small>ROOM '+esc(room.ordinal)+' · FOUNDING</small><h3>'+esc(room.name)+'</h3></div><span class="t-data">OPEN</span></div>'+
      '<p>'+esc(route.description)+'</p>'+
      '<p class="kona-source-note">Open from launch. Its discoveries and deeper states can reveal progressively. The optional depth below reuses the existing runtime instead of duplicating a room or renderer.</p>'+
      '<div data-founding-items><p class="kona-source-note">Opening this room’s ten founding items…</p></div>'+
      '<button class="kona-primary" type="button" data-canonical-room-depth="'+esc(room.id)+'">'+esc(route.action.label)+' <span>→</span></button>';
    detail.querySelector('[data-close-canonical-room]')?.addEventListener('click',()=>{
      detail.hidden=true;delete detail.dataset.roomId;
      root.querySelector('[data-canonical-rooms]')?.scrollIntoView({block:'start',behavior:'smooth'});
    });
    detail.querySelector('[data-canonical-room-depth]')?.addEventListener('click',()=>{
      if(route.action.kind==='world')enter?.(route.action.target);
      else openSurface?.(route.action.target);
    });
    const itemHost=detail.querySelector('[data-founding-items]');
    loadFoundingCollection().then(collection=>{
      if(detail.dataset.roomId!==room.id||!itemHost?.isConnected)return;
      const items=(collection.items||[]).filter(item=>item.room_id===room.id).sort((a,b)=>a.number-b.number);
      itemHost.innerHTML='<div class="kona-section-head"><h3>Founding items</h3><small>'+items.length+' / 10 · CANONICAL 141</small></div>'+
        '<div class="kona-list">'+items.map(item=>'<article><i>'+esc(String(item.number).padStart(3,'0'))+'</i><div><b>'+esc(item.name)+'</b><span>'+esc(item.acquisition?.method||'discover')+' · '+esc(item.rarity||'find')+'</span></div></article>').join('')+'</div>'+
        '<p class="kona-source-note">This is the canonical catalog, not a second ownership system. What you have actually found still comes from personal progression.</p>';
    }).catch(()=>{if(itemHost?.isConnected)itemHost.innerHTML='<p class="kona-source-note">The room is open. Its founding-item catalog is temporarily unavailable; no personal progress was changed.</p>';});
    detail.scrollIntoView({block:'start',behavior:'smooth'});
  };
  root.querySelectorAll('[data-open-canonical-room]').forEach(button=>button.addEventListener('click',()=>openRoom(button.dataset.openCanonicalRoom)));
  root.querySelectorAll('[data-discover-surface]').forEach(button=>button.addEventListener('click',()=>openSurface?.(button.dataset.discoverSurface)));

  const data=await loadPublicCatalog();
  const products=(data.products||[]).filter(x=>x.public!==false).slice(0,4);
  const places=(data.places||[]).slice(0,3);
  root.insertAdjacentHTML('beforeend',photoCredit());
  const feed=root.querySelector('[data-discover-feed]');
  if(!feed)return;
  const items=[
    ...products.map(p=>({kicker:p.product_type||'Machine',title:[p.brand,p.label||p.model].filter(Boolean).join(' '),sub:p.year?String(p.year):p.representation||'',image:previews.bikes.find(x=>x.id===p.id)?.image,href:'Studio.html?p='+encodeURIComponent(p.id),action:'Inspect the machine'})),
    ...places.map(p=>({kicker:'Place',title:p.label||p.name,sub:p.region||p.purpose||'',image:'assets/kona-years/kailua-bay.jpg',href:(p.source_records||[]).find(x=>/^https:\/\//.test(x)),action:'Read the source'}))
  ];
  feed.innerHTML='<div class="kona-section-head"><h3>Start anywhere</h3><small>'+items.length+' THINGS</small></div>'+
    '<div class="kona-discover-feed">'+items.map(x=>'<article class="artifact artifact--label">'+(x.image?'<img class="discover-thumb" loading="lazy" src="'+esc(x.image)+'" alt="">':'')+'<small>'+esc(x.kicker)+'</small><b>'+esc(x.title)+'</b><span>'+esc(x.sub)+'</span>'+(x.href?'<a class="btn-secondary" href="'+esc(x.href)+'">'+esc(x.action)+' →</a>':'')+'</article>').join('')+'</div>';
}
