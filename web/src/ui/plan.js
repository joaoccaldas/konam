// ui/plan.js — lightweight 2D race-week planning surface.
// Uses app/entry-data.json only. It must not require museum globals or Three.js.
import { loadCompanion, safeURL } from './companion-data.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const fmtDate = iso => {
  const d = new Date(String(iso || '') + 'T12:00:00');
  return Number.isNaN(d.valueOf())
    ? String(iso || '')
    : new Intl.DateTimeFormat('en',{month:'short',day:'numeric'}).format(d);
};

export function weatherObservation(data,now=Date.now()){
  const p=data?.properties,at=Date.parse(p?.timestamp||'');
  const value=p?.temperature?.value,unit=p?.temperature?.unitCode;
  if(!Number.isFinite(at)||at>now+300000||now-at>3*3600000||typeof value!=='number'||!Number.isFinite(value)||unit!=='wmoUnit:degC')return null;
  return {c:Math.round(value),f:Math.round(value*9/5+32),description:String(p.textDescription||'Conditions at KOA').slice(0,160),wind:typeof p.windSpeed?.value==='number'&&Number.isFinite(p.windSpeed.value)&&p.windSpeed.unitCode==='wmoUnit:km_h'?Math.round(p.windSpeed.value):null,at:p.timestamp};
}
const external=(url,label)=>safeURL(url)?'<a class="btn-text" href="'+esc(safeURL(url))+'" target="_blank" rel="noopener noreferrer">'+esc(label)+' ↗</a>':'';
const note=text=>'<p class="kona-intern-note"><small>THE INTERN</small> '+esc(text)+'</p>';

export function renderPlanSurface(root,{data={}}={}) {
  const week = Array.isArray(data.race_week) ? data.race_week : [];
  const places = Array.isArray(data.places) ? data.places : [];
  const event = data.event || {};

  const days = week.map(x =>
    '<article><time>'+esc(fmtDate(x.date))+'</time><div><b>'+esc(x.kind === 'expo' ? 'IRONMAN Expo' : x.kind || 'Race week')+'</b><span>'+esc(x.start)+'–'+esc(x.end)+' · '+esc(x.venue)+'</span></div></article>'
  ).join('');

  const cards = places.map(p =>
    '<article><small>'+esc(p.region)+'</small><b>'+esc(p.name)+'</b><span>'+esc(p.purpose)+'</span>'+(p.visit_with_care?'<em>Visit with care</em>':'')+'</article>'
  ).join('');

  const eventLine = [event.date ? fmtDate(event.date) : '', event.venue || event.location || ''].filter(Boolean).join(' · ');

  root.innerHTML =
    '<section class="kona-section first artifact artifact--label"><div class="kona-section-head"><h3>What matters most</h3><small>Your Kona arrival brief</small></div><p>Weather, arrival, race week and the official places to check before you head out.</p>'+note('You are going to Kona. Excellent. Please also know how you are leaving the airport.')+'</section>'+
    '<div class="ui-grid kona-travel-brief">'+
      '<section class="kona-section artifact artifact--label"><img class="kona-brief-thumbnail" src="assets/kona-years/kailua-bay.jpg" alt="Kailua Bay in Kona" width="640" height="360" loading="lazy"><div class="kona-section-head"><h3>Weather & ocean</h3><small>National Weather Service</small></div><p data-kona-weather role="status">Checking the latest KOA observation…</p>'+note('The ocean does not know your training plan. Read the forecast before making it a personality test.')+'<p>Airport conditions describe KOA. Check the local forecast and marine advisories for your destination.</p><div class="ui-cluster">'+external('https://forecast.weather.gov/MapClick.php?lat=19.64&lon=-155.997','Kailua-Kona forecast')+external('https://www.weather.gov/hfo/','Hawaiʻi advisories')+'</div></section>'+
      '<section class="kona-section artifact artifact--bib"><p class="eyebrow">ELLISON ONIZUKA KONA INTERNATIONAL</p><h3>Land at KOA</h3><p>Hawaiʻi Island · Kona International Airport</p>'+note('KOA. Three letters. Your bike box should arrive at the same three letters. Confirm this with the airline.')+'<div data-kona-arrival-links class="ui-stack">'+external('https://www.flightaware.com/live/airport/PHKO','Arrivals & departures · FlightAware')+external('https://airports.hawaii.gov/koa/flights/airlines/','Find your airline')+external('https://airports.hawaii.gov/koa/airport-map/','Official terminal map')+external('https://airports.hawaii.gov/koa/getting-to-from/','Ground transport')+'</div><p class="kona-source-note">The current flight board opens with FlightAware. Confirm delays, baggage and pickup details with your airline.</p></section>'+
      '<section class="kona-section artifact artifact--label"><img class="kona-brief-thumbnail" src="assets/kona-years/queen-k.jpg" alt="Queen Kaʻahumanu Highway on Hawaiʻi Island" width="640" height="360" loading="lazy"><div class="kona-section-head"><h3>Get your bearings</h3><small>Island time · HST</small></div><p>Hawaiʻi uses UTC−10. Plan your airport pickup, first night and onward transport before landing.</p>'+note('Book the boring part. Then you may become a very interesting person on Aliʻi Drive.')+'<div class="ui-stack">'+external('https://airports.hawaii.gov/koa/getting-to-from/','Airport transport options')+external('https://hidot.hawaii.gov/highways/roadwork/hawaii/','Official roadwork notices')+external('https://www.gohawaii.com/islands/hawaii-big-island','Official Hawaiʻi Island guide')+'</div></section>'+
    '</div>'+
    '<section class="kona-section artifact artifact--label"><div class="kona-section-head"><h3>Go straight to the source</h3><small>Official websites & social</small></div>'+note('My first day here. The organisers have been doing this considerably longer. Their updates win.')+'<div class="ui-cluster">'+external('https://www.ironman.com/races/im-world-championship','IRONMAN World Championship')+external('https://www.ironman.com/proseries','Official race coverage')+external('https://www.youtube.com/@ironmantriathlon','IRONMAN · YouTube')+external('https://www.instagram.com/ironmantri/','IRONMAN · Instagram')+external('https://airports.hawaii.gov/koa/','Official KOA website')+'</div></section>'+
    '<section class="kona-section first artifact artifact--label"><div class="kona-section-head"><h3>Race week</h3><small>Official 2026 expo schedule · HST</small></div>'+
      (eventLine?'<p class="kona-source-note">'+esc(eventLine)+'</p>':'')+
      '<div class="kona-timeline">'+(days || '<article><div><b>Race-week details are being verified.</b><span>No museum load required.</span></div></article>')+'</div></section>'+
    '<section class="kona-section artifact artifact--label"><div class="kona-section-head"><h3>Places worth your time</h3><small>Local-first planning</small></div><div class="kona-place-grid">'+
      (cards || '<article><b>Place notes are being prepared.</b><span>Only lightweight verified data appears here.</span></article>')+
    '</div></section>'+
    '<p class="kona-source-note">'+external('https://expo.ironman.com/ironman-world-championship-kona-expo','Confirm the expo schedule')+' Operational race information is shown only from current 2026 official sources. Older athlete guides and course maps remain reference-only.</p>';

  const controller=new AbortController();
  const weather=root.querySelector('[data-kona-weather]');
  const timeout=setTimeout(()=>controller.abort(),5000);
  fetch('https://api.weather.gov/stations/PHKO/observations/latest',{signal:controller.signal,credentials:'omit',headers:{Accept:'application/geo+json'}})
    .then(r=>{if(!r.ok)throw new Error('Weather unavailable');return r.json();})
    .then(data=>{const observation=weatherObservation(data);if(!observation)throw new Error('Observation is stale');if(!weather.isConnected)return;
      const at=new Intl.DateTimeFormat('en',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'Pacific/Honolulu'}).format(new Date(observation.at));
      weather.textContent=observation.c+' °C / '+observation.f+' °F · '+observation.description+(observation.wind==null?'':' · Wind '+observation.wind+' km/h at KOA')+' · Observed '+at+' HST at KOA';
    }).catch(()=>{if(weather.isConnected)weather.textContent='Current observation unavailable. Open the NWS forecast for the latest conditions.';}).finally(()=>clearTimeout(timeout));
  loadCompanion('travel',{signal:controller.signal}).then(guide=>{
    if(!root.isConnected)return;
    const links=(guide.links||[]).filter(x=>['flights','airlines','airport-guide'].includes(x.id));
    const host=root.querySelector('[data-kona-arrival-links]');
    if(host&&links.length)host.innerHTML=links.map(x=>external(x.url,x.name)).join('')+external('https://airports.hawaii.gov/koa/airport-map/','Official terminal map');
  }).catch(()=>{});
  return ()=>{clearTimeout(timeout);controller.abort();};
}
