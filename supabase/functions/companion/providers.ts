import policy from './source-policy.json' with {type:'json'};
import {lookup} from 'node:dns/promises';
import {XMLParser} from 'npm:fast-xml-parser@5.11.2';

export function publicIPv4(address:string):boolean{
 const p=address.split('.').map(Number);if(p.length!==4||p.some(n=>!Number.isInteger(n)||n<0||n>255))return false;
 const [a,b,c]=p;
 return !(a===0||a===10||a===127||a>=224||(a===100&&b>=64&&b<=127)||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&(b===168||b===0||(b===88&&c===99)))||(a===198&&(b===18||b===19||(b===51&&c===100)))||(a===203&&b===0&&c===113));
}
export function publicURL(value:string):URL{
 if(typeof value!=='string'||value.length>1200)throw new Error('Use a public HTTPS feed URL.');
 const u=new URL(value);
 if(u.protocol!=='https:'||u.username||u.password||(u.port&&u.port!=='443')||!u.hostname.includes('.')||!/[a-z]/i.test(u.hostname)||/\.(local|internal|localhost|test|invalid)$/i.test(u.hostname))throw new Error('Use a public HTTPS feed URL.');
 u.hash='';return u;
}
// Supabase's edge HTTP client does not support DNS pinning. Restrict outbound
// requests to reviewed publisher origins instead of becoming an arbitrary proxy.
// URL additions within these origins (including any YouTube channel) are dynamic.
export async function fetchPublic(value:string,redirects=0):Promise<string>{
 const u=publicURL(value);
 if(!policy.allowed_hosts.includes(u.hostname))throw new Error('This publisher is not supported yet. Choose a listed publisher or a YouTube channel.');
 const addresses=await lookup(u.hostname,{all:true,family:4});
 if(!addresses.length||addresses.some(a=>!publicIPv4(a.address)))throw new Error('This address is not a public website.');
 const response=await fetch(u,{redirect:'manual',signal:AbortSignal.timeout(10000),headers:{'User-Agent':'KONAFeed/1.0','Accept':'application/atom+xml, application/rss+xml, application/xml, text/html'}});
 if(response.status>=300&&response.status<400){await response.body?.cancel();if(redirects>=3||!response.headers.get('location'))throw new Error('Too many redirects.');return fetchPublic(new URL(response.headers.get('location')!,u).href,redirects+1);}
 if(!response.ok){await response.body?.cancel();throw new Error('The source is not available right now.');}
 const reader=response.body!.getReader(),chunks:Uint8Array[]=[];let bytes=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>2_000_000)throw new Error('This source is too large.');chunks.push(value);}}finally{await reader.cancel();}
 const merged=new Uint8Array(bytes);let offset=0;for(const c of chunks){merged.set(c,offset);offset+=c.length;}return new TextDecoder().decode(merged);
}
const arr=(value:any)=>value==null?[]:Array.isArray(value)?value:[value];
const text=(value:any)=>String(value?.['#text']??value??'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#(?:39|x27);/gi,"'").replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim().slice(0,240);
const secureLink=(value:any)=>{try{return publicURL(String(value)).href;}catch{return '';}};
export function parseFeed(xml:string,url:string,kind:string,now=Date.now()){
 if(/<!\s*(DOCTYPE|ENTITY)/i.test(xml)||xml.length>2_000_000)throw new Error('Unsupported feed XML.');
 const parsed=new XMLParser({ignoreAttributes:false,attributeNamePrefix:'@',processEntities:true,parseTagValue:false,trimValues:true}).parse(xml);
 const feed=parsed.feed||parsed.rss?.channel;if(!feed)throw new Error('That page is not an RSS or Atom feed. Paste its feed URL.');
 const isAtom=!!parsed.feed,sourceId=url;
 const title=text(feed.title)||new URL(url).hostname;
 const videoChannel=new URL(url).hostname==='www.youtube.com';
 const source={id:sourceId,name:title,kind:videoChannel?'video':kind,website:secureLink(isAtom?arr(feed.link).find((x:any)=>x['@rel']==='alternate')?.['@href']:feed.link)||url,feed_url:url,note:videoChannel?'YouTube channel':'Public RSS / Atom feed',status:'ok',checked_at:new Date(now).toISOString(),last_success_at:new Date(now).toISOString()};
 const items=arr(isAtom?feed.entry:feed.item).slice(0,25).map((item:any)=>{
  const link=secureLink(isAtom?arr(item.link).find((x:any)=>!x['@rel']||x['@rel']==='alternate')?.['@href']:item.link);
  const published=Date.parse(text(item.published||item.pubDate||item.updated));
  const title=text(item.title),video=text(item['yt:videoId']);
  if(!link||!title||!Number.isFinite(published)||published>now+3600000)return null;
  return {id:link,source_id:sourceId,title,url:link,published_at:new Date(published).toISOString(),kind:source.kind,...(videoChannel&&/^[\w-]{11}$/.test(video)?{thumbnail:'https://i.ytimg.com/vi/'+video+'/hqdefault.jpg'}:{})};
 }).filter(Boolean);
 if(!items.length)throw new Error('No dated stories found in this feed.');
 return {source,items};
}
export async function resolveFeed(value:string){
 const u=publicURL(value);
 if(['youtube.com','www.youtube.com','m.youtube.com'].includes(u.hostname)){
  let id=u.pathname.match(/^\/channel\/(UC[\w-]{22})\/?$/)?.[1]||u.searchParams.get('channel_id');
  if(!id&&/^\/@[\w.-]+\/?$/.test(u.pathname)){
   const html=await fetchPublic('https://www.youtube.com'+u.pathname);
   id=html.match(/"externalId":"(UC[\w-]{22})"/)?.[1]||null;
  }
  if(!id||!/^UC[\w-]{22}$/.test(id))throw new Error('Paste a YouTube channel URL, not a video or playlist.');
  return 'https://www.youtube.com/feeds/videos.xml?channel_id='+id;
 }
 return u.href;
}
export function toRSS(data:any){
 const x=(v:any)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
 return '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>KONA · Your Feed</title><link>https://joaoccaldas.github.io/canyonmuseum/?view=feed</link><description>Your selected triathlon and island sources. Read and watch at the original publisher.</description>'+data.items.slice(0,100).map((i:any)=>'<item><title>'+x(i.title)+'</title><link>'+x(i.url)+'</link><guid>'+x(i.url)+'</guid><pubDate>'+new Date(i.published_at).toUTCString()+'</pubDate></item>').join('')+'</channel></rss>';
}
