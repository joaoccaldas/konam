import {readBoundedJSON,readBoundedText,BodyTooLarge} from '../_shared/request.ts';
import {rateLimit} from '../_shared/rate-limit.ts';
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.95.0';

const PUBLIC_KEY='sb_publishable_lVueu3GqNcPe4Z9KsChvJw_VfmnVi5u';
const allowedOrigins=new Set(['https://joaoccaldas.github.io']);

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

const validToken=(token:unknown)=>typeof token==='string'&&/^[a-f0-9]{64}$/.test(token);
const unsubscribeRedirect=(token:string)=>new Response(null,{status:303,headers:{
  Location:'https://joaoccaldas.github.io/konam/index.html?account=unsubscribe&token='+token,
  'Cache-Control':'no-store','Referrer-Policy':'no-referrer',
}});

type Dependencies={admin?:SupabaseClient,quota?:typeof rateLimit};
export async function handler(req:Request,dependencies:Dependencies={}){
  const origin=req.headers.get('origin');
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors(origin)});
  // GET never changes a subscription: email link scanners cannot unsubscribe.
  const linkToken=new URL(req.url).searchParams.get('unsubscribe');
  if(req.method==='GET'&&linkToken!==null)return validToken(linkToken)?unsubscribeRedirect(linkToken):response(origin,{error:'Invalid unsubscribe link.'},400);
  if(req.method!=='POST')return response(origin,{error:'Method not supported.'},405);

  const form=req.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded');
  let input:any;try{input=form?Object.fromEntries(new URLSearchParams(await readBoundedText(req,2000))):await readBoundedJSON(req,2000);}catch(error){return response(origin,{error:error instanceof BodyTooLarge?'Request too large.':'Invalid request.'},400);}
  const withdrawing=input.unsubscribe!==undefined;
  if(withdrawing&&!validToken(input.unsubscribe))return response(origin,{error:'Invalid unsubscribe link.'},400);
  if(!withdrawing){
    if(!originAllowed(origin))return response(origin,{error:'Origin not allowed.'},403);
    if(req.headers.get('apikey')!==PUBLIC_KEY)return response(origin,{error:'App key required.'},401);
  }
  const quota=await (dependencies.quota||rateLimit)(req,'newsletter-subscribe');
  if(quota!=='allowed')return response(origin,{error:quota==='limited'?'Too many signup attempts. Try again later.':'Service temporarily unavailable.'},quota==='limited'?429:503);

  const url=Deno.env.get('SUPABASE_URL'),serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!dependencies.admin&&(!url||!serviceKey))return response(origin,{error:'Signup is temporarily unavailable.'},503);
  const admin=dependencies.admin||createClient(url!,serviceKey!,{auth:{persistSession:false,autoRefreshToken:false}});
  if(withdrawing){
    const {error}=await admin.from('newsletter_subscriptions').update({status:'unsubscribed',updated_at:new Date().toISOString()}).eq('unsubscribe_token',input.unsubscribe).neq('status','suppressed');
    if(error)return response(origin,{error:'Could not unsubscribe. Please try again.'},503);
    // Neutral, idempotent response; neither address nor previous status leaks.
    return response(origin,{ok:true,status:'unsubscribed'});
  }

  if(input.company)return response(origin,{ok:true,status:'pending'},202);

  const email=cleanEmail(input.email),source=String(input.source||'app').trim().slice(0,80),locale=String(input.locale||'en').trim().slice(0,16);
  if(email.length>254||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))return response(origin,{error:'Enter a valid email address.'},400);

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
}
