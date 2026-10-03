// Privacy-minimal first-party analytics for Kona.m public web.
// No cookies, account IDs, email, IP/user-agent storage, raw feedback text, or persistent visitor ID.
// A random session ID and first-touch acquisition context live only for the current browser session. Native builds no-op.
const ENDPOINT='https://mtvpnoqwjpoqaiocrklq.supabase.co/functions/v1/site-analytics';
const PUBLIC_KEY='sb_publishable_lVueu3GqNcPe4Z9KsChvJw_VfmnVi5u';
const PROD=!globalThis.__NATIVE&&location.hostname==='joaoccaldas.github.io'&&location.pathname.startsWith('/konam');
const RUNTIME_CODES=new Set(['uncaught_js','unhandled_promise','renderer_init','renderer_context_lost','renderer_context_restored','route_load','state_read','state_write','companion_load']);
const RUNTIME_SUBSYSTEMS=new Set(['runtime','renderer','navigation','storage','companion']);
const runtimeCounts=new Map();let runtimeTotal=0;

const uuid=()=>{
  if(globalThis.crypto?.randomUUID)return crypto.randomUUID();
  const b=new Uint8Array(16);crypto.getRandomValues(b);b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;
  const h=[...b].map(x=>x.toString(16).padStart(2,'0')).join('');
  return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);
};
const getSession=key=>{try{return sessionStorage.getItem(key)}catch(_){return null}};
const setSession=(key,value)=>{try{sessionStorage.setItem(key,value)}catch(_){}};
const param=(name,max)=>{
  const value=new URLSearchParams(location.search).get(name);
  return value?value.slice(0,max):null;
};
const referrerHost=()=>{
  try{return document.referrer?new URL(document.referrer).hostname.slice(0,160):null}catch(_){return null}
};
const surfaceFromPath=()=>location.pathname.endsWith('/konam/')||location.pathname.endsWith('/konam/index.html')?'landing':location.pathname.split('/').pop()?.replace(/\.html$/,'')||'page';

const sessionId=(()=>{
  const key='kona.analytics.session.v1';
  let id=getSession(key);
  if(!id){id=uuid();setSession(key,id);}
  return id;
})();

const analyticsMode=(()=>{
  const key='kona.analytics.mode.v2';
  const requested=param('analytics_mode',20);
  let mode=['public','qa','off'].includes(requested)?requested:getSession(key);
  if(!['public','qa','automation','off'].includes(mode))mode=navigator.webdriver?'automation':'public';
  if(mode==='public'&&navigator.webdriver)mode='automation';
  setSession(key,mode);
  return mode;
})();
const ENABLED=PROD&&analyticsMode!=='off';
const trafficClass=analyticsMode==='qa'?'qa':analyticsMode==='automation'?'automation':'public';

const acquisition=(()=>{
  const key='kona.analytics.acquisition.v2';
  try{
    const existing=JSON.parse(getSession(key)||'null');
    if(existing&&typeof existing==='object'&&String(existing.landing_path||'').startsWith('/'))return existing;
  }catch(_){}
  const currentRef=referrerHost();
  const first={
    landing_path:location.pathname.slice(0,240),
    referrer_host:currentRef&&currentRef!==location.hostname?currentRef:null,
    campaign_source:param('utm_source',100),
    campaign_medium:param('utm_medium',100),
    campaign_name:param('utm_campaign',140),
  };
  setSession(key,JSON.stringify(first));
  return first;
})();

const viewport=()=>innerWidth<600?'compact':innerWidth<1024?'medium':'wide';
const releaseIdPromise=ENABLED?fetch(new URL('app/app-manifest.json',location.href),{credentials:'omit',cache:'no-store'})
  .then(r=>r.ok?r.json():null).then(m=>/^[0-9a-f]{12}$/.test(String(m?.version||''))?m.version:null).catch(()=>null):Promise.resolve(null);

export function trackSiteEvent(event_type,{surface=surfaceFromPath(),eventCode=null,subsystem=null,releaseId=null,online=null}={}){
  if(!ENABLED)return Promise.resolve(false);
  const body={
    event_type,
    path:location.pathname.slice(0,240),
    surface:String(surface||'').slice(0,80)||null,
    referrer_host:acquisition.referrer_host,
    session_id:sessionId,
    viewport:viewport(),
    campaign_source:acquisition.campaign_source,
    campaign_medium:acquisition.campaign_medium,
    campaign_name:acquisition.campaign_name,
    landing_path:acquisition.landing_path,
    traffic_class:trafficClass,
    event_code:eventCode,
    subsystem,
    release_id:releaseId,
    online,
  };
  return fetch(ENDPOINT,{
    method:'POST',
    headers:{apikey:PUBLIC_KEY,'Content-Type':'application/json'},
    credentials:'omit',
    keepalive:true,
    body:JSON.stringify(body),
  }).then(r=>r.ok).catch(()=>false);
}

export async function trackRuntimeError(eventCode,{subsystem='runtime',surface=surfaceFromPath()}={}){
  if(!ENABLED||!RUNTIME_CODES.has(eventCode)||!RUNTIME_SUBSYSTEMS.has(subsystem))return false;
  const count=runtimeCounts.get(eventCode)||0;
  if(count>=3||runtimeTotal>=12)return false;
  runtimeCounts.set(eventCode,count+1);runtimeTotal+=1;
  const releaseId=await releaseIdPromise;
  return trackSiteEvent('runtime_error',{surface,eventCode,subsystem,releaseId,online:navigator.onLine});
}

trackSiteEvent('page_view');

(()=>{
  if(!ENABLED||getSession('kona.analytics.engaged15.v1'))return;
  const targetMs=15000;
  let accrued=0,visibleAt=document.visibilityState==='visible'?performance.now():null,timer=null;
  const arm=()=>{
    if(visibleAt===null||getSession('kona.analytics.engaged15.v1'))return;
    clearTimeout(timer);
    timer=setTimeout(()=>{
      if(document.visibilityState!=='visible')return;
      accrued+=performance.now()-visibleAt;visibleAt=performance.now();
      if(accrued<targetMs){arm();return;}
      setSession('kona.analytics.engaged15.v1','1');
      trackSiteEvent('session_engaged_15s',{surface:surfaceFromPath()});
    },Math.max(0,targetMs-accrued));
  };
  addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible'){visibleAt=performance.now();arm();return;}
    if(visibleAt!==null){accrued+=performance.now()-visibleAt;visibleAt=null;}
    clearTimeout(timer);
  });
  arm();
})();

addEventListener('error',event=>{
  if(!(event instanceof ErrorEvent))return;
  try{
    const filename=event.filename?new URL(event.filename,location.href):null;
    if(filename&&filename.origin!==location.origin)return;
  }catch{return;}
  trackRuntimeError('uncaught_js',{subsystem:'runtime'});
});

addEventListener('unhandledrejection',()=>{trackRuntimeError('unhandled_promise',{subsystem:'runtime'});});

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

globalThis.__konaAnalytics={track:trackSiteEvent,trackRuntimeError,sessionId,enabled:ENABLED,trafficClass};
