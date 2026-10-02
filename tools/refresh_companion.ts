// Scheduled fallback snapshot. Parsing and URL validation belong to the edge provider.
import config from '../supabase/functions/companion/public-config.json' with {type:'json'};
import registry from '../integrations/companion/sources.json' with {type:'json'};
import {toRSS} from '../supabase/functions/companion/providers.ts';
const path=new URL('../integrations/companion/feed.json',import.meta.url);
let previous:any={sources:[],items:[]};try{previous=JSON.parse(await Deno.readTextFile(path));}catch{}
try{
 const response=await fetch(config.url+'/functions/v1/companion',{method:'POST',headers:{apikey:config.publishable_key,'Content-Type':'application/json'},body:JSON.stringify({sources:registry.sources.map(s=>({url:s.feed_url,kind:s.kind}))}),signal:AbortSignal.timeout(60000)});
 if(!response.ok)throw new Error('Feed service HTTP '+response.status);
 const live=await response.json();const sources=[],items=[];
 for(const registered of registry.sources){
  const fresh=live.sources.find((s:any)=>s.feed_url===registered.feed_url);
  if(fresh){sources.push({...fresh,name:registered.name,note:registered.note});items.push(...live.items.filter((i:any)=>i.source_id===fresh.id));}
  else{
   const old=previous.sources.find((s:any)=>s.feed_url===registered.feed_url);
   const id=old?.id||registered.feed_url;
   sources.push({...registered,id,status:old?'stale':'unavailable',checked_at:live.checked_at,last_success_at:old?.last_success_at||null});items.push(...previous.items.filter((i:any)=>i.source_id===id));
  }
 }
 const data={schema_version:1,checked_at:live.checked_at,sources,items:items.sort((a,b)=>Date.parse(b.published_at)-Date.parse(a.published_at))};
 await Deno.writeTextFile(path,JSON.stringify(data,null,2)+'\n');await Deno.writeTextFile(new URL('../integrations/companion/rss.xml',import.meta.url),toRSS(data));
 console.log(`Companion: ${items.length} items, ${sources.filter(s=>s.status==='ok').length}/${sources.length} sources live`);
}catch(e:any){console.warn('Keeping dated snapshot:',e.message);if(!previous.items.length)throw e;}
