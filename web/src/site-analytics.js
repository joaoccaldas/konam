// Optional first-party analytics. Consent is off by default in the canonical profile.
// No cookies, account IDs, raw exceptions or persistent visitor identifier. Native builds no-op.
import {readStorage,writeStorage,removeStorage,storageKey,STATE_CHANGE_EVENT} from './engine/storage.js';
const ENDPOINT='https://mtvpnoqwjpoqaiocrklq.supabase.co/functions/v1/site-analytics';
const PUBLIC_KEY='sb_publishable_lVueu3GqNcPe4Z9KsChvJw_VfmnVi5u';
const HAS_BROWSER=typeof location!=='undefined'&&typeof document!=='undefined';
const PROD=HAS_BROWSER&&!globalThis.__NATIVE&&location.hostname==='joaoccaldas.github.io'&&location.pathname.startsWith('/konam');
const RUNTIME_CODES=new Set(['uncaught_js','unhandled_promise','renderer_init','renderer_context_lost','renderer_context_restored','route_load','state_read','state_write','companion_load']);
const RUNTIME_SUBSYSTEMS=new Set(['runtime','renderer','navigation','storage','companion']);
const runtimeCounts=new Map();let runtimeTotal=0,ENABLED=false,sessionId=null,acquisition=null,trafficClass='public',timer=null,releaseIdPromise=null;
const getSession=name=>{try{return readStorage(name,sessionStorage)}catch{return null}};
const setSession=(name,value)=>{try{writeStorage(name,value,sessionStorage)}catch{}};
const param=(name,max)=>new URLSearchParams(location.search).get(name)?.slice(0,max)||null;
const surfaceFromPath=()=>!HAS_BROWSER?'non-browser':location.pathname.endsWith('/konam/')||location.pathname.endsWith('/konam/index.html')?'landing':location.pathname.split('/').pop()?.replace(/\.html$/,'')||'page';
const viewport=()=>innerWidth<600?'compact':innerWidth<1024?'medium':'wide';
function clearSession(){
  for(const name of ['analyticsSession','analyticsMode','analyticsAcquisition','analyticsEngaged']){
    try{removeStorage(name,sessionStorage)}catch{}
  }
  sessionId=null;acquisition=null;releaseIdPromise=null;clearTimeout(timer);timer=null;
  runtimeCounts.clear();runtimeTotal=0;accrued=0;visibleAt=null;
}
function prepareSession(){
  sessionId=getSession('analyticsSession')||crypto.randomUUID();setSession('analyticsSession',sessionId);
  const requested=param('analytics_mode',20);
  let mode=['public','qa','off'].includes(requested)?requested:getSession('analyticsMode');
  if(!['public','qa','automation','off'].includes(mode))mode=navigator.webdriver?'automation':'public';
  if(mode==='public'&&navigator.webdriver)mode='automation';
  setSession('analyticsMode',mode);
  trafficClass=mode==='qa'?'qa':mode==='automation'?'automation':'public';
  let referrer=null;try{referrer=document.referrer?new URL(document.referrer).hostname:null}catch{}
  try{acquisition=JSON.parse(getSession('analyticsAcquisition')||'null')}catch{}
  if(!acquisition?.landing_path?.startsWith('/'))acquisition={landing_path:location.pathname.slice(0,240),referrer_host:referrer&&referrer!==location.hostname?referrer.slice(0,160):null,campaign_source:param('utm_source',100),campaign_medium:param('utm_medium',100),campaign_name:param('utm_campaign',140)};
  setSession('analyticsAcquisition',JSON.stringify(acquisition));
  return mode!=='off';
}
export function setAnalyticsConsent(consent){
  const enable=PROD&&consent===true;
  if(!enable){ENABLED=false;clearSession();return;}
  if(ENABLED)return;
  ENABLED=prepareSession();
  if(!ENABLED){clearSession();return;}
  trackSiteEvent('page_view');armEngagement();
}
function refreshConsent(){
  let consent=false;try{consent=JSON.parse(readStorage('profile')||'null')?.analytics===true}catch{}
  setAnalyticsConsent(consent);
}
export function trackSiteEvent(event_type,{surface=surfaceFromPath(),eventCode=null,subsystem=null,releaseId=null,online=null}={}){
  if(!ENABLED)return Promise.resolve(false);
  const body={event_type,path:location.pathname.slice(0,240),surface:String(surface||'').slice(0,80)||null,referrer_host:acquisition.referrer_host,session_id:sessionId,viewport:viewport(),campaign_source:acquisition.campaign_source,campaign_medium:acquisition.campaign_medium,campaign_name:acquisition.campaign_name,landing_path:acquisition.landing_path,traffic_class:trafficClass,event_code:eventCode,subsystem,release_id:releaseId,online};
  return fetch(ENDPOINT,{method:'POST',headers:{apikey:PUBLIC_KEY,'Content-Type':'application/json'},credentials:'omit',keepalive:true,body:JSON.stringify(body)}).then(r=>r.ok).catch(()=>false);
}
export async function trackRuntimeError(eventCode,{subsystem='runtime',surface=surfaceFromPath()}={}){
  if(!ENABLED||!RUNTIME_CODES.has(eventCode)||!RUNTIME_SUBSYSTEMS.has(subsystem))return false;
  const count=runtimeCounts.get(eventCode)||0;if(count>=3||runtimeTotal>=12)return false;
  runtimeCounts.set(eventCode,count+1);runtimeTotal+=1;
  releaseIdPromise||=fetch(new URL('app/app-manifest.json',location.href),{credentials:'omit',cache:'no-store'}).then(r=>r.ok?r.json():null).then(m=>/^[0-9a-f]{12}$/.test(String(m?.version||''))?m.version:null).catch(()=>null);
  const releaseId=await releaseIdPromise;
  return trackSiteEvent('runtime_error',{surface,eventCode,subsystem,releaseId,online:navigator.onLine});
}
let accrued=0,visibleAt=null;
function armEngagement(){
  clearTimeout(timer);
  if(!ENABLED||document.visibilityState!=='visible'||getSession('analyticsEngaged'))return;
  visibleAt=performance.now();
  timer=setTimeout(()=>{
    if(!ENABLED||document.visibilityState!=='visible')return;
    accrued+=performance.now()-visibleAt;
    if(accrued<15000){armEngagement();return;}
    setSession('analyticsEngaged','1');trackSiteEvent('session_engaged_15s');
  },Math.max(0,15000-accrued));
}
if(HAS_BROWSER){
  addEventListener(STATE_CHANGE_EVENT,event=>{if(event.detail?.name==='profile')refreshConsent()});
  addEventListener('storage',event=>{if(event.key===storageKey('profile')||event.key===null)refreshConsent()});
  addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible'){armEngagement();return;}
    if(visibleAt!==null&&ENABLED)accrued+=performance.now()-visibleAt;
    visibleAt=null;clearTimeout(timer);
  });
  addEventListener('error',event=>{
    if(!(event instanceof ErrorEvent))return;
    try{const filename=event.filename?new URL(event.filename,location.href):null;if(filename&&filename.origin!==location.origin)return}catch{return}
    trackRuntimeError('uncaught_js',{subsystem:'runtime'});
  });
  addEventListener('unhandledrejection',()=>trackRuntimeError('unhandled_promise',{subsystem:'runtime'}));
  document.addEventListener('click',event=>{
    const target=event.target;if(!target?.closest)return;
    const selectors=[['#buildSelf','entry_continue','landing'],['#entryWorld','world_opened','world'],['#entryInvite','share_invoked','landing'],['#entryInstall,[data-install-app]','install_invoked','landing'],['[data-onboarding-bike-collect]','first_bike_collected','onboarding'],['[data-onboarding-bike-skip]','first_bike_skipped','onboarding'],['[data-home-feed]','kona_now_feed_opened','home'],['[data-home-travel]','kona_now_travel_opened','home']];
    for(const [selector,type,surface] of selectors){if(target.closest(selector)){trackSiteEvent(type,{surface});return}}
    const tab=target.closest('[data-tab]')?.getAttribute('data-tab');
    const types={garage:'garage_opened',discover:'discover_opened',plan:'plan_opened',me:'me_opened'};
    if(types[tab])trackSiteEvent(types[tab],{surface:tab});
  },{capture:true});
}
globalThis.__konaAnalytics={track:trackSiteEvent,trackRuntimeError,setConsent:setAnalyticsConsent,get sessionId(){return sessionId},get enabled(){return ENABLED},get trafficClass(){return trafficClass}};
if(HAS_BROWSER)refreshConsent();
