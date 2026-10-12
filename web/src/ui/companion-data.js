// Pure projections shared by both companion views; never trust feed markup.
export const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function safeURL(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}}
export function sourceState(source,now=Date.now()){
 const last=Date.parse(source?.last_success_at||'');
 if(!Number.isFinite(last))return 'unavailable';
 return source.status!=='ok'||now-last>6*3600000?'stale':'ok';
}
// Some RSS feeds double-encode punctuation. Decode text, then let the UI escape it as usual.
const feedText=value=>String(value??'').replace(/&#(x[\da-f]+|\d+);/gi,(match,code)=>{
 const n=code[0].toLowerCase()==='x'?parseInt(code.slice(1),16):Number(code);
 return n>0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff)?String.fromCodePoint(n):match;
}).replace(/&(amp|quot|apos|nbsp|ndash|mdash|lsquo|rsquo|ldquo|rdquo|hellip);/g,(_,name)=>({amp:'&',quot:'"',apos:"'",nbsp:' ',ndash:'–',mdash:'—',lsquo:'‘',rsquo:'’',ldquo:'“',rdquo:'”',hellip:'…'}[name]));
export function filterFeed(data,{kind='all',source='all',query=''}={}){
 const sources=new Map((data.sources||[]).map(s=>[s.id,s]));
 const q=query.trim().toLocaleLowerCase();
 return (data.items||[]).filter(i=>safeURL(i.url)&&sources.has(i.source_id)&&Number.isFinite(Date.parse(i.published_at)))
  .map(i=>({...i,title:feedText(i.title),...(i.excerpt?{excerpt:feedText(i.excerpt)}:{})}))
  .filter(i=>(kind==='all'||i.kind===kind)&&(source==='all'||i.source_id===source)&&(!q||(i.title+' '+sources.get(i.source_id).name).toLocaleLowerCase().includes(q)))
  .sort((a,b)=>Date.parse(b.published_at)-Date.parse(a.published_at));
}
export function formatDate(value){const d=new Date(/^\d{4}-\d{2}-\d{2}$/.test(value)?value+'T12:00:00Z':value);return Number.isFinite(+d)?new Intl.DateTimeFormat('en',{month:'short',day:'numeric',year:'numeric',timeZone:'Pacific/Honolulu'}).format(d):'Not updated yet';}
// Dated source digests, shared by the live UI and scheduled snapshot. No invented news facts.
export function internEditions(data,{limit=7}={}){
 const publishers=new Map((data.sources||[]).map(s=>[s.id,s]));
 const days=new Map(),seen=new Set();
 for(const item of filterFeed(data)){
  const url=safeURL(item.url);if(seen.has(url))continue;seen.add(url);
  const parts=new Intl.DateTimeFormat('en',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Pacific/Honolulu'}).formatToParts(new Date(item.published_at));
  const part=name=>parts.find(p=>p.type===name).value;
  const day=part('year')+'-'+part('month')+'-'+part('day');
  if(!days.has(day))days.set(day,[]);
  days.get(day).push({...item,url,publisher:publishers.get(item.source_id).name,excerpt:String(item.excerpt||'').replace(/\s+/g,' ').trim().slice(0,260)});
 }
 return [...days].sort(([a],[b])=>b.localeCompare(a)).slice(0,limit).map(([date,items])=>({
  date,title:'The Intern · '+formatDate(date),story_count:items.length,
  picks:['news','video','kona'].flatMap(kind=>items.filter(i=>i.kind===kind).slice(0,2)),
 }));
}
export async function loadCompanion(name,{signal}={}){
 const url='integrations/companion/'+name+'.json';
 let cache;try{cache=await caches.open('kona-companion-public-v1');}catch{}
 try{
  const response=await fetch(url,{signal,credentials:'omit',cache:'no-cache'});
  if(!response.ok)throw new Error('Companion unavailable');
  const data=await response.clone().json();if(data.schema_version!==1)throw new Error('Unsupported companion version');
  try{await cache?.put(url,response);}catch{}return data;
 }catch(error){if(signal?.aborted)throw error;const saved=await cache?.match(url);if(saved)return saved.json();throw error;}
}
