import { photoCredit } from './photo-credit.js';
import previews from '../../../museum/entry-catalog.json' with {type:'json'};
import { loadPublicCatalog } from '../engine/catalog.js';
// ui/discover.js — lightweight editorial discovery. Loads public JSON only on intent.
// Canonical founding-room identity comes from world/konam/rooms-v1.json.
// 3D remains explicit optional depth; this surface must never create a second room or style authority.
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let foundingRoomsPromise=null;
const loadFoundingRooms=()=>foundingRoomsPromise||(foundingRoomsPromise=Promise.all([
  fetch('world/konam/rooms-v1.json',{credentials:'omit'}).then(response=>{if(!response.ok)throw new Error('Room registry unavailable');return response.json();}),
  fetch('world/konam/founding-runtime-v1.json',{credentials:'omit'}).then(response=>{if(!response.ok)throw new Error('Room bridge unavailable');return response.json();}),
]).then(([roomRegistry,roomRuntime])=>{
  const routeByRoom=new Map((roomRuntime.routes||[]).map(route=>[route.room_id,route]));
  const rooms=(roomRegistry.rooms||[]).filter(room=>room.group==='foundation'&&room.launch_visible===true).map((room,index)=>({
    ...room,
    ordinal:String(index+1).padStart(2,'0'),
    route:routeByRoom.get(room.id)||null,
  }));
  if(rooms.length!==14||rooms.some(room=>!room.route))throw new Error('Canonical founding rooms are incomplete');
  return rooms;
}).catch(error=>{foundingRoomsPromise=null;throw error;}));
export async function renderDiscoverSurface(root,{enter,openSurface}={}){
  const foundingRooms=await loadFoundingRooms();
  const roomOptions=foundingRooms.map(room=>'<option data-canonical-room-option value="'+esc(room.id)+'">'+esc(room.ordinal)+' · '+esc(room.name)+'</option>').join('');
  root.innerHTML=
    '<section class="kona-hero-card artifact artifact--hero"><small>DISCOVER</small><h3>Pick a thread.<br>Go as deep as you want.</h3>'+
      '<p>Rooms, machines, people, stories and places. Useful in 2D. Immersive when you choose 3D.</p></section>'+
    '<section class="kona-section artifact artifact--label" aria-label="Discover lanes"><div class="kona-section-head"><h3>Where to?</h3><small>FOUR LANES</small></div>'+
      '<div class="ui-cluster"><button class="btn-secondary" type="button" data-discover-jump="rooms">Rooms</button><button class="btn-secondary" type="button" data-discover-jump="machines">Machines</button><button class="btn-secondary" type="button" data-discover-surface="feed">People & stories</button><button class="btn-secondary" type="button" data-discover-surface="travel">Places</button></div></section>'+
    '<section class="kona-section artifact artifact--label" data-canonical-rooms><div class="kona-section-head"><div><small>THE FOUNDING WORLD</small><h3>14 rooms. All open.</h3></div><span class="t-data">14/14 OPEN</span></div>'+
      '<p>Choose a room to explore. Each destination tells you whether it opens a page or takes you into 3D.</p>'+
      '<nav class="ui-grid discover-room-index" aria-label="Founding room directory">'+foundingRooms.map(room=>'<button type="button" class="btn-secondary" data-room-choice="'+esc(room.id)+'"><small>'+room.ordinal+' · '+(room.route.action.kind==='world'?'3D WALK':'PAGE')+'</small><b>'+esc(room.name)+'</b></button>').join('')+'</nav>'+
      '<label class="ui-field"><span>Choose a founding room</span><select class="ui-select" data-canonical-room-select>'+roomOptions+'</select></label>'+
      '<div data-canonical-room-focus aria-live="polite"></div></section>'+
    '<section class="kona-section artifact artifact--label" data-discover-feed><div class="kona-section-head"><h3>Loading machines</h3><small>PUBLIC DATA</small></div></section>'+
    '<section class="kona-section artifact artifact--label"><div class="kona-section-head"><h3>Whole world</h3><small>OPTIONAL 3D</small></div>'+
      '<p>Enter the spatial world when you want to wander. Discover remains useful without it.</p><button class="kona-primary" type="button" data-enter-world>Enter the world <span>→</span></button></section>';
  root.querySelector('[data-enter-world]')?.addEventListener('click',()=>enter?.());
  root.querySelector('[data-discover-surface="feed"]')?.addEventListener('click',()=>openSurface?.('feed'));
  root.querySelector('[data-discover-surface="travel"]')?.addEventListener('click',()=>openSurface?.('travel'));
  root.querySelector('[data-discover-jump="rooms"]')?.addEventListener('click',()=>root.querySelector('[data-canonical-rooms]')?.scrollIntoView({block:'start',behavior:'smooth'}));
  root.querySelector('[data-discover-jump="machines"]')?.addEventListener('click',()=>root.querySelector('[data-discover-feed]')?.scrollIntoView({block:'start',behavior:'smooth'}));

  const select=root.querySelector('[data-canonical-room-select]');
  const focus=root.querySelector('[data-canonical-room-focus]');
  const renderRoom=id=>{
    const room=foundingRooms.find(item=>item.id===id)||foundingRooms[0],route=room?.route;
    if(!room||!route||!focus)return;
    focus.dataset.roomId=room.id;
    focus.innerHTML=
      '<div class="kona-section-head"><div><small>ROOM '+esc(room.ordinal)+' · FOUNDING</small><h3>'+esc(room.name)+'</h3></div><span class="t-data">OPEN</span></div>'+
      '<p>'+esc(route.description)+'</p>'+
      '<p class="kona-source-note">'+(route.action.kind==='world'?'Explore in 3D. Use the main navigation to return to a page.':'Opens a page in Kona.m. Your main navigation stays available.')+'</p>'+
      '<button class="kona-primary" type="button" data-canonical-room-depth="'+esc(room.id)+'">'+esc(route.action.label)+' <span>→</span></button>';
    focus.querySelector('[data-canonical-room-depth]')?.addEventListener('click',()=>{
      if(route.action.kind==='world')enter?.(route.action.target);
      else openSurface?.(route.action.target);
    });
  };
  select?.addEventListener('change',()=>renderRoom(select.value));
  root.querySelectorAll('[data-room-choice]').forEach(button=>button.addEventListener('click',()=>{
    select.value=button.dataset.roomChoice;renderRoom(select.value);focus.scrollIntoView({block:'start',behavior:'instant'});focus.querySelector('button')?.focus({preventScroll:true});
  }));
  renderRoom(select?.value||foundingRooms[0]?.id);

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
  feed.innerHTML='<div class="kona-section-head"><h3>Machines + places</h3><small>'+items.length+' THINGS</small></div>'+
    '<div class="kona-discover-feed">'+items.map(x=>'<article class="artifact artifact--label">'+(x.image?'<img class="discover-thumb" loading="lazy" src="'+esc(x.image)+'" alt="">':'')+'<small>'+esc(x.kicker)+'</small><b>'+esc(x.title)+'</b><span>'+esc(x.sub)+'</span>'+(x.href?'<a class="btn-secondary" href="'+esc(x.href)+'">'+esc(x.action)+' →</a>':'')+'</article>').join('')+'</div>';
}
