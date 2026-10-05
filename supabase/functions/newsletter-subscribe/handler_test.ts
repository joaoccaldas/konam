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
  assert.equal(page.status,200);assert.match(await page.text(),/method="post"/);
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
  for(let i=0;i<2;i++){const result=await handler(req(),deps);assert.equal(result.status,200);assert.match(await result.text(),/You’re off the list/);}
  assert.equal(updates,2);
  assert.equal((await handler(new Request('https://example.org',{method:'POST',body:JSON.stringify({unsubscribe:'bad'})}),deps)).status,400);assert.equal(updates,2);
});

Deno.test('unsubscribe forms are byte-bounded before any write',async()=>{
  assert.equal((await handler(new Request('https://example.org',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded','content-length':'1'},body:'unsubscribe='+ 'a'.repeat(2100)}))).status,400);
});
