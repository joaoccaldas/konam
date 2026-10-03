// ui/plan.js — visual, lightweight race-week cockpit.
// Uses entry-data + companion travel only. No museum globals or Three.js.
import { loadCompanion, safeURL } from './companion-data.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
const fmtDate=iso=>{const d=new Date(String(iso||'')+'T12:00:00');return Number.isNaN(d.valueOf())?String(iso||''):new Intl.DateTimeFormat('en',{month:'short',day:'numeric'}).format(d);};
const daysUntil=iso=>{const t=Date.parse(String(iso||'')+'T12:00:00');return Number.isFinite(t)?Math.max(0,Math.ceil((t-Date.now())/86400000)):null;};
const external=(url,label,cls='plan-link')=>safeURL(url)?'<a class="'+cls+'" href="'+esc(safeURL(url))+'" target="_blank" rel="noopener noreferrer">'+esc(label)+' <span aria-hidden="true">↗</span></a>':'';
const intern=text=>'<p class="plan-intern"><span>THE INTERN</span>'+esc(text)+'</p>';

export function weatherObservation(data,now=Date.now()){
  const p=data?.properties,at=Date.parse(p?.timestamp||''),value=p?.temperature?.value,unit=p?.temperature?.unitCode;
  if(!Number.isFinite(at)||at>now+300000||now-at>3*3600000||typeof value!=='number'||!Number.isFinite(value)||unit!=='wmoUnit:degC')return null;
  return {c:Math.round(value),f:Math.round(value*9/5+32),description:String(p.textDescription||'Conditions at KOA').slice(0,160),wind:typeof p.windSpeed?.value==='number'&&Number.isFinite(p.windSpeed.value)&&p.windSpeed.unitCode==='wmoUnit:km_h'?Math.round(p.windSpeed.value):null,at:p.timestamp};
}

export function renderPlanSurface(root,{data={}}={}){
  const week=Array.isArray(data.race_week)?data.race_week:[];
  const places=Array.isArray(data.places)?data.places:[];
  const event=data.event||{};
  const raceDays=event.date?daysUntil(event.date):null;
  const next=week.map(x=>({...x,ts:Date.parse(String(x.date||'')+'T'+String(x.start||'00:00')+':00')})).filter(x=>Number.isFinite(x.ts)&&x.ts>=Date.now()-3600000).sort((a,b)=>a.ts-b.ts)[0]||week[0];
  const countdown=raceDays==null?'Race week':raceDays===0?'Race day':raceDays===1?'1 day':' '+raceDays+' days';
  const eventPlace=event.venue||event.location||'Kailua-Kona';

  const timeline=week.map((x,i)=>'<article class="plan-day'+(i===0?' is-first':'')+'"><time datetime="'+esc(x.date)+'"><b>'+esc(fmtDate(x.date))+'</b><span>'+esc(x.start)+'–'+esc(x.end)+'</span></time><div><strong>'+esc(x.kind==='expo'?'IRONMAN Expo':x.kind||'Race week')+'</strong><span>'+esc(x.venue)+'</span></div></article>').join('');
  const placeCards=places.slice(0,6).map(p=>'<article class="plan-place"><small>'+esc(p.region)+'</small><h4>'+esc(p.name)+'</h4><p>'+esc(p.purpose)+'</p>'+(p.visit_with_care?'<em>Visit with care</em>':'')+'</article>').join('');

  root.innerHTML=
    '<div class="plan-cockpit">'+
      '<section class="plan-hero">'+
        '<img src="assets/kona-years/queen-k.jpg" alt="" aria-hidden="true" loading="lazy" decoding="async">'+
        '<div class="plan-hero-shade"></div>'+
        '<div class="plan-hero-copy"><small>RACE WEEK · HST</small><h3>'+esc(countdown)+'</h3><p>'+esc(eventPlace)+'</p><div class="plan-hero-actions">'+external('https://www.ironman.com/races/im-world-championship','Official race page','plan-primary')+external('https://forecast.weather.gov/MapClick.php?lat=19.64&lon=-155.997','Forecast','plan-secondary')+'</div></div>'+
      '</section>'+

      '<section class="plan-priority" aria-label="What matters now">'+
        '<article class="plan-priority-card plan-weather"><small>WEATHER · KOA</small><b data-kona-weather-temp>—</b><span data-kona-weather>Checking latest observation…</span><div>'+external('https://www.weather.gov/hfo/','Advisories')+'</div></article>'+
        '<article class="plan-priority-card"><small>NEXT</small><b>'+(next?esc(fmtDate(next.date)):'Race week')+'</b><span>'+(next?esc((next.kind==='expo'?'Expo':next.kind||'Race week')+' · '+next.start+' · '+next.venue):'Official schedule')+'</span><div>'+external('https://expo.ironman.com/ironman-world-championship-kona-expo','Confirm schedule')+'</div></article>'+
        '<article class="plan-priority-card"><small>ARRIVAL · KOA</small><b>Bike box?</b><span>Airline, pickup and ground transport before landing.</span><div>'+external('https://airports.hawaii.gov/koa/getting-to-from/','Ground transport')+'</div></article>'+
      '</section>'+

      intern('You do not need twenty tabs open. Weather, airport, schedule. Then go be an athlete.')+

      '<section class="plan-block">'+
        '<div class="plan-block-head"><div><small>RACE WEEK</small><h3>Your week at a glance</h3></div><span>'+esc(event.date?fmtDate(event.date):'2026')+'</span></div>'+
        '<div class="plan-timeline">'+(timeline||'<p class="plan-empty">Race-week details are being verified.</p>')+'</div>'+
      '</section>'+

      '<section class="plan-arrival">'+
        '<div class="plan-block-head"><div><small>LAND AT KOA</small><h3>Arrival without drama</h3></div><span>UTC−10</span></div>'+
        '<div class="plan-arrival-grid">'+
          '<article><span class="plan-number">01</span><div><b>Confirm the flight</b><p>Check delays and make sure the bike box is on the same journey.</p>'+external('https://www.flightaware.com/live/airport/PHKO','Arrivals & departures')+external('https://airports.hawaii.gov/koa/flights/airlines/','Airlines')+'</div></article>'+
          '<article><span class="plan-number">02</span><div><b>Know the exit</b><p>Pickup, rental car, transfer or taxi. Decide before the carousel starts rotating.</p><div data-kona-arrival-links>'+external('https://airports.hawaii.gov/koa/getting-to-from/','Transport')+external('https://airports.hawaii.gov/koa/airport-map/','Terminal map')+'</div></div></article>'+
        '</div>'+
      '</section>'+

      '<section class="plan-block">'+
        '<div class="plan-block-head"><div><small>LOCAL</small><h3>Places worth your time</h3></div><span>Less wandering</span></div>'+
        '<div class="plan-places">'+(placeCards||'<p class="plan-empty">Useful place notes are being prepared.</p>')+'</div>'+
      '</section>'+

      '<details class="plan-sources"><summary><span>Official sources</span><small>Race · airport · roads · island</small></summary><div class="plan-source-grid">'+
        external('https://www.ironman.com/races/im-world-championship','IRONMAN World Championship')+
        external('https://www.ironman.com/proseries','Official race coverage')+
        external('https://www.youtube.com/@ironmantriathlon','IRONMAN · YouTube')+
        external('https://www.instagram.com/ironmantri/','IRONMAN · Instagram')+
        external('https://airports.hawaii.gov/koa/','Official KOA website')+
        external('https://hidot.hawaii.gov/highways/roadwork/hawaii/','Roadwork notices')+
        external('https://www.gohawaii.com/islands/hawaii-big-island','Hawaiʻi Island guide')+
      '</div><p>Operational race information is shown from current 2026 official sources. Confirm last-minute changes with the organiser, airline or local authority.</p></details>'+
    '</div>';

  const controller=new AbortController(),weather=root.querySelector('[data-kona-weather]'),temperature=root.querySelector('[data-kona-weather-temp]');
  const timeout=setTimeout(()=>controller.abort(),5000);
  fetch('https://api.weather.gov/stations/PHKO/observations/latest',{signal:controller.signal,credentials:'omit',headers:{Accept:'application/geo+json'}})
    .then(r=>{if(!r.ok)throw new Error('Weather unavailable');return r.json();})
    .then(payload=>{const o=weatherObservation(payload);if(!o)throw new Error('Observation is stale');if(!weather?.isConnected)return;
      const at=new Intl.DateTimeFormat('en',{hour:'numeric',minute:'2-digit',timeZone:'Pacific/Honolulu'}).format(new Date(o.at));
      if(temperature)temperature.textContent=o.c+'°';
      weather.textContent=o.description+(o.wind==null?'':' · '+o.wind+' km/h wind')+' · '+at+' HST';
    }).catch(()=>{if(weather?.isConnected){if(temperature)temperature.textContent='KOA';weather.textContent='Live observation unavailable. Open the official forecast.';}}).finally(()=>clearTimeout(timeout));

  loadCompanion('travel',{signal:controller.signal}).then(guide=>{
    if(!root.isConnected)return;
    const links=(guide.links||[]).filter(x=>['flights','airlines','airport-guide'].includes(x.id));
    const host=root.querySelector('[data-kona-arrival-links]');
    if(host&&links.length)host.innerHTML=links.slice(0,3).map(x=>external(x.url,x.name)).join('');
  }).catch(()=>{});

  return()=>{clearTimeout(timeout);controller.abort();};
}
