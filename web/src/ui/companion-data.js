// Pure projections shared by both companion views; never trust feed markup.
export const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function safeURL(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}}
export function sourceState(source,now=Date.now()){
 const last=Date.parse(source?.last_success_at||'');
 if(!Number.isFinite(last))return 'unavailable';
 return source.status!=='ok'||now-last>6*3600000?'stale':'ok';
}
export function filterFeed(data,{kind='all',source='all',query=''}={}){
 const sources=new Map((data.sources||[]).map(s=>[s.id,s]));
 const q=query.trim().toLocaleLowerCase();
 return (data.items||[]).filter(i=>safeURL(i.url)&&sources.has(i.source_id)&&Number.isFinite(Date.parse(i.published_at)))
  .filter(i=>(kind==='all'||i.kind===kind)&&(source==='all'||i.source_id===source)&&(!q||(i.title+' '+sources.get(i.source_id).name).toLocaleLowerCase().includes(q)))
  .sort((a,b)=>Date.parse(b.published_at)-Date.parse(a.published_at));
}
export function formatDate(value){const d=new Date(/^\d{4}-\d{2}-\d{2}$/.test(value)?value+'T12:00:00Z':value);return Number.isFinite(+d)?new Intl.DateTimeFormat('en',{month:'short',day:'numeric',year:'numeric',timeZone:'Pacific/Honolulu'}).format(d):'Not updated yet';}
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
