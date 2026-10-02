import { createClient } from 'npm:@supabase/supabase-js@2.95.0';

const PUBLIC_KEY='sb_publishable_lVueu3GqNcPe4Z9KsChvJw_VfmnVi5u';
const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
};
const rates=new Map<string,{at:number,count:number}>();
const response=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
const cleanEmail=(value:unknown)=>String(value??'').trim().toLowerCase();

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(req.method!=='POST')return response({error:'Method not supported.'},405);
  if(req.headers.get('apikey')!==PUBLIC_KEY)return response({error:'App key required.'},401);
  const now=Date.now(),ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
  for(const [key,row] of rates)if(now-row.at>3600000)rates.delete(key);
  const rate=rates.get(ip)||{at:now,count:0};rate.count++;rates.set(ip,rate);
  if(rate.count>8||rates.size>5000)return response({error:'Too many signup attempts. Try again later.'},429);
  if(Number(req.headers.get('content-length')||0)>2000)return response({error:'Request too large.'},400);
  let input:any={};try{input=await req.json();}catch{return response({error:'Invalid request.'},400);}
  if(input.company)return response({ok:true,status:'pending'},202);
  const email=cleanEmail(input.email),source=String(input.source||'app').trim().slice(0,80),locale=String(input.locale||'en').trim().slice(0,16);
  if(email.length>254||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))return response({error:'Enter a valid email address.'},400);
  const url=Deno.env.get('SUPABASE_URL'),serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!url||!serviceKey)return response({error:'Signup is temporarily unavailable.'},503);
  const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const timestamp=new Date().toISOString();
  const {error}=await admin.from('newsletter_subscriptions').upsert({email,status:'pending',consented_at:timestamp,source,locale,updated_at:timestamp},{onConflict:'email'});
  if(error){console.error('newsletter signup failed',error.code);return response({error:'Signup is temporarily unavailable.'},503);}
  return response({ok:true,status:'pending'},202);
});
