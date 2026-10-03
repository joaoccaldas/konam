// Privacy-minimal first-party analytics for Kona.m public web.
// No cookies, account IDs, email, IP/user-agent storage, raw feedback text, or persistent visitor ID.
// A random session ID lives only for the current browser-tab/session. Native builds no-op.
const ENDPOINT='https://mtvpnoqwjpoqaiocrklq.supabase.co/functions/v1/site-analytics';
const PUBLIC_KEY='sb_publishable_lVueu3GqNcPe4Z9KsChvJw_VfmnVi5u';
const PROD=!globalThis.__NATIVE&&location.hostname==='joaoccaldas.github.io'&&location.pathname.startsWith('/konam');

const uuid=()=>{
  if(globalThis.crypto?.randomUUID)return crypto.randomUUID();
  const b=new Uint8Array(16);crypto.getRandomValues(b);b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;
  const h=[...b].map(x=>x.toString(16).padStart(2,'0')).join('');
  return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);
};
const sessionId=(()=>{
  try{
    const key='kona.analytics.session.v1';
    let id=sessionStorage.getItem(key);
    if(!id){id=uuid();sessionStorage.setItem(key,id);}
    return id;
  }catch(_){return uuid();}
})();
const viewport=()=>innerWidth<600?'compact':innerWidth<1024?'medium':'wide';
const param=(name,max)=>{
  const value=new URLSearchParams(location.search).get(name);
  return value?value.slice(0,max):null;
};
const referrerHost=()=>{
  try{return document.referrer?new URL(document.referrer).hostname.slice(0,160):null}catch(_){return null}
};
const surfaceFromPath=()=>location.pathname.endsWith('/konam/')||location.pathname.endsWith('/konam/index.html')?'landing':location.pathname.split('/').pop()?.replace(/\.html$/,'')||'page';

export function trackSiteEvent(event_type,{surface=surfaceFromPath()}={}){
  if(!PROD)return Promise.resolve(false);
  const body={
    event_type,
    path:location.pathname.slice(0,240),
    surface:String(surface||'').slice(0,80)||null,
    referrer_host:referrerHost(),
    session_id:sessionId,
    viewport:viewport(),
    campaign_source:param('utm_source',100),
    campaign_medium:param('utm_medium',100),
    campaign_name:param('utm_campaign',140),
  };
  return fetch(ENDPOINT,{
    method:'POST',
    headers:{apikey:PUBLIC_KEY,'Content-Type':'application/json'},
    credentials:'omit',
    keepalive:true,
    body:JSON.stringify(body),
  }).then(r=>r.ok).catch(()=>false);
}

trackSiteEvent('page_view');

const eventForTarget=target=>{
  if(target.closest('#buildSelf'))return ['entry_continue','landing'];
  if(target.closest('#entryWorld'))return ['world_opened','world'];
  if(target.closest('#entryInvite'))return ['share_invoked','landing'];
  if(target.closest('#entryInstall,[data-install-app]'))return ['install_invoked','landing'];
  if(target.closest('[data-onboarding-bike-collect]'))return ['first_bike_collected','onboarding'];
  if(target.closest('[data-onboarding-bike-skip]'))return ['first_bike_skipped','onboarding'];
  if(target.closest('[data-home-feed]'))return ['kona_now_feed_opened','home'];
  if(target.closest('[data-home-travel]'))return ['kona_now_travel_opened','home'];
  const tab=target.closest('[data-tab]')?.getAttribute('data-tab');
  if(tab==='garage')return ['garage_opened','garage'];
  if(tab==='discover')return ['discover_opened','discover'];
  if(tab==='plan')return ['plan_opened','plan'];
  if(tab==='me')return ['me_opened','me'];
  return null;
};
document.addEventListener('click',event=>{
  const hit=eventForTarget(event.target);
  if(hit)trackSiteEvent(hit[0],{surface:hit[1]});
},{capture:true});

globalThis.__konaAnalytics={track:trackSiteEvent,sessionId,enabled:PROD};
