import { createClient } from 'npm:@supabase/supabase-js@2.95.0';

const PUBLIC_KEY='sb_publishable_lVueu3GqNcPe4Z9KsChvJw_VfmnVi5u';
const allowedOrigins=new Set(['https://joaoccaldas.github.io']);
const rates=new Map<string,{at:number,count:number}>();

const isLocal=(origin:string|null)=>!!origin&&/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(origin);
const originAllowed=(origin:string|null)=>!!origin&&(allowedOrigins.has(origin)||isLocal(origin));
const cors=(origin:string|null)=>({
  'Access-Control-Allow-Origin':originAllowed(origin)?origin!:'https://joaoccaldas.github.io',
  'Access-Control-Allow-Headers':'apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
  'Vary':'Origin',
});
const response=(origin:string|null,body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors(origin),'Content-Type':'application/json','Cache-Control':'no-store'}});
const cleanEmail=(value:unknown)=>String(value??'').trim().toLowerCase();

Deno.serve(async(req:Request)=>{
  const origin=req.headers.get('origin');
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors(origin)});
  if(req.method!=='POST')return response(origin,{error:'Method not supported.'},405);
  if(!originAllowed(origin))return response(origin,{error:'Origin not allowed.'},403);
  if(req.headers.get('apikey')!==PUBLIC_KEY)return response(origin,{error:'App key required.'},401);

  const now=Date.now(),ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
  for(const [key,row] of rates)if(now-row.at>3600000)rates.delete(key);
  const rate=rates.get(ip)||{at:now,count:0};rate.count++;rates.set(ip,rate);
  if(rate.count>8||rates.size>5000)return response(origin,{error:'Too many signup attempts. Try again later.'},429);

  if(Number(req.headers.get('content-length')||0)>2000)return response(origin,{error:'Request too large.'},400);
  let input:any={};try{input=await req.json();}catch{return response(origin,{error:'Invalid request.'},400);}
  if(input.company)return response(origin,{ok:true,status:'pending'},202);

  const email=cleanEmail(input.email),source=String(input.source||'app').trim().slice(0,80),locale=String(input.locale||'en').trim().slice(0,16);
  if(email.length>254||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))return response(origin,{error:'Enter a valid email address.'},400);

  const url=Deno.env.get('SUPABASE_URL'),serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!url||!serviceKey)return response(origin,{error:'Signup is temporarily unavailable.'},503);
  const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});

  const {data:existing,error:lookupError}=await admin.from('newsletter_subscriptions').select('status').eq('email',email).maybeSingle();
  if(lookupError){console.error('newsletter lookup failed',lookupError.code);return response(origin,{error:'Signup is temporarily unavailable.'},503);}
  // Anonymous submissions never change an existing consent state. In particular,
  // unsubscribed/suppressed addresses cannot be silently re-pended by a third party.
  if(existing)return response(origin,{ok:true,status:'pending'},202);

  const timestamp=new Date().toISOString();
  const {error}=await admin.from('newsletter_subscriptions').insert({
    email,status:'pending',consented_at:timestamp,source,locale,updated_at:timestamp,
  });
  if(error?.code==='23505')return response(origin,{ok:true,status:'pending'},202);
  if(error){console.error('newsletter signup failed',error.code);return response(origin,{error:'Signup is temporarily unavailable.'},503);}
  return response(origin,{ok:true,status:'pending'},202);
});
