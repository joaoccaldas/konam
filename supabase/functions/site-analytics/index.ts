const PUBLIC_KEY='sb_publishable_lVueu3GqNcPe4Z9KsChvJw_VfmnVi5u';
const allowedOrigins=new Set(['https://joaoccaldas.github.io']);
const rates=new Map<string,{at:number,count:number}>();
const eventTypes=new Set([
  'page_view','entry_continue','world_opened','garage_opened','discover_opened',
  'plan_opened','me_opened','share_invoked','install_invoked'
]);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const cors=(origin:string|null)=>{
  const local=!!origin&&/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(origin);
  const allowed=!!origin&&(allowedOrigins.has(origin)||local);
  return {
    'Access-Control-Allow-Origin':allowed?origin!:'https://joaoccaldas.github.io',
    'Access-Control-Allow-Headers':'apikey, content-type',
    'Access-Control-Allow-Methods':'POST, OPTIONS',
    'Vary':'Origin',
  };
};
const response=(origin:string|null,body:unknown,status=200)=>new Response(JSON.stringify(body),{
  status,headers:{...cors(origin),'Content-Type':'application/json','Cache-Control':'no-store'}
});
const text=(v:unknown,max:number)=>{const s=String(v??'').trim();return s?s.slice(0,max):null};

Deno.serve(async(req:Request)=>{
  const origin=req.headers.get('origin');
  const headers=cors(origin);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return response(origin,{error:'Method not supported.'},405);

  const local=!!origin&&/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(origin);
  if(origin&&!allowedOrigins.has(origin)&&!local)return response(origin,{error:'Origin not allowed.'},403);
  if(req.headers.get('apikey')!==PUBLIC_KEY)return response(origin,{error:'App key required.'},401);

  const now=Date.now(),ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
  for(const [key,row] of rates)if(now-row.at>3600000)rates.delete(key);
  const rate=rates.get(ip)||{at:now,count:0};rate.count++;rates.set(ip,rate);
  if(rate.count>240||rates.size>10000)return response(origin,{error:'Too many analytics events.'},429);

  if(Number(req.headers.get('content-length')||0)>3000)return response(origin,{error:'Request too large.'},400);
  let input:any={};try{input=await req.json();}catch{return response(origin,{error:'Invalid request.'},400);}

  const eventType=String(input.event_type||'');
  const path=String(input.path||'').slice(0,240);
  const sessionId=String(input.session_id||'');
  const viewport=String(input.viewport||'');
  if(!eventTypes.has(eventType))return response(origin,{error:'Unknown event.'},400);
  if(!path.startsWith('/')||path.length>240)return response(origin,{error:'Invalid path.'},400);
  if(!uuid.test(sessionId))return response(origin,{error:'Invalid session.'},400);
  if(!['compact','medium','wide'].includes(viewport))return response(origin,{error:'Invalid viewport.'},400);

  const url=Deno.env.get('SUPABASE_URL'),serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!url||!serviceKey)return response(origin,{error:'Analytics unavailable.'},503);

  const payload={
    event_id:crypto.randomUUID(),
    event_type:eventType,
    path,
    surface:text(input.surface,80),
    referrer_host:text(input.referrer_host,160),
    session_id:sessionId,
    viewport,
    campaign_source:text(input.campaign_source,100),
    campaign_medium:text(input.campaign_medium,100),
    campaign_name:text(input.campaign_name,140),
  };

  const res=await fetch(url+'/rest/v1/site_analytics_events',{
    method:'POST',
    headers:{
      apikey:serviceKey,
      Authorization:'Bearer '+serviceKey,
      'Content-Type':'application/json',
      Prefer:'return=minimal',
    },
    body:JSON.stringify(payload),
  });
  if(!res.ok){
    console.error('site analytics insert failed',res.status);
    return response(origin,{error:'Analytics unavailable.'},503);
  }
  return response(origin,{ok:true},202);
});
