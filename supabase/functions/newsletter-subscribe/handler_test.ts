import assert from 'node:assert/strict';
import {handler} from './handler.ts';
const headers={apikey:'sb_publishable_lVueu3GqNcPe4Z9KsChvJw_VfmnVi5u',origin:'https://joaoccaldas.github.io'};
Deno.test('newsletter bounds bytes without trusting Content-Length or touching consent records',async()=>{
  for(const length of [null,'1']){
    const req=new Request('https://example.org',{method:'POST',headers:{...headers,...(length?{'content-length':length}:{})},body:JSON.stringify({ignored:'x'.repeat(2100)})});
    assert.equal((await handler(req)).status,400);
  }
});
Deno.test('newsletter denies non-browser origins and invalid JSON before service access',async()=>{
  assert.equal((await handler(new Request('https://example.org',{method:'POST',headers:{apikey:headers.apikey}}))).status,403);
  assert.equal((await handler(new Request('https://example.org',{method:'POST',headers,body:'[]'}))).status,400);
});

Deno.test('unsubscribe links require an opaque token and GET never touches the database',async()=>{
  const token='a'.repeat(64);
  const page=await handler(new Request('https://example.org?unsubscribe='+token));
  assert.equal(page.status,303);assert.equal(page.headers.get('location'),'https://joaoccaldas.github.io/konam/index.html?account=unsubscribe&token='+token);
  assert.equal(page.headers.get('Referrer-Policy'),'no-referrer');
  for(const invalid of ['short','<script>','A'.repeat(64)])assert.equal((await handler(new Request('https://example.org?unsubscribe='+encodeURIComponent(invalid)))).status,400);
});

Deno.test('unsubscribe POST updates only the token owner, preserves suppression and returns no email',async()=>{
  const token='a'.repeat(64);let updates=0;
  const admin={from:(table:string)=>{
    assert.equal(table,'newsletter_subscriptions');
    return {update:(values:any)=>{
      updates++;assert.equal(values.status,'unsubscribed');
      return {eq:(column:string,value:string)=>{
        assert.equal(column,'unsubscribe_token');assert.equal(value,token);
        return {neq:(key:string,value:string)=>{
          assert.equal(key,'status');assert.equal(value,'suppressed');
          return Promise.resolve({error:null});
        }};
      }};
    }};
  }};
  const deps={admin:admin as any,quota:async()=> 'allowed' as const};
  const req=()=>new Request('https://example.org',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:'unsubscribe='+token});
  for(let i=0;i<2;i++){const result=await handler(req(),deps);assert.equal(result.status,200);assert.deepEqual(await result.json(),{ok:true,status:'unsubscribed'});}
  assert.equal(updates,2);
  assert.equal((await handler(new Request('https://example.org',{method:'POST',body:JSON.stringify({unsubscribe:'bad'})}),deps)).status,400);assert.equal(updates,2);
});

Deno.test('unsubscribe forms are byte-bounded before any write',async()=>{
  assert.equal((await handler(new Request('https://example.org',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded','content-length':'1'},body:'unsubscribe='+ 'a'.repeat(2100)}))).status,400);
});

Deno.test('anonymous repeat signup cannot rewrite suppressed or unsubscribed consent',async()=>{
  for(const existing of ['suppressed','unsubscribed','active','pending']){
    let inserts=0,updates=0;
    const query={ select:()=>query,eq:()=>query,maybeSingle:async()=>({data:{status:existing},error:null}) };
    const admin={from:(_:string)=>({...query,insert:async()=>{inserts++;return {error:null}},update:()=>{updates++;return query}})};
    const request=new Request('https://example.org',{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({email:'fictional@example.test'})});
    const res=await handler(request,{admin:admin as any,quota:async()=> 'allowed' as const});
    assert.equal(res.status,202);
    assert.equal(inserts,0);
    assert.equal(updates,0);
  }
});

Deno.test('quota service failure rejects signup without a database operation',async()=>{
  let touched=false;
  const admin={from:()=>{touched=true;throw new Error('unexpected database call')}};
  for(const [quota,status] of [['limited',429],['unavailable',503]] as const){
    const req=new Request('https://example.org',{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({email:'fictional@example.test'})});
    const res=await handler(req,{admin:admin as any,quota:async()=>quota});
    assert.equal(res.status,status);
  }
  assert.equal(touched,false);
});

Deno.test('source code creates only a pending anonymous signup',async()=>{
  let inserted:any=null;
  const query={select:()=>query,eq:()=>query,maybeSingle:async()=>({data:null,error:null})};
  const admin={from:()=>({...query,insert:async(value:any)=>{inserted=value;return {error:null}}})};
  const req=new Request('https://example.org',{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({email:' Test@Example.Test '})});
  const res=await handler(req,{admin:admin as any,quota:async()=> 'allowed' as const});
  assert.equal(res.status,202);
  assert.equal(inserted?.status,'pending');
  assert.equal(inserted?.email,'test@example.test');
});
