import fs from 'node:fs';
import path from 'node:path';
import {assessCompanionHealth,isFresh} from './lib/companion-health.mjs';

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const registry=JSON.parse(fs.readFileSync(path.join(root,'integrations/companion/sources.json'),'utf8'));
const cloud=fs.readFileSync(path.join(root,'web/src/cloud/supabase-lite.js'),'utf8');
const url=cloud.match(/PUBLIC_SUPABASE_URL\s*=\s*['"]([^'"]+)/)?.[1];
const key=cloud.match(/PUBLIC_SUPABASE_KEY\s*=\s*['"]([^'"]+)/)?.[1];
if(!url||!key)throw new Error('Public companion endpoint authority not found');

const requested=registry.sources.map(s=>({id:s.id,url:s.feed_url,kind:s.kind}));
const response=await fetch(url+'/functions/v1/companion',{
  method:'POST',
  headers:{apikey:key,'Content-Type':'application/json'},
  body:JSON.stringify({sources:requested}),
  signal:AbortSignal.timeout(60000)
});
const body=await response.text();
let data;try{data=JSON.parse(body);}catch{throw new Error('Companion health response was not JSON');}
if(!response.ok)throw new Error('Companion health HTTP '+response.status+': '+(data?.error||'unknown error'));

const now=Date.now(),checked=Date.parse(data.checked_at||'');
if(!Number.isFinite(checked))throw new Error('Companion health response has no valid checked_at');
const responseAgeMinutes=(now-checked)/60000;
if(responseAgeMinutes>15)throw new Error('Companion endpoint returned stale checked_at: '+responseAgeMinutes.toFixed(1)+' minutes');

const sourceByUrl=new Map((data.sources||[]).map(s=>[s.feed_url,s]));
const errorByUrl=new Map((data.errors||[]).map(e=>[e.requested_url,e]));
const results=registry.sources.map(source=>{
  const live=sourceByUrl.get(source.feed_url);
  const last=Date.parse(live?.last_success_at||'');
  return {
    id:source.id,
    name:source.name,
    kind:source.kind,
    host:new URL(source.feed_url).hostname,
    status:live?.status||'missing',
    age_hours:Number.isFinite(last)?(now-last)/3600000:null,
    error:errorByUrl.get(source.feed_url)?.error||null
  };
});
const health=assessCompanionHealth(results);
const delayed=results.filter(r=>!isFresh(r));
const report={
  checked_at:data.checked_at,
  response_age_minutes:Number(responseAgeMinutes.toFixed(2)),
  sources_total:results.length,
  sources_fresh:results.filter(isFresh).length,
  core:{fresh:health.core_fresh,total:health.core_total},
  athlete_video:{fresh:health.video_fresh,total:health.video_total},
  delayed,
  warnings:health.warnings,
  status:health.status
};
console.log(JSON.stringify(report,null,2));
if(health.status==='FAIL')throw new Error('KONA Now core freshness failed: '+health.failure_reasons.join('; '));
