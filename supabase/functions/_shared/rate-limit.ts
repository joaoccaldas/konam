type Endpoint='companion'|'site-analytics'|'newsletter-subscribe';
type Options={url?:string,key?:string,fetcher?:typeof fetch,now?:number};
export async function rateLimit(req:Request,endpoint:Endpoint,options:Options={}):Promise<'allowed'|'limited'|'unavailable'>{
  const url=options.url??Deno.env.get('SUPABASE_URL'),key=options.key??Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!url||!key)return 'unavailable';
  const seconds=endpoint==='companion'?60:3600;
  const window=Math.floor((options.now??Date.now())/1000/seconds)*seconds;
  const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
  try{
    const encoder=new TextEncoder();
    const signingKey=await crypto.subtle.importKey('raw',encoder.encode(key),{name:'HMAC',hash:'SHA-256'},false,['sign']);
    const signature=await crypto.subtle.sign('HMAC',signingKey,encoder.encode(endpoint+'|'+window+'|'+ip));
    const hash=[...new Uint8Array(signature)].map(x=>x.toString(16).padStart(2,'0')).join('');
    const res=await (options.fetcher??fetch)(url+'/rest/v1/rpc/consume_edge_quota',{
      method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},
      body:JSON.stringify({p_endpoint:endpoint,p_key:hash,p_window:new Date(window*1000).toISOString()}),signal:AbortSignal.timeout(3000),
    });
    if(!res.ok)return 'unavailable';
    const allowed=await res.json();return allowed===true?'allowed':allowed===false?'limited':'unavailable';
  }catch{return 'unavailable';}
}
