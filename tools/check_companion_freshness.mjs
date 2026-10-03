import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const registry=JSON.parse(fs.readFileSync(path.join(root,'integrations/companion/sources.json'),'utf8'));
const cloud=fs.readFileSync(path.join(root,'web/src/cloud/supabase-lite.js'),'utf8');
const url=cloud.match(/PUBLIC_SUPABASE_URL\s*=\s*['"]([^'"]+)/)?.[1];
const key=cloud.match(/PUBLIC_SUPABASE_KEY\s*=\s*['"]([^'"]+)/)?.[1];
if(!url||!key)throw new Error('Public companion endpoint authority not found');

const requested=registry.sources.map(s=>({url:s.feed_url,kind:s.kind}));
const response=await fetch(url+'/functions/v1/companion',{
  method:'POST',
  headers:{apikey:key,'Content-Type':'application/json'},
  body:JSON.stringify({sources:requested}),
  signal:AbortSignal.timeout(60000)
});
const body=await response.text();
let data;try{data=JSON.parse(body);}catch{throw new Error('Companion health response was not JSON');}
if(!response.ok)throw new Error('Companion health HTTP '+response.status+': '+(data?.error||'unknown error'));

const now=Date.now(), checked=Date.parse(data.checked_at||'');
if(!Number.isFinite(checked))throw new Error('Companion health response has no valid checked_at');
const responseAgeMinutes=(now-checked)/60000;
if(responseAgeMinutes>15)throw new Error('Companion endpoint returned stale checked_at: '+responseAgeMinutes.toFixed(1)+' minutes');

const sourceByUrl=new Map((data.sources||[]).map(s=>[s.feed_url,s]));
const results=registry.sources.map(source=>{
  const live=sourceByUrl.get(source.feed_url);
  const last=Date.parse(live?.last_success_at||'');
  return {
    name:source.name,
    kind:source.kind,
    status:live?.status||'missing',
    age_hours:Number.isFinite(last)?(now-last)/3600000:null
  };
});
const fresh=result=>result.status==='ok'&&result.age_hours!==null&&result.age_hours<=3;
const incident=result=>result.age_hours===null||result.age_hours>8;
const criticalKinds=['news','kona'];
for(const kind of criticalKinds){
  if(!results.some(r=>r.kind===kind&&fresh(r))){
    throw new Error('KONA Now freshness SLO failed: no '+kind+' source succeeded in the last 3 hours');
  }
}
const incidentSources=results.filter(incident);
if(incidentSources.length>Math.ceil(results.length/2)){
  throw new Error('KONA Now incident: more than half of sources have no success within 8 hours');
}
const delayed=results.filter(r=>!fresh(r));
const report={
  checked_at:data.checked_at,
  response_age_minutes:Number(responseAgeMinutes.toFixed(2)),
  sources_total:results.length,
  sources_fresh:results.filter(fresh).length,
  delayed,
  status:delayed.length?'WARN':'PASS'
};
console.log(JSON.stringify(report,null,2));
