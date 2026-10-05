import {readBoundedJSON} from '../_shared/request.ts';
import {rateLimit} from '../_shared/rate-limit.ts';
import {fetchPublic,parseFeed,resolveFeed,toRSS} from './providers.ts';
import config from './public-config.json' with {type:'json'};
const cache=new Map<string,{at:number,value:any}>();
let active=0;
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'apikey, content-type','Access-Control-Allow-Methods':'GET, POST, OPTIONS'};
const safeId=(value:any)=>/^[a-z0-9-]{1,64}$/.test(String(value||''))?String(value):'unknown';
export async function handler(req:Request,{quota=rateLimit}:{quota?:typeof rateLimit}={}){
 const url=new URL(req.url);
 const json=(value:any,status=200)=>new Response(JSON.stringify(value),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(!['GET','POST'].includes(req.method))return json({error:'Method not supported.'},405);
 // Public read-only capability, authenticated with this project's publishable key.
 // Service credentials are used only for shared abuse quotas, never upstream feed requests.
 const supplied=req.headers.get('apikey')||url.searchParams.get('key');
 if(supplied!==config.publishable_key)return json({error:'App key required.'},401);
 const now=Date.now();
 if(active>=8)return json({error:'Quick breather. Try again in a minute.'},429);
 active++;
 try{
  if(req.method==='GET'&&url.search.length>18000)return json({error:'Too many sources.'},400);
  const input=req.method==='POST'?await readBoundedJSON(req,18000):{sources:JSON.parse(url.searchParams.get('sources')||'[]')};
  if(!Array.isArray(input.sources)||!input.sources.length||input.sources.length>12)return json({error:'Choose between 1 and 12 sources.'},400);
  const allowance=await quota(req,'companion');
  if(allowance!=='allowed')return json({error:allowance==='limited'?'Quick breather. Try again in a minute.':'Feed temporarily unavailable.'},allowance==='limited'?429:503);
  const results=[];
  // Bounded groups: slow publishers cannot fan out unbounded network work.
  for(let n=0;n<input.sources.length;n+=3){
   results.push(...await Promise.all(input.sources.slice(n,n+3).map(async(entry:any)=>{
    const value=typeof entry==='string'?entry:entry?.url;
    const kind=entry?.kind==='kona'?'kona':entry?.kind==='video'?'video':'news';
    const requestedId=safeId(entry?.id);
    let saved:any=null;
    try{
     const resolved=await resolveFeed(value),key=resolved+'|'+kind,hit=cache.get(key);
     saved=hit?.value;let result=hit&&now-hit.at<10*60000?hit.value:null;
     if(!result){result=parseFeed(await fetchPublic(resolved),resolved,kind);cache.set(key,{at:now,value:result});if(cache.size>128)cache.delete(cache.keys().next().value!);}
     return {...result,requested_id:requestedId,requested_url:value};
    }catch(error:any){
     if(saved)return {...saved,source:{...saved.source,status:'stale'},requested_id:requestedId,requested_url:value};
     console.warn('companion provider failed',requestedId,error.name,String(error.message).replace(/https?:\/\/\S+/g,'[url]').slice(0,150));
     return {requested_id:requestedId,requested_url:value,error:error.message?.startsWith('This publisher')?error.message:'Could not read this source. Check the public RSS or YouTube channel URL and try again.'};
    }
   })));
  }
  const sources=results.filter(r=>r.source).map(r=>r.source),items=[...new Map(results.flatMap(r=>r.items||[]).map(i=>[i.url,i])).values()].sort((a:any,b:any)=>Date.parse(b.published_at)-Date.parse(a.published_at));
  const data={schema_version:1,checked_at:new Date().toISOString(),sources,items,errors:results.filter(r=>r.error)};
  if(url.searchParams.get('format')==='rss')return new Response(toRSS(data),{headers:{...cors,'Content-Type':'application/rss+xml; charset=utf-8','Cache-Control':'public, max-age=600'}});
  return json(data);
 }catch{return json({error:'Check your source URLs and try again.'},400);}finally{active--;}
}
