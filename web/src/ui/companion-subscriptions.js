import {PUBLIC_SUPABASE_URL,PUBLIC_SUPABASE_KEY} from '../cloud/supabase-lite.js';
import {readStorage,writeStorage} from '../engine/storage.js';
import {safeURL} from './companion-data.js';

export const supportedPublishers=['Slowtwitch','Triathlon Magazine','Big Island Now','Hawaiʻi DOT','TRI247','Triathlete','220 Triathlon','World Triathlon'];
const endpoint=PUBLIC_SUPABASE_URL+'/functions/v1/companion';
const readSources=()=>{try{return JSON.parse(readStorage('companionSources')||'{}');}catch{return {};}};
const readTravel=()=>{try{return JSON.parse(readStorage('companionTravel')||'[]');}catch{return [];}};
const readCache=()=>{try{return JSON.parse(readStorage('companionCache')||'{}');}catch{return {};}};

export function subscriptions(scope,defaults){
 const saved=readSources()[scope]?.sources;
 return Array.isArray(saved)?saved:defaults.map(s=>({url:s.feed_url||s.url,kind:s.kind,name:s.name,enabled:true}));
}
export function saveSubscriptions(scope,sources){
 const state=readSources();state[scope]={sources:sources.slice(0,12)};return writeStorage('companionSources',JSON.stringify(state));
}
export function travelPlaces(){return readTravel();}
export function saveTravelPlaces(places){return writeStorage('companionTravel',JSON.stringify((places||[]).slice(0,20)));}
export function personalRSS(sources){
 const list=sources.filter(s=>s.enabled).map(s=>({url:s.url,kind:s.kind}));
 return list.length?endpoint+'?format=rss&key='+encodeURIComponent(PUBLIC_SUPABASE_KEY)+'&sources='+encodeURIComponent(JSON.stringify(list)):'';
}
export async function fetchSources(sources,signal){
 const list=sources.filter(s=>s.enabled!==false).map(s=>({url:s.url,kind:s.kind}));
 if(!list.length)return {schema_version:1,checked_at:new Date().toISOString(),sources:[],items:[],errors:[]};
 if(list.some(s=>!safeURL(s.url)))throw new Error('Use public HTTPS URLs.');
 const local=new AbortController(),timer=setTimeout(()=>local.abort(),50000),abort=()=>local.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)local.abort();
 try{
  const response=await fetch(endpoint,{method:'POST',headers:{apikey:PUBLIC_SUPABASE_KEY,'Content-Type':'application/json'},body:JSON.stringify({sources:list}),signal:local.signal,credentials:'omit'});
  const data=await response.json();if(!response.ok)throw new Error(data.error||'Feed service unavailable.');return data;
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}
export async function liveSubscriptions(scope,selected,fallback,signal){
 const cache=readCache(),prior=cache[scope]||fallback,active=new Set(selected.filter(s=>s.enabled).map(s=>s.url));
 try{
  const live=await fetchSources(selected,signal),failed=new Set((live.errors||[]).map(e=>e.requested_url));
  for(const old of prior.sources||[])if(failed.has(old.feed_url)&&active.has(old.feed_url)){
   live.sources.push({...old,status:'stale'});live.items.push(...(prior.items||[]).filter(i=>i.source_id===old.id));
  }
  for(const s of live.sources){const custom=selected.find(x=>x.url===s.feed_url);if(custom?.name)s.name=custom.name;}
  cache[scope]=live;writeStorage('companionCache',JSON.stringify(cache));return live;
 }catch(error){
  if(signal?.aborted)throw error;
  const sources=(prior.sources||[]).filter(s=>active.has(s.feed_url)).map(s=>({...s,status:'stale'})),ids=new Set(sources.map(s=>s.id));
  return {...prior,sources,items:(prior.items||[]).filter(i=>ids.has(i.source_id)),offline:true};
 }
}
