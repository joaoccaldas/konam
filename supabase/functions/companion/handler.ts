import {fetchPublic,parseFeed,resolveFeed,toRSS} from './providers.ts';
import config from './public-config.json' with {type:'json'};
const cache=new Map<string,{at:number,value:any}>(),rates=new Map<string,{at:number,count:number}>();
let active=0;
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'apikey, content-type','Access-Control-Allow-Methods':'GET, POST, OPTIONS'};
export async function handler(req:Request){
 const url=new URL(req.url);
 const json=(value:any,status=200)=>new Response(JSON.stringify(value),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(!['GET','POST'].includes(req.method))return json({error:'Method not supported.'},405);
 // Public read-only capability, authenticated with this project's publishable key.
 // No service-role client, database access, cookies, or upstream credentials.
 const supplied=req.headers.get('apikey')||url.searchParams.get('key');
 if(supplied!==config.publishable_key)return json({error:'App key required.'},401);
 const now=Date.now(),ip=req.headers.get('x-forwarded-for')?.split(',')[0]||'unknown';
 for(const [key,r] of rates)if(now-r.at>60000)rates.delete(key);
 const rate=rates.get(ip)||{at:now,count:0};rate.count++;rates.set(ip,rate);
 if(rate.count>45||rates.size>2000||active>=8)return json({error:'Quick breather. Try again in a minute.'},429);
 active++;
 try{
  if(Number(req.headers.get('content-length')||0)>18000)return json({error:'Too many sources.'},400);
  const body=req.method==='POST'?await req.text():null;
  if(body&&body.length>18000)return json({error:'Too many sources.'},400);
  const input=body?JSON.parse(body):{sources:JSON.parse(url.searchParams.get('sources')||'[]')};
  if(!Array.isArray(input.sources)||!input.sources.length||input.sources.length>12)return json({error:'Choose between 1 and 12 sources.'},400);
  const results=[];
  // Bounded groups: slow publishers cannot fan out unbounded network work.
  for(let n=0;n<input.sources.length;n+=3){
   results.push(...await Promise.all(input.sources.slice(n,n+3).map(async(entry:any)=>{
    const value=typeof entry==='string'?entry:entry?.url,kind=entry?.kind==='kona'?'kona':'news';let saved:any=null;
    try{
     const resolved=await resolveFeed(value),key=resolved+'|'+kind,hit=cache.get(key);
     saved=hit?.value;let result=hit&&now-hit.at<10*60000?hit.value:null;
     if(!result){result=parseFeed(await fetchPublic(resolved),resolved,kind);cache.set(key,{at:now,value:result});if(cache.size>128)cache.delete(cache.keys().next().value!);}
     return {...result,requested_url:value};
    }catch(error:any){if(saved)return {...saved,source:{...saved.source,status:'stale'},requested_url:value};console.warn('companion provider failed',error.name,String(error.message).replace(/https?:\/\/\S+/g,'[url]').slice(0,150));return {requested_url:value,error:error.message?.startsWith('This publisher')?error.message:'Could not read this source. Check the public RSS or YouTube channel URL and try again.'};}
   })));
  }
  const sources=results.filter(r=>r.source).map(r=>r.source),items=[...new Map(results.flatMap(r=>r.items||[]).map(i=>[i.url,i])).values()].sort((a:any,b:any)=>Date.parse(b.published_at)-Date.parse(a.published_at));
  const data={schema_version:1,checked_at:new Date().toISOString(),sources,items,errors:results.filter(r=>r.error)};
  if(url.searchParams.get('format')==='rss')return new Response(toRSS(data),{headers:{...cors,'Content-Type':'application/rss+xml; charset=utf-8','Cache-Control':'public, max-age=600'}});
  return json(data);
 }catch{return json({error:'Check your source URLs and try again.'},400);}finally{active--;}
}
