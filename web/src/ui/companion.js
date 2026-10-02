import {sourceManager} from './companion-manager.js';
import {subscriptions,liveSubscriptions,travelPlaces,saveTravelPlaces} from './companion-subscriptions.js';
import {escapeHTML as esc,safeURL,sourceState,filterFeed,formatDate,loadCompanion} from './companion-data.js';
const labels={news:'Triathlon',video:'Athlete videos',kona:'Island news'};
const external=(url,label,cls='')=>safeURL(url)?'<a class="'+cls+'" href="'+esc(safeURL(url))+'" target="_blank" rel="noopener noreferrer">'+esc(label)+' <span aria-hidden="true">↗</span></a>':'';
const heading=(kicker,title,description)=>'<header class="companion-hero"><small>'+kicker+'</small><h3>'+title+'</h3><p>'+description+'</p></header>';
const error=(node,retry)=>{node.innerHTML='<div class="companion-empty" role="status"><h4>Quick pit stop.</h4><p>This page could not load. Reconnect and try again; your Studio is still ready.</p><button class="companion-button" data-retry>Try again</button></div>';node.querySelector('[data-retry]').onclick=retry;};

export function renderFeed(root,{back,scope='feed',compact=false}={}){
 const controller=new AbortController();
 root.innerHTML='<section class="companion-page" aria-label="'+(compact?'Island updates':'Triathlon Feed')+'">'+(compact?'<h4 class="companion-section-title">The island, in the loop.</h4>':'<button class="companion-back" data-back>← User Studio</button>'+heading('THE FEED · SWIM / BIKE / SCROLL','Your rest-day rabbit hole.','Triathlon headlines, athlete cameras and life on the island. Straight from the source.'))+
 '<div class="companion-tools"><a href="integrations/companion/rss.xml" data-personal-rss class="companion-button">Subscribe via RSS ↗</a><button class="companion-button" data-refresh>Refresh feed</button></div><div data-subscriptions></div><div data-feed-content aria-live="polite"><p>Gathering the good stuff…</p></div></section>';
 const page=root.firstElementChild,content=page.querySelector('[data-feed-content]');if(page.querySelector('[data-back]'))page.querySelector('[data-back]').onclick=back;
 let loadRequest=0;let data,fallback,managed=false,kind='all',source='all',query='',limit=18;
 function render(){
  const rows=filterFeed(data,{kind,source,query}),map=new Map(data.sources.map(s=>[s.id,s]));
  page.querySelector('[data-results]').innerHTML=rows.slice(0,limit).map(item=>{
   const publisher=map.get(item.source_id),state=sourceState(publisher);
   const thumb=item.kind==='video'&&/^https:\/\/i\.ytimg\.com\/vi\/[\w-]{11}\/hqdefault\.jpg$/.test(item.thumbnail||'')?'<img src="'+esc(item.thumbnail)+'" loading="lazy" decoding="async" alt="" width="480" height="360" referrerpolicy="no-referrer">':'';
   return '<article class="companion-story'+(thumb?' has-image':'')+'">'+(thumb?'<a class="companion-thumbnail" href="'+esc(safeURL(item.url))+'" target="_blank" rel="noopener noreferrer" tabindex="-1" aria-hidden="true">'+thumb+'<span>Play on YouTube ↗</span></a>':'')+'<div><p class="companion-meta">'+esc(publisher.name)+' · <time datetime="'+esc(item.published_at)+'">'+esc(formatDate(item.published_at))+'</time>'+(state!=='ok'?' · Saved update':'')+'</p><h4>'+external(item.url,item.title)+'</h4><small>'+esc(labels[item.kind]||'Story')+'</small></div></article>';
  }).join('')||'<div class="companion-empty"><h4>Nothing in this lane yet.</h4><p>Try another source or clear your search.</p></div>';
  page.querySelector('[data-result-count]').textContent=rows.length+' '+(rows.length===1?'story':'stories');
  page.querySelector('[data-more]').hidden=rows.length<=limit;
 }
 async function load(){
  const request=++loadRequest;
  const refresh=page.querySelector('[data-refresh]');refresh.disabled=true;
  try{
   fallback ||= await loadCompanion('feed',{signal:controller.signal});
   const defaults=scope==='travel'?fallback.sources.filter(s=>s.kind==='kona'):fallback.sources;
   if(!managed){sourceManager(page.querySelector('[data-subscriptions]'),{scope,defaults,signal:controller.signal,onChange:()=>{source='all';load();}});managed=true;}
   const next=await liveSubscriptions(scope,subscriptions(scope,defaults),fallback,controller.signal);if(controller.signal.aborted||request!==loadRequest)return;data=next;
   const hero=page.querySelector('.companion-hero'),latest=data.items.find(i=>i.kind==='video'&&/^https:\/\/i\.ytimg\.com\/vi\/[\w-]{11}\/hqdefault\.jpg$/.test(i.thumbnail||''));
   hero?.querySelector('.companion-lead')?.remove();
   if(hero&&latest)hero.insertAdjacentHTML('beforeend','<a class="companion-lead" href="'+esc(safeURL(latest.url))+'" target="_blank" rel="noopener noreferrer"><img src="'+esc(latest.thumbnail)+'" alt="" loading="lazy" width="480" height="360"><span>Latest from your athletes ↗</span><b>'+esc(latest.title)+'</b></a>');
   const stale=[...new Set([...data.sources.filter(s=>sourceState(s)!=='ok').map(s=>s.feed_url),...(data.errors||[]).map(e=>e.requested_url)])];
   content.innerHTML='<p class="companion-freshness">'+(data.offline?'Offline copy · ':'')+'Updated '+esc(formatDate(data.checked_at))+' · '+esc(new Intl.DateTimeFormat('en',{hour:'numeric',minute:'2-digit',timeZone:'Pacific/Honolulu'}).format(new Date(data.checked_at)))+' HST. '+(stale.length?stale.length+' source'+(stale.length===1?'':'s')+' delayed; saved items keep their original dates.':'Refresh for new stories. Updates may be up to 10 minutes old.')+'</p>'+
    '<div class="companion-filters" role="group" aria-label="Feed categories">'+[['all','All'],['news','Triathlon'],['video','Athletes'],['kona','Kona & island']].map(([id,label])=>'<button data-kind="'+id+'" aria-pressed="'+(kind===id)+'">'+label+'</button>').join('')+'</div>'+
    '<details class="companion-find"><summary>Search & filter sources</summary><div class="companion-search"><label>Find a story<input type="search" data-search placeholder="Athlete, race, coffee…" value="'+esc(query)+'"></label><label>Source<select data-source><option value="all">All sources</option>'+data.sources.map(s=>'<option value="'+esc(s.id)+'"'+(source===s.id?' selected':'')+'>'+esc(s.name)+'</option>').join('')+'</select></label></div></details>'+
    '<p class="companion-meta" data-result-count role="status"></p><div class="companion-feed" data-results></div><button class="companion-button" data-more>One more lap · more stories</button>'+
    '<details class="companion-sources"><summary>Sources & update status</summary><p>Athlete channels are curated. Inclusion does not confirm a current Kona start or presence on the island. Videos open on YouTube; nothing autoplays here.</p>'+data.sources.map(s=>'<div>'+external(s.website,s.name)+'<small>'+esc(s.note||'')+' · '+(sourceState(s)==='ok'?'Checked':'Delayed')+' · Last success '+esc(formatDate(s.last_success_at))+'</small></div>').join('')+'</details>';
   content.querySelectorAll('[data-kind]').forEach(b=>b.onclick=()=>{kind=b.dataset.kind;limit=18;content.querySelectorAll('[data-kind]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));render();});
   content.querySelector('[data-search]').oninput=e=>{query=e.target.value;limit=18;render();};
   content.querySelector('[data-source]').onchange=e=>{source=e.target.value;limit=18;render();};
   content.querySelector('[data-more]').onclick=()=>{limit+=18;render();};render();
  }catch(e){if(e.name!=='AbortError')error(content,load);}finally{if(request===loadRequest)refresh.disabled=false;}
 }
 page.querySelector('[data-refresh]').onclick=load;load();return ()=>controller.abort();
}

export function renderTravel(root,{back}={}){
 const controller=new AbortController();let disposeFeed=null;
 root.innerHTML='<section class="companion-page" aria-label="Travel to Kona"><button class="companion-back" data-back>← User Studio</button>'+heading('TRAVEL · KAILUA-KONA','Less logistics.<br>More aloha.','Land, find your bearings, support local. Your island pit crew starts here.')+'<div data-travel-content><p>Unpacking the island guide…</p></div></section>';
 const page=root.firstElementChild,content=page.querySelector('[data-travel-content]');page.querySelector('[data-back]').onclick=back;
 async function load(){
  try{
   const data=await loadCompanion('travel',{signal:controller.signal});if(controller.signal.aborted)return;
   const clock=new Intl.DateTimeFormat('en',{hour:'numeric',minute:'2-digit',timeZone:'Pacific/Honolulu'}).format(new Date());
   content.innerHTML='<div class="companion-arrival artifact artifact--bib"><div><small>YOUR DESTINATION</small><strong>KOA</strong><span>Kona International Airport</span></div><div><small>ISLAND TIME</small><b>'+esc(clock)+' HST</b><span>Hawaiʻi · UTC−10</span></div></div>'+
    '<h4 class="companion-section-title">Before you head out</h4><p class="companion-note">Flight status and traffic open with the named provider for current conditions. This page does not display a live flight board or live traffic readings.</p><div class="companion-utilities">'+data.links.map(link=>'<article><small>'+esc(link.category)+'</small><h5>'+external(link.url,link.name)+'</h5><p>'+esc(link.description)+'</p><span>'+esc(link.publisher)+' · '+(link.mode==='external-live'?'Live view opens externally':'Official source')+'</span></article>').join('')+'</div>'+
    '<h4 class="companion-section-title">Meet the neighborhood</h4><p class="companion-note">Good stops for your bike, your breakfast and your people. Check opening hours and availability directly before visiting.</p>'+
    '<div class="companion-filters" role="group" aria-label="Place categories">'+[['all','All stops'],['bike-service','Bike help'],['coffee','Coffee & food'],['ocean','Ocean time']].map(([id,label])=>'<button data-place-filter="'+id+'" aria-pressed="'+(id==='all')+'">'+label+'</button>').join('')+'</div><div class="companion-places" data-places></div>'+
    '<p class="companion-note">These listings are independent, not endorsements or confirmed partnerships. Hawaiʻi is home: respect local access rules, people and places. Directory reviewed '+esc(formatDate(data.verified_at))+'.</p><details class="companion-manager"><summary>Add your own stop <span>+</span></summary><form class="companion-place-form"><label>Place name<input name="name" required maxlength="80" placeholder="Your favorite coffee stop"></label><label>Website<input type="url" name="url" required maxlength="1200" placeholder="https://…"></label><button class="companion-button">Save stop</button></form><p data-place-status role="status"></p><div data-custom-places></div></details><div data-island-feed></div>';
   const draw=filter=>{page.querySelector('[data-places]').innerHTML=data.places.filter(p=>filter==='all'||p.categories.includes(filter)).map(p=>'<article class="companion-place"><small>'+esc(p.type==='local_business'?'LOCAL BUSINESS':'ORIENTATION STOP')+'</small><h5>'+esc(p.name)+'</h5><p>'+esc(p.notes.join(' · '))+'</p><address>'+esc(p.address)+'</address><div>'+external(p.website,'Visit website','companion-button')+external('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(p.name+' '+p.address),'Directions','companion-button')+'</div><small>Source checked '+esc(formatDate(p.source?.verified_at))+(p.commercial?' · Commercial relationship':'')+'</small></article>').join('')||'<p>No stops in this lane yet.</p>';};
   content.querySelectorAll('[data-place-filter]').forEach(b=>b.onclick=()=>{content.querySelectorAll('[data-place-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));draw(b.dataset.placeFilter);});draw('all');
   const custom=page.querySelector('[data-custom-places]'),status=page.querySelector('[data-place-status]');
   const drawCustom=()=>{custom.innerHTML=travelPlaces().map((p,i)=>'<div class="companion-subscription">'+external(p.url,p.name)+'<button data-remove-place="'+i+'" type="button">Remove</button></div>').join('');custom.querySelectorAll('[data-remove-place]').forEach(b=>b.onclick=()=>{if(saveTravelPlaces(travelPlaces().filter((_,i)=>i!==Number(b.dataset.removePlace))))drawCustom();else status.textContent='Could not save this change.';});};
   page.querySelector('.companion-place-form').onsubmit=e=>{e.preventDefault();const form=e.currentTarget,url=safeURL(form.elements.url.value),name=form.elements.name.value.trim(),places=travelPlaces();if(!url||!name){status.textContent='Add a name and a public HTTPS website.';return;}if(places.length>=20){status.textContent='Your bag is full: remove a stop before adding another.';return;}if(places.some(p=>p.url===url)){status.textContent='Already saved.';return;}if(saveTravelPlaces([...places,{name,url}])){form.reset();drawCustom();status.textContent='Saved on this device. Your own stops are not verified listings.';}else status.textContent='Storage is full. This stop has not been saved.';};drawCustom();
   disposeFeed?.();disposeFeed=renderFeed(page.querySelector('[data-island-feed]'),{scope:'travel',compact:true});
  }catch(e){if(e.name!=='AbortError')error(content,load);}
 }
 load();return ()=>{controller.abort();disposeFeed?.();};
}
